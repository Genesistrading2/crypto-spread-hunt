import { useEffect, useMemo, useRef, useState } from "react";
import { ArbitrageCard } from "@/components/ArbitrageCard";
import { InterExchangeCard } from "@/components/InterExchangeCard";
import { StatsCard } from "@/components/StatsCard";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Activity, TrendingUp, Zap, Target, RefreshCw, Wifi, Percent, History, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { HistoryPanel } from "@/components/HistoryPanel";

interface ArbitrageData {
  symbol: string;
  name: string;
  spotPrice: number;
  futuresPrice: number;
  spread: number;
  fundingRate?: number;
  volume24h: string;
  exchange: string;
  lastUpdateTs?: number;
  spotUrl?: string;
  futuresUrl?: string;
}

interface InterExchangeData {
  symbol: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  buyExchange: string;
  sellExchange: string;
  buyVolume: string;
  sellVolume: string;
  type: string;
  buySpotUrl?: string;
  sellSpotUrl?: string;
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
  const [interExchangeOpps, setInterExchangeOpps] = useState<InterExchangeData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [history, setHistory] = useState<OpportunityHistoryItem[]>([]);
  const [lastAlertTime, setLastAlertTime] = useState<{ [key: string]: number }>({});

  const HISTORY_KEY = "arbitrage_history_v1";
  const feePerLeg = parseFloat(localStorage.getItem("settings_fee_per_leg") || "0.10");
  const slipPerLeg = parseFloat(localStorage.getItem("settings_slip_per_leg") || "0.05");
  const outlierPct = parseFloat(localStorage.getItem("settings_outlier_pct") || "8");
  const profitMethod = (localStorage.getItem("settings_profit_method") || "max") as "max" | "median" | "p95" | "average";
  const oppThreshold = parseFloat(localStorage.getItem("settings_threshold") || "0.5");
  const uiThrottleMs = parseInt(localStorage.getItem("settings_ui_throttle_ms") || "800");
  const minHoldMs = parseInt(localStorage.getItem("settings_min_hold_ms") || "3000");

  // Sistema de alertas
  const playAlertSound = () => {
    const enableSound = localStorage.getItem("settings_enable_sound") === "true";
    if (!enableSound) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  };
  
  const checkAndAlert = (opportunity: ArbitrageData) => {
    const enableAlerts = localStorage.getItem("settings_enable_alerts") === "true";
    if (!enableAlerts) return;
    
    const alertThreshold = parseFloat(localStorage.getItem("settings_alert_threshold") || "1.0");
    const now = Date.now();
    const key = `${opportunity.symbol}_${opportunity.exchange}`;
    const lastAlert = lastAlertTime[key] || 0;
    
    // Only alert once per minute per opportunity
    if (Math.abs(opportunity.spread) >= alertThreshold && now - lastAlert > 60000) {
      playAlertSound();
      toast.success(`🚨 ${opportunity.symbol} (${opportunity.exchange}) - Spread de ${opportunity.spread > 0 ? '+' : ''}${opportunity.spread.toFixed(2)}%`, {
        duration: 5000,
      });
      setLastAlertTime(prev => ({ ...prev, [key]: now }));
    }
  };

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
      const nowTs = Date.now();
      const withTs: ArbitrageData[] = (result.data as ArbitrageData[]).map((o) => ({ ...o, lastUpdateTs: nowTs }));
      const interExchange: InterExchangeData[] = result.interExchange || [];
      
      console.log(`📊 Total de oportunidades recebidas: ${withTs.length}`);
      console.log(`📊 Oportunidades com |spread| > ${oppThreshold}%:`, withTs.filter(o => Math.abs(o.spread) > oppThreshold).map(o => `${o.symbol}(${o.exchange}): ${o.spread.toFixed(2)}%`));
      console.log(`🔄 Inter-exchange: ${interExchange.length} pares`);
      
      // Check for alerts
      withTs.forEach(opp => {
        if (Math.abs(opp.spread) > oppThreshold) {
          checkAndAlert(opp);
        }
      });
      
      setOpportunities(withTs);
      setInterExchangeOpps(interExchange);
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
      toast.error("Erro ao conectar com as exchanges");
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setHistory(loadHistoryForToday());
    fetchBinanceData();
    
    // Atualizar a cada 50 segundos
    const interval = setInterval(fetchBinanceData, 50000);
    return () => clearInterval(interval);
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
  const interExchangeThreshold = parseFloat(localStorage.getItem("settings_inter_exchange_threshold") || "0.5");
  const activeInterExchange = interExchangeOpps.filter((opp) => Math.abs(opp.spread) > interExchangeThreshold).length;
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
                  Oportunidades de Arbitragem Entre Exchanges
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
        <Alert className="mb-6 bg-success/10 border-success/30 text-success">
          <Activity className="h-4 w-4" />
          <AlertDescription className="text-sm">
            ✅ <strong>Dados Reais em Tempo Real (Atualização a cada 50s)</strong>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">🔵 Bybit</Badge>
              <Badge variant="secondary" className="text-xs">🟠 OKX</Badge>
              <Badge variant="secondary" className="text-xs">🔴 MEXC</Badge>
              <Badge variant="secondary" className="text-xs">🟣 Gate.io</Badge>
              <Badge variant="secondary" className="text-xs">🟢 Bitget</Badge>
              <Badge variant="secondary" className="text-xs">🟡 KuCoin</Badge>
            </div>
            <p className="mt-2">
              Oportunidades acima de {opportunityThreshold}% são destacadas. Considere taxas de funding, slippage e custos de transação antes de operar.
            </p>
          </AlertDescription>
        </Alert>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
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
            title="Inter-Exchange"
            value={activeInterExchange.toString()}
            description={`Viáveis entre exchanges`}
            icon={ArrowRightLeft}
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

        {/* Inter-Exchange Arbitrage Section */}
        {interExchangeOpps.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-white">
                Arbitragem Inter-Exchange (Múltiplas Exchanges)
              </h2>
              <Badge className="bg-primary/20 text-primary">
                {interExchangeOpps.filter(o => Math.abs(o.spread) > interExchangeThreshold).length} oportunidades
              </Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {interExchangeOpps
                .filter(opp => Math.abs(opp.spread) > interExchangeThreshold)
                .sort((a, b) => Math.abs(b.spread) - Math.abs(a.spread))
                .slice(0, 6)
                .map((opp) => (
                  <InterExchangeCard 
                    key={`inter-${opp.symbol}`}
                    {...opp}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Arbitrage Cards + History Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {opportunities.length === 0 && interExchangeOpps.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60">Carregando dados das exchanges...</p>
              </div>
            ) : opportunities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60">Nenhuma oportunidade spot-futuros disponível no momento.</p>
                <p className="text-white/40 text-sm mt-2">Veja as oportunidades inter-exchange acima.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {opportunities
                  .sort((a, b) => Math.abs(b.spread) - Math.abs(a.spread))
                  .map((opp) => (
                    <ArbitrageCard 
                      key={`${opp.symbol}-${opp.exchange}`}
                      symbol={opp.symbol}
                      name={opp.name}
                  spotPrice={opp.spotPrice}
                  futuresPrice={opp.futuresPrice}
                  spread={opp.spread}
                  fundingRate={opp.fundingRate}
                  volume24h={opp.volume24h}
                  exchange={opp.exchange}
                  lastUpdateTs={opp.lastUpdateTs}
                  spotUrl={opp.spotUrl}
                  futuresUrl={opp.futuresUrl}
                />
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
