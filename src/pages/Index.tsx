import { useEffect, useState } from "react";
import { ArbitrageCard } from "@/components/ArbitrageCard";
import { StatsCard } from "@/components/StatsCard";
import { SettingsDialog } from "@/components/SettingsDialog";
import { Activity, TrendingUp, Zap, Target, RefreshCw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface ArbitrageData {
  symbol: string;
  name: string;
  spotPrice: number;
  futuresPrice: number;
  spread: number;
  volume24h: string;
  exchange: string;
}

const Index = () => {
  const [opportunities, setOpportunities] = useState<ArbitrageData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");

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
      setOpportunities(result.data);
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
    fetchBinanceData();
    
    // Atualizar a cada 10 segundos
    const interval = setInterval(fetchBinanceData, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeOpportunities = opportunities.filter((opp) => Math.abs(opp.spread) > 0.8).length;
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            description="Spread > 0.8%"
            icon={Target}
          />
          <StatsCard
            title="Spread Médio"
            value={`${avgSpread}%`}
            description="Média geral"
            icon={Activity}
          />
        </div>

        {/* Arbitrage Cards */}
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
      </main>
    </div>
  );
};

export default Index;
