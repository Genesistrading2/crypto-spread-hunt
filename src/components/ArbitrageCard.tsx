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
}

export const ArbitrageCard = ({
  symbol,
  name,
  spotPrice,
  futuresPrice,
  spread,
  volume24h,
}: ArbitrageCardProps) => {
  const isOpportunity = spread > 0.5;
  const spreadColor = spread > 1 ? "text-success" : spread > 0.5 ? "text-warning" : "text-neutral";
  
  return (
    <Card className="p-6 bg-gradient-card border-border hover:border-accent/50 transition-all duration-300 hover:shadow-glow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-foreground">{symbol}</h3>
            {isOpportunity && (
              <Badge variant="default" className="bg-success text-success-foreground">
                Oportunidade
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{name}</p>
        </div>
        <div className={`text-right ${spreadColor}`}>
          <div className="flex items-center gap-1 justify-end">
            {spread > 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )}
            <span className={`text-3xl font-bold ${isOpportunity ? 'animate-pulse-glow' : ''}`}>
              {spread.toFixed(2)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Spread Spot/Futuros</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Preço Spot</p>
          <p className="text-lg font-semibold text-foreground">
            ${spotPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Preço Futuros</p>
          <p className="text-lg font-semibold text-foreground">
            ${futuresPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">Volume 24h</p>
          <p className="text-sm font-medium text-foreground">${volume24h}</p>
        </div>
      </div>
    </Card>
  );
};
