import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, TrendingUp, TrendingDown, DollarSign, Clock, Zap } from "lucide-react";
import { useMemo } from "react";

interface InterExchangeCardProps {
  symbol: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  buyExchange: string;
  sellExchange: string;
  buyVolume: string;
  sellVolume: string;
  buySpotUrl?: string;
  sellSpotUrl?: string;
}

export const InterExchangeCard = ({
  symbol,
  name,
  buyPrice,
  sellPrice,
  spread,
  buyExchange,
  sellExchange,
  buyVolume,
  sellVolume,
  buySpotUrl,
  sellSpotUrl,
}: InterExchangeCardProps) => {
  const getSpreadStatus = () => {
    if (Math.abs(spread) < 0.5) return { label: "BAIXA", color: "bg-yellow-500/20 text-yellow-500" };
    if (Math.abs(spread) < 1.5) return { label: "MÉDIA", color: "bg-blue-500/20 text-blue-500" };
    return { label: "ALTA", color: "bg-emerald-500/20 text-emerald-500" };
  };

  const status = getSpreadStatus();
  const cardBgClass = "bg-slate-900/50 border-white/10";
  const accentBorderClass = spread >= 0
    ? "border-l-4 border-l-emerald-500/60"
    : "border-l-4 border-l-amber-500/60";

  const ProfitCalculation = ({ spread }: { spread: number }) => {
    const withdrawalFee = parseFloat(localStorage.getItem("settings_withdrawal_fee") || "0.15");
    const depositFee = parseFloat(localStorage.getItem("settings_deposit_fee") || "0.0");
    const tradingFee = parseFloat(localStorage.getItem("settings_fee_per_leg") || "0.10");
    
    const totalCosts = withdrawalFee + depositFee + (tradingFee * 2); // compra e venda
    const netProfit = Math.abs(spread) - totalCosts;
    const isViable = netProfit > 0.2; // Mínimo 0.2% de lucro líquido

    return (
      <div className="flex flex-wrap gap-1.5 items-center mt-2">
        <Badge className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-600">
          <DollarSign className="inline-block h-3 w-3 mr-1" />
          Custos: {totalCosts.toFixed(2)}%
        </Badge>
        {netProfit > 0 ? (
          <Badge className={`text-xs px-2 py-0.5 ${isViable ? 'bg-emerald-500/20 text-emerald-600' : 'bg-orange-500/20 text-orange-600'}`}>
            💰 Lucro líq.: {netProfit.toFixed(2)}%
          </Badge>
        ) : (
          <Badge className="text-xs px-2 py-0.5 bg-red-500/20 text-red-600">
            ⚠️ Não viável: -{Math.abs(netProfit).toFixed(2)}%
          </Badge>
        )}
        <Badge className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-600">
          <Clock className="inline-block h-3 w-3 mr-1" />
          ~10-30min
        </Badge>
      </div>
    );
  };

  const formatPrice = (v: number) => isFinite(v) ? `US$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: v < 1 ? 4 : 2 })}` : '-';

  return (
    <Card className={`p-4 ${cardBgClass} ${accentBorderClass} hover:shadow-lg transition-all duration-300`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-background p-3 rounded-lg shadow-sm">
            <h3 className="text-2xl font-bold text-foreground">{symbol}</h3>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs px-2 py-0.5 flex items-center gap-1">
                <ArrowRightLeft className="h-3 w-3" />
                Inter-Exchange
              </Badge>
              <Badge className={`text-xs px-2 py-0.5 ${status.color}`}>
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{name}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 justify-end ${spread > 0 ? 'text-success' : 'text-destructive'}`}>
            {spread > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span className="text-2xl font-bold">
              {spread > 0 ? '+' : ''}{spread.toFixed(2)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Spread Inter-Exchange
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Zap className="h-3 w-3 text-emerald-500" />
            <p className="text-xs text-muted-foreground">Comprar em</p>
          </div>
          {buySpotUrl ? (
            <a 
              href={buySpotUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              {buyExchange} ↗
            </a>
          ) : (
            <p className="text-sm font-semibold text-emerald-400">{buyExchange}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatPrice(buyPrice)}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <DollarSign className="h-3 w-3 text-blue-500" />
            <p className="text-xs text-muted-foreground">Vender em</p>
          </div>
          {sellSpotUrl ? (
            <a 
              href={sellSpotUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm font-semibold text-blue-400 hover:text-blue-300 underline cursor-pointer"
            >
              {sellExchange} ↗
            </a>
          ) : (
            <p className="text-sm font-semibold text-blue-400">{sellExchange}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatPrice(sellPrice)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Liquidez 24h</p>
          <p className="text-xs text-foreground">
            {buyExchange}: {buyVolume}
          </p>
          <p className="text-xs text-foreground">
            {sellExchange}: {sellVolume}
          </p>
        </div>
      </div>

      <ProfitCalculation spread={spread} />

      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>💡 Estratégia:</span>
          <span className="text-foreground">
            1) Comprar {symbol} na {buyExchange} → 2) Transferir para {sellExchange} → 3) Vender
          </span>
        </div>
      </div>
    </Card>
  );
};