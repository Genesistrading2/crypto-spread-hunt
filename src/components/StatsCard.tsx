import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

export const StatsCard = ({ title, value, description, icon: Icon }: StatsCardProps) => {
  const getCardColor = () => {
    if (title === "Total Ativos") return "from-emerald-500/20 to-teal-500/20 border-emerald-500/30";
    if (title === "Spread Máx") return "from-purple-500/20 to-pink-500/20 border-purple-500/30";
    if (title === "Oportunidades") return "from-orange-500/20 to-red-500/20 border-orange-500/30";
    return "from-blue-500/20 to-cyan-500/20 border-blue-500/30";
  };

  return (
    <Card className={`p-5 bg-gradient-to-br ${getCardColor()} backdrop-blur-sm`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-white/10">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <p className="text-sm text-white/70 font-medium">{title}</p>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-white/60">{description}</p>
    </Card>
  );
};
