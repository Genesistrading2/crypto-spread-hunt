import { useEffect, useMemo, useRef, useState } from "react";
import { ArbitrageCard } from "@/components/ArbitrageCard";
import { StatsCard } from "@/components/StatsCard";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Activity, TrendingUp, Zap, Target, RefreshCw, Wifi, Percent, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { HistoryPanel } from "@/components/HistoryPanel";

interface ArbitrageData {
  symbol: string;
  name: string;
  spotPrice: number;
  futuresPrice: number;
  spread: number;
  volume24h: string;
  exchange: string;
  lastUpdateTs?: number;
}

interface OpportunityHistoryItem {
  id: string;
  timestamp: string; // ISO
  symbol: string;
  name: string;
  spread: number;
  spotPrice: number;
  futuresPrice: number;
  exchange: string;
}

const Index = () => {
  const [opportunities, setOpportunities] = useState<ArbitrageData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [history, setHistory] = useState<OpportunityHistoryItem[]>([]);

  const HISTORY_KEY = "arbitrage_history_v1";
  const feePerLeg = parseFloat(localStorage.getItem("settings_fee_per_leg") || "0.10");
  const slipPerLeg = parseFloat(localStorage.getItem("settings_slip_per_leg") || "0.05");
  const outlierPct = parseFloat(localStorage.getItem("settings_outlier_pct") || "8");
  const profitMethod = (localStorage.getItem("settings_profit_method") || "max") as "max" | "median" | "p95" | "average";
  const oppThreshold = parseFloat(localStorage.getItem("settings_threshold") || "0.5");
  const uiThrottleMs = parseInt(localStorage.getItem("settings_ui_throttle_ms") || "800");
  const minHoldMs = parseInt(localStorage.getItem("settings_min_hold_ms") || "3000");

  const loadHistoryForToday = () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [] as OpportunityHistoryItem[];
      const parsed: OpportunityHistoryItem[] = JSON.parse(raw);
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      return parsed.filter((item) => new Date(item.timestamp).getTime() >= startOfDay);
    } catch {
      return [] as OpportunityHistoryItem[];
    }
  };

  const persistHistory = (items: OpportunityHistoryItem[]) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    } catch {
      // ignore quota errors
    }
  };

  const mergeHistory = (
    current: OpportunityHistoryItem[],
    additions: OpportunityHistoryItem[]
  ) => {
    const bySymbol = new Map<string, OpportunityHistoryItem>();
    // seed with current items, one por símbolo (mantém o mais recente)
    for (const item of current) {
      const existing = bySymbol.get(item.symbol);
      if (!existing || new Date(item.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
        bySymbol.set(item.symbol, item);
      }
    }
    // apply additions: substitui somente se o novo tiver spread absoluto maior ou timestamp mais recente com spread diferente
    for (const add of additions) {
      const existing = bySymbol.get(add.symbol);
      if (!existing) {
        bySymbol.set(add.symbol, add);
        continue;
      }
      const sameRounded = Math.abs(existing.spread).toFixed(2) === Math.abs(add.spread).toFixed(2);
      if (sameRounded) {
        // mesma oportunidade (mesmo spread arredondado) → não duplica; apenas atualiza timestamp para o mais recente
        if (new Date(add.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
          bySymbol.set(add.symbol, { ...existing, timestamp: add.timestamp });
        }
      } else {
        // mantém o de maior magnitude
        if (Math.abs(add.spread) > Math.abs(existing.spread)) {
          bySymbol.set(add.symbol, add);
        }
      }
    }
    return Array.from(bySymbol.values());
  };

  const fetchBinanceData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/binance-arbitrage`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar dados');
      }

      const result = await response.json();
      // mantemos Spot/Futuros/Volume do REST como base e iniciamos lastUpdateTs
      const nowTs = Date.now();
      const withTs: ArbitrageData[] = (result.data as ArbitrageData[]).map((o) => ({ ...o, lastUpdateTs: nowTs }));
      setOpportunities(withTs);
      // registrar oportunidades acima de 0.8% no histórico
      const nowIso = new Date().toISOString();
      const newItems: OpportunityHistoryItem[] = (result.data as ArbitrageData[])
        .filter((o) => Math.abs(o.spread) > oppThreshold && Math.abs(o.spread) <= outlierPct)
        .map((o) => ({
          id: `${nowIso}-${o.symbol}`,
          timestamp: nowIso,
          symbol: o.symbol,
          name: o.name,
          spread: o.spread,
          spotPrice: o.spotPrice,
          futuresPrice: o.futuresPrice,
          exchange: o.exchange,
        }));

      if (newItems.length > 0) {
        const current = loadHistoryForToday();
        const merged = mergeHistory(current, newItems);
        setHistory(merged);
        persistHistory(merged);
      }
      setIsConnected(true);
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
      toast.success("Dados atualizados com sucesso!");
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error("Erro ao conectar com a Binance API");
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setHistory(loadHistoryForToday());
    fetchBinanceData();
    
    // Atualizar a cada 10 segundos
    const interval = setInterval(fetchBinanceData, 10000);
    return () => clearInterval(interval);
  }, []);

  // ---- WebSocket em tempo real (Binance Futures markPrice) ----
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const symbolsList = [
    'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','AVAXUSDT','DOGEUSDT','MATICUSDT','DOTUSDT','LINKUSDT','UNIUSDT','ATOMUSDT','LTCUSDT','TRXUSDT','APTUSDT'
  ];

  const openWsConnection = () => {
    const streams = symbolsList.map(s => `${s.toLowerCase()}@markPrice`).join('/');
    const url = `wss://fstream.binance.com/stream?streams=${streams}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
    };

    ws.onclose = () => {
      setIsConnected(false);
      // reconectar com backoff exponencial simples
      const attempt = Math.min(5, reconnectAttemptsRef.current + 1);
      reconnectAttemptsRef.current = attempt;
      const delay = Math.pow(2, attempt) * 1000;
      setTimeout(() => {
        openWsConnection();
      }, delay);
    };

    ws.onerror = () => {
      try { ws.close(); } catch {}
    };

    let lastUiUpdate = 0;
    ws.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        const data = payload?.data || payload; // combinado/único
        // Estrutura esperada: { s: 'BTCUSDT', p: 'markPrice', i: 'indexPrice' }
        const symbol = data?.s as string | undefined;
        const mark = parseFloat(data?.p);
        const index = parseFloat(data?.i);
        if (!symbol || !isFinite(mark) || !isFinite(index) || index <= 0) return;

        const spread = ((mark - index) / index) * 100;
        if (Math.abs(spread) > outlierPct) return; // ignora outlier

        const now = Date.now();
        if (now - lastUiUpdate < uiThrottleMs) return; // throttle UI updates
        lastUiUpdate = now;

        setOpportunities(prev => {
          // se já existir no estado, atualiza preços e spread; senão cria estrutura básica
          const exists = prev.find(o => (o.symbol === symbol.replace('USDT','')) || (o.symbol === symbol));
          const baseName = exists?.name || symbol.replace('USDT','');
          const baseVolume = exists?.volume24h || "-";
          const prettySymbol = symbol.replace('USDT','');
          const updated: ArbitrageData = {
            symbol: prettySymbol,
            name: baseName,
            // Atualiza apenas preços; se REST ainda não carregou, usa os atuais do WS
            spotPrice: isFinite(index) ? index : (exists?.spotPrice ?? index),
            futuresPrice: isFinite(mark) ? mark : (exists?.futuresPrice ?? mark),
            spread,
            volume24h: baseVolume,
            exchange: 'Binance',
            lastUpdateTs: now,
          };
          // manter item por pelo menos minHoldMs após aparecer acima do limiar
          const appearedKey = `hold_${prettySymbol}`;
          if (Math.abs(spread) > oppThreshold && !localStorage.getItem(appearedKey)) {
            localStorage.setItem(appearedKey, String(now));
          }

          const next = prev.filter(o => {
            if (o.symbol === prettySymbol) return false; // vamos substituir
            const holdKey = `hold_${o.symbol}`;
            const ts = parseInt(localStorage.getItem(holdKey) || "0");
            if (ts === 0) return true;
            // se o item caiu abaixo do limiar mas ainda está no período de hold, mantemos
            const stillHolding = now - ts < minHoldMs;
            const stillAbove = Math.abs(o.spread) > oppThreshold;
            if (!stillAbove && stillHolding) return true;
            if (!stillAbove && !stillHolding) {
              localStorage.removeItem(holdKey);
            }
            return stillAbove || stillHolding;
          });
          next.push(updated);
          return next;
        });

        // registrar no histórico se passar o limiar
        if (Math.abs(spread) > oppThreshold) {
          const nowIso = new Date().toISOString();
          const item: OpportunityHistoryItem = {
            id: `${nowIso}-${symbol}`,
            timestamp: nowIso,
            symbol: symbol.replace('USDT',''),
            name: symbol.replace('USDT',''),
            spread,
            spotPrice: index,
            futuresPrice: mark,
            exchange: 'Binance',
          };
          const current = loadHistoryForToday();
          const merged = mergeHistory(current, [item]);
          setHistory(merged);
          persistHistory(merged);
        }
      } catch {
        // silencia erros de parsing
      }
    };
  };

  useEffect(() => {
    openWsConnection();
    return () => {
      try { wsRef.current?.close(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dailyProfitPercent = useMemo(() => {
    if (history.length === 0) return 0;
    // agrupar por símbolo
    const bySymbol = new Map<string, number[]>();
    for (const h of history) {
      if (Math.abs(h.spread) > outlierPct) continue;
      const arr = bySymbol.get(h.symbol) || [];
      arr.push(Math.abs(h.spread));
      bySymbol.set(h.symbol, arr);
    }

    const totalCost = feePerLeg + feePerLeg + slipPerLeg + slipPerLeg; // ida e volta

    const perSymbolProfit: number[] = [];
    for (const [, arr] of bySymbol) {
      if (arr.length === 0) continue;
      let base = 0;
      const sorted = arr.slice().sort((a, b) => a - b);
      switch (profitMethod) {
        case "median":
          base = sorted[Math.floor(sorted.length / 2)];
          break;
        case "p95":
          base = sorted[Math.floor(sorted.length * 0.95)];
          break;
        case "average":
          base = sorted.reduce((a, b) => a + b, 0) / sorted.length;
          break;
        default:
          base = sorted[sorted.length - 1]; // máximo
      }
      const net = Math.max(0, base - totalCost);
      perSymbolProfit.push(net);
    }

    if (perSymbolProfit.length === 0) return 0;
    const avg = perSymbolProfit.reduce((a, b) => a + b, 0) / perSymbolProfit.length;
    return avg;
  }, [history, feePerLeg, slipPerLeg, outlierPct, profitMethod]);

  const opportunityThreshold = oppThreshold || 0.5;
  const activeOpportunities = opportunities.filter((opp) => Math.abs(opp.spread) > opportunityThreshold).length;
  const maxSpread = opportunities.length > 0 
    ? Math.max(...opportunities.map(opp => Math.abs(opp.spread))).toFixed(2)
    : "0.00";
  const avgSpread = opportunities.length > 0
    ? (opportunities.reduce((sum, opp) => sum + Math.abs(opp.spread), 0) / opportunities.length).toFixed(3)
    : "0.000";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-0.5">
                  Monitor de Arbitragem Cripto
                </h1>
                <p className="text-sm text-white/60">
                  Oportunidades Spot × Futuros em Tempo Real
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-success/20 rounded-lg border border-success/30">
                <Wifi className="h-4 w-4 text-success" />
                <div className="text-left">
                  <p className="text-xs text-success font-medium">
                    {isConnected ? "Conectado" : "Desconectado"}
                  </p>
                  {lastUpdate && (
                    <p className="text-xs text-success/70">{lastUpdate}</p>
                  )}
                </div>
              </div>
              <Button
                onClick={fetchBinanceData}
                disabled={isLoading}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <SettingsDialog />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Alert */}
        <Alert className="mb-6 bg-warning/10 border-warning/30 text-warning">
          <Activity className="h-4 w-4" />
          <AlertDescription className="text-sm">
            💡 <strong>Dados em Tempo Real Simulados</strong> - Spreads baseados em padrões reais de mercado. 
            Oportunidades acima de 0.8% merecem atenção. Considere taxas de funding, slippage e custos de transação.
          </AlertDescription>
        </Alert>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <StatsCard
            title="Total Ativos"
            value={opportunities.length.toString()}
            description="Pares monitorados"
            icon={Zap}
          />
          <StatsCard
            title="Spread Máx"
            value={`${maxSpread}%`}
            description="Maior spread detectado"
            icon={TrendingUp}
          />
          <StatsCard
            title="Oportunidades"
            value={activeOpportunities.toString()}
            description={`Spread > ${opportunityThreshold.toFixed(2)}%`}
            icon={Target}
          />
          <StatsCard
            title="Spread Médio"
            value={`${avgSpread}%`}
            description="Média geral"
            icon={Activity}
          />
          <StatsCard
            title="Lucro Teórico (Hoje)"
            value={`${dailyProfitPercent.toFixed(2)}%`}
            description="Média spreads positivos"
            icon={Percent}
          />
        </div>

        {/* Arbitrage Cards + History Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {opportunities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60">Carregando dados da Binance...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {opportunities
                  .sort((a, b) => Math.abs(b.spread) - Math.abs(a.spread))
                  .map((opp) => (
                    <ArbitrageCard key={opp.symbol} {...opp} />
                  ))}
              </div>
            )}
          </div>
          <div>
            <HistoryPanel items={history} icon={History} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
