import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ArbitrageCardProps {
  symbol: string;
  name: string;
  spotPrice: number;
  futuresPrice: number;
  spread: number;
  volume24h: string;
  exchange: string;
}

export const ArbitrageCard = ({
  symbol,
  name,
  spotPrice,
  futuresPrice,
  spread,
  volume24h,
  exchange,
}: ArbitrageCardProps) => {
  const getSpreadStatus = () => {
    if (Math.abs(spread) < 0.3) return { label: "BAIXA", color: "bg-yellow-500/20 text-yellow-500" };
    if (Math.abs(spread) < 0.8) return { label: "Normal", color: "bg-emerald-500/20 text-emerald-500" };
    return { label: "ALTA", color: "bg-destructive/20 text-destructive" };
  };

  const getFuturesType = () => {
    return spread > 0 
      ? { label: "Long Futuros", color: "bg-success/20 text-success" }
      : { label: "Short Futuros", color: "bg-warning/20 text-warning" };
  };

  const status = getSpreadStatus();
  const futuresType = getFuturesType();
  
  return (
    <Card className="p-4 bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200/50 dark:border-amber-800/30 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-background p-3 rounded-lg shadow-sm">
            <h3 className="text-2xl font-bold text-foreground">{symbol}</h3>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {exchange}
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
          <p className="text-xs text-muted-foreground mt-1">Spread de Arbitragem</p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <div className="h-2 w-2 rounded-full bg-success" />
            <p className="text-xs text-muted-foreground">Spot</p>
          </div>
          <p className="text-sm font-semibold text-foreground">
            US$ {spotPrice.toLocaleString('pt-BR', { minimumFractionDigits: spotPrice < 1 ? 4 : 2 })}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <p className="text-xs text-muted-foreground">Futuros</p>
          </div>
          <p className="text-sm font-semibold text-foreground">
            US$ {futuresPrice.toLocaleString('pt-BR', { minimumFractionDigits: futuresPrice < 1 ? 4 : 2 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Vol. 24h</p>
          <p className="text-sm font-semibold text-foreground">${volume24h}</p>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-border/50">
        <Badge className={`text-xs px-2 py-1 ${futuresType.color}`}>
          📊 {futuresType.label}
        </Badge>
      </div>
    </Card>
  );
};
