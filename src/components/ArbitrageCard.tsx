import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, CheckCircle2, PlayCircle, Pin, PinOff, Clock } from "lucide-react";
import { useMemo } from "react";

interface ArbitrageCardProps {
  symbol: string;
  name: string;
  spotPrice: number;
  futuresPrice: number;
  spread: number;
  fundingRate?: number;
  volume24h: string;
  exchange: string;
  lastUpdateTs?: number;
}

export const ArbitrageCard = ({
  symbol,
  name,
  spotPrice,
  futuresPrice,
  spread,
  fundingRate,
  volume24h,
  exchange,
  lastUpdateTs,
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

  // cores do card conforme sinal do spread (inspirado no print):
  // fundo mais escuro para melhor contraste; borda lateral indica direção
  const cardBgClass = "bg-slate-900/50 border-white/10";
  const accentBorderClass = spread >= 0
    ? "border-l-4 border-l-emerald-500/60"
    : "border-l-4 border-l-amber-500/60";

  const OperationTargets = ({ spread, fundingRate }: { spread: number; fundingRate?: number }) => {
    const feePerLeg = parseFloat(localStorage.getItem("settings_fee_per_leg") || "0.10");
    const slipPerLeg = parseFloat(localStorage.getItem("settings_slip_per_leg") || "0.05");
    const targetSpread = parseFloat(localStorage.getItem("settings_target_spread") || "0.20");
    const oppThreshold = parseFloat(localStorage.getItem("settings_threshold") || "0.5");

    const totalCosts = useMemo(() => feePerLeg + feePerLeg + slipPerLeg + slipPerLeg, [feePerLeg, slipPerLeg]);
    // Funding rate é cobrado a cada 8 horas (3x ao dia), então para 1 dia completo: funding * 3
    const dailyFundingCost = fundingRate ? Math.abs(fundingRate) * 3 : 0;
    const minToEnter = useMemo(() => oppThreshold + totalCosts, [oppThreshold, totalCosts]);
    const targetToClose = useMemo(() => Math.max(targetSpread, 0), [targetSpread]);
    
    // Lucro líquido estimado = spread - custos totais - funding diário
    const netProfit = Math.abs(spread) - totalCosts - dailyFundingCost;

    const canEnter = Math.abs(spread) >= minToEnter;
    const reachedTarget = Math.abs(spread) <= targetToClose;

    return (
      <div className="flex flex-wrap gap-1.5 items-center">
        <Badge className={`text-xs px-2 py-0.5 ${canEnter ? 'bg-emerald-500/20 text-emerald-600' : 'bg-white/10 text-white/60'}`}>
          <PlayCircle className="inline-block h-3.5 w-3.5 mr-1" /> Limiar: {minToEnter.toFixed(2)}%
        </Badge>
        <Badge className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-600">
          <CheckCircle2 className="inline-block h-3.5 w-3.5 mr-1" /> Alvo: {targetToClose.toFixed(2)}%
        </Badge>
        {fundingRate !== undefined && fundingRate !== 0 && (
          <Badge className={`text-xs px-2 py-0.5 ${fundingRate > 0 ? 'bg-red-500/20 text-red-600' : 'bg-green-500/20 text-green-600'}`}>
            Funding: {fundingRate > 0 ? '+' : ''}{fundingRate.toFixed(4)}%
          </Badge>
        )}
        {netProfit > 0 && (
          <Badge className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-600">
            💰 Lucro líq.: ~{netProfit.toFixed(2)}%
          </Badge>
        )}
        {canEnter && !reachedTarget && (
          <Badge className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-600">
            Entrar agora
          </Badge>
        )}
        {reachedTarget && (
          <Badge className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-600">
            Atingiu alvo
          </Badge>
        )}
      </div>
    );
  };

  const formatPrice = (v: number) => isFinite(v) ? `US$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: v < 1 ? 4 : 2 })}` : '-';
  const formatVolume = (v: string) => v && v.length > 0 ? v : '-';

  const targetSpread = parseFloat(localStorage.getItem("settings_target_spread") || "0.20");
  const desiredSpread = Math.max(targetSpread, 0);
  const targetFuturesPrice = useMemo(() => {
    const s = spotPrice;
    if (!isFinite(s)) return undefined;
    const sign = spread >= 0 ? 1 : -1;
    const basis = desiredSpread / 100 * sign; // aplica sinal do lado atual
    return s * (1 + basis);
  }, [spotPrice, spread, desiredSpread]);

  // Pin de cards
  const pinKey = `pin_${symbol}`;
  const isPinned = Boolean(localStorage.getItem(pinKey));
  const togglePin = () => {
    if (isPinned) localStorage.removeItem(pinKey); else localStorage.setItem(pinKey, "1");
    // força um pequeno repaint
    window.dispatchEvent(new Event('storage'));
  };
  
  return (
    <Card className={`p-4 ${cardBgClass} ${accentBorderClass} hover:shadow-lg transition-all duration-300`}>
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
            <div className="mt-2">
              <OperationTargets spread={spread} fundingRate={fundingRate} />
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
          <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-2">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {lastUpdateTs ? `${Math.max(0, Math.floor((Date.now() - lastUpdateTs)/1000))}s` : '-'}
            </span>
            <span>Spread de Arbitragem</span>
            <button aria-label={isPinned ? 'Desafixar' : 'Fixar'} onClick={togglePin} className="text-white/60 hover:text-white">
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </button>
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <div className="h-2 w-2 rounded-full bg-success" />
            <p className="text-xs text-muted-foreground">Spot</p>
          </div>
          <p className="text-sm md:text-base font-semibold text-foreground">{formatPrice(spotPrice)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <p className="text-xs text-muted-foreground">Futuros</p>
          </div>
          <p className="text-sm md:text-base font-semibold text-foreground">{formatPrice(futuresPrice)}</p>
          {isFinite(spotPrice) && isFinite(futuresPrice) && targetFuturesPrice !== undefined && (
            <p className="text-[11px] text-muted-foreground">Alvo preço fut.: {formatPrice(targetFuturesPrice)}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Vol. 24h</p>
          <p className="text-sm md:text-base font-semibold text-foreground">{formatVolume(volume24h)}</p>
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
