import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

export interface HistoryItem {
  id: string;
  timestamp: string;
  symbol: string;
  name: string;
  spread: number;
  spotPrice: number;
  futuresPrice: number;
  exchange: string;
}

interface HistoryPanelProps {
  items: HistoryItem[];
  icon: LucideIcon;
}

export const HistoryPanel = ({ items, icon: Icon }: HistoryPanelProps) => {
  const sorted = [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <Card className="p-4 bg-gradient-to-br from-slate-800/40 to-slate-900/40 border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-white/10">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <p className="text-sm text-white/70 font-medium">Histórico de Oportunidades (Hoje)</p>
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-white/50">Sem registros hoje.</p>
      ) : (
        <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
          {sorted.map((item) => {
            const positive = item.spread >= 0;
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{item.symbol} • {item.name}</p>
                  <p className="text-xs text-white/50">
                    {new Date(item.timestamp).toLocaleTimeString('pt-BR')} • Spot: ${item.spotPrice.toLocaleString('pt-BR', { minimumFractionDigits: item.spotPrice < 1 ? 4 : 2 })} • Fut: ${item.futuresPrice.toLocaleString('pt-BR', { minimumFractionDigits: item.futuresPrice < 1 ? 4 : 2 })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`${positive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>{positive ? '+' : ''}{item.spread.toFixed(2)}%</Badge>
                  <Badge className="bg-white/10 text-white/70">{item.exchange}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};


