import { Zap, AlertTriangle } from "lucide-react";
import { ResearchSection, MetricRow, EmptyState, SourceBadge } from "../shared";
import type { US100Volatility } from "@/types/us100";

interface VolatilityCardProps {
  volatility: US100Volatility;
}

function getRiskColor(r: string): string {
  if (r === "Extreme") return "text-loss";
  if (r === "High") return "text-loss";
  if (r === "Moderate") return "text-gold";
  return "text-profit";
}

export function VolatilityCard({ volatility }: VolatilityCardProps) {
  const live = volatility.meta.status === "live";

  if (!live) {
    return (
      <ResearchSection title="Volatility" icon={<Zap size={16} />}>
        <EmptyState icon={<AlertTriangle size={24} />} title="Live Data Unavailable" description="Volatility data not received." />
      </ResearchSection>
    );
  }

  const riskColor = getRiskColor(volatility.riskRating);

  return (
    <ResearchSection title="Volatility" icon={<Zap size={16} />} badge={<SourceBadge source={volatility.meta.source} />}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <MetricRow
          label="VIX"
          value={volatility.vix !== null ? volatility.vix.toFixed(2) : "N/A"}
          detail={volatility.vixChange !== null ? `${volatility.vixChange >= 0 ? "+" : ""}${volatility.vixChange.toFixed(2)}` : undefined}
          tone={volatility.vix !== null && volatility.vix > 20 ? "loss" : "neutral"}
        />
        <MetricRow
          label="VXN"
          value={volatility.vxn !== null ? volatility.vxn.toFixed(2) : "N/A"}
          detail={volatility.vxnChange !== null ? `${volatility.vxnChange >= 0 ? "+" : ""}${volatility.vxnChange.toFixed(2)}` : undefined}
          tone={volatility.vxn !== null && volatility.vxn > 25 ? "loss" : "neutral"}
        />
        <MetricRow label="Trend" value={volatility.trend} tone={volatility.trend === "Elevated" ? "loss" : "neutral"} />
        <MetricRow label="Risk Rating" value={volatility.riskRating} tone={riskColor.includes("loss") ? "loss" : riskColor.includes("gold") ? "gold" : "neutral"} />
      </div>
    </ResearchSection>
  );
}
