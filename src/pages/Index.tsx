import { useEffect, useState } from "react";
import { ArbitrageCard } from "@/components/ArbitrageCard";
import { StatsCard } from "@/components/StatsCard";
import { Activity, TrendingUp, Zap } from "lucide-react";

interface ArbitrageData {
  symbol: string;
  name: string;
  spotPrice: number;
  futuresPrice: number;
  spread: number;
  volume24h: string;
}

const Index = () => {
  const [opportunities, setOpportunities] = useState<ArbitrageData[]>([
    {
      symbol: "BTC",
      name: "Bitcoin",
      spotPrice: 43250.00,
      futuresPrice: 43850.00,
      spread: 1.39,
      volume24h: "28.4B",
    },
    {
      symbol: "ETH",
      name: "Ethereum",
      spotPrice: 2280.50,
      futuresPrice: 2310.20,
      spread: 1.30,
      volume24h: "12.8B",
    },
    {
      symbol: "BNB",
      name: "Binance Coin",
      spotPrice: 315.80,
      futuresPrice: 318.50,
      spread: 0.85,
      volume24h: "1.9B",
    },
    {
      symbol: "SOL",
      name: "Solana",
      spotPrice: 98.45,
      futuresPrice: 99.80,
      spread: 1.37,
      volume24h: "2.1B",
    },
    {
      symbol: "XRP",
      name: "Ripple",
      spotPrice: 0.625,
      futuresPrice: 0.632,
      spread: 1.12,
      volume24h: "3.2B",
    },
    {
      symbol: "ADA",
      name: "Cardano",
      spotPrice: 0.485,
      futuresPrice: 0.488,
      spread: 0.62,
      volume24h: "450M",
    },
    {
      symbol: "AVAX",
      name: "Avalanche",
      spotPrice: 36.20,
      futuresPrice: 36.85,
      spread: 1.80,
      volume24h: "680M",
    },
    {
      symbol: "DOGE",
      name: "Dogecoin",
      spotPrice: 0.085,
      futuresPrice: 0.086,
      spread: 1.18,
      volume24h: "890M",
    },
    {
      symbol: "MATIC",
      name: "Polygon",
      spotPrice: 0.892,
      futuresPrice: 0.901,
      spread: 1.01,
      volume24h: "520M",
    },
    {
      symbol: "DOT",
      name: "Polkadot",
      spotPrice: 7.45,
      futuresPrice: 7.53,
      spread: 1.07,
      volume24h: "380M",
    },
    {
      symbol: "LINK",
      name: "Chainlink",
      spotPrice: 14.80,
      futuresPrice: 14.95,
      spread: 1.01,
      volume24h: "620M",
    },
    {
      symbol: "UNI",
      name: "Uniswap",
      spotPrice: 6.25,
      futuresPrice: 6.30,
      spread: 0.80,
      volume24h: "290M",
    },
    {
      symbol: "ATOM",
      name: "Cosmos",
      spotPrice: 10.15,
      futuresPrice: 10.28,
      spread: 1.28,
      volume24h: "340M",
    },
    {
      symbol: "LTC",
      name: "Litecoin",
      spotPrice: 72.30,
      futuresPrice: 73.10,
      spread: 1.11,
      volume24h: "580M",
    },
    {
      symbol: "TRX",
      name: "Tron",
      spotPrice: 0.105,
      futuresPrice: 0.106,
      spread: 0.95,
      volume24h: "420M",
    },
    {
      symbol: "APT",
      name: "Aptos",
      spotPrice: 8.92,
      futuresPrice: 9.05,
      spread: 1.46,
      volume24h: "310M",
    },
  ]);

  // Simular atualização em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setOpportunities((prev) =>
        prev.map((opp) => {
          const variation = (Math.random() - 0.5) * 2; // -1% a +1%
          const newSpotPrice = opp.spotPrice * (1 + variation / 100);
          const newFuturesPrice = opp.futuresPrice * (1 + variation / 100);
          const newSpread = ((newFuturesPrice - newSpotPrice) / newSpotPrice) * 100;
          
          return {
            ...opp,
            spotPrice: newSpotPrice,
            futuresPrice: newFuturesPrice,
            spread: newSpread,
          };
        })
      );
    }, 3000); // Atualiza a cada 3 segundos

    return () => clearInterval(interval);
  }, []);

  const activeOpportunities = opportunities.filter((opp) => opp.spread > 0.5).length;
  const avgSpread = (
    opportunities.reduce((sum, opp) => sum + opp.spread, 0) / opportunities.length
  ).toFixed(2);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">
                Arbitragem Cripto
              </h1>
              <p className="text-muted-foreground">
                Monitor de spreads Spot vs Futuros em tempo real
              </p>
            </div>
            <div className="flex items-center gap-2 text-success">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium">Ao Vivo</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Oportunidades Ativas"
            value={activeOpportunities.toString()}
            description="Spread > 0.5%"
            icon={TrendingUp}
          />
          <StatsCard
            title="Spread Médio"
            value={`${avgSpread}%`}
            description="Média geral"
            icon={Activity}
          />
          <StatsCard
            title="Pares Monitorados"
            value={opportunities.length.toString()}
            description="Atualização a cada 3s"
            icon={Zap}
          />
        </div>

        {/* Arbitrage Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {opportunities
            .sort((a, b) => b.spread - a.spread)
            .map((opp) => (
              <ArbitrageCard key={opp.symbol} {...opp} />
            ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
