import { BarChart3, AlertTriangle } from "lucide-react";
import { ResearchSection, MetricRow, EmptyState, SourceBadge } from "../shared";
import type { US100MarketBreadth } from "@/types/us100";

interface MarketBreadthCardProps {
  breadth: US100MarketBreadth;
}

export function MarketBreadthCard({ breadth }: MarketBreadthCardProps) {
  const live = breadth.meta.status === "live";

  if (!live) {
    return (
      <ResearchSection title="Market Breadth" icon={<BarChart3 size={16} />}>
        <EmptyState icon={<AlertTriangle size={24} />} title="Live Data Unavailable" description="Breadth data not yet available from providers." />
      </ResearchSection>
    );
  }

  const healthColor = breadth.overallHealth === "Healthy" ? "text-profit" : breadth.overallHealth === "Mixed" ? "text-gold" : breadth.overallHealth === "Weak" ? "text-gold" : "text-loss";

  return (
    <ResearchSection title="Market Breadth" icon={<BarChart3 size={16} />} badge={<SourceBadge source={breadth.meta.source} />}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <MetricRow label="Advance / Decline" value={breadth.advanceDecline} />
        <MetricRow label="New Highs" value={String(breadth.newHighs)} tone="profit" />
        <MetricRow label="New Lows" value={String(breadth.newLows)} tone="loss" />
        <MetricRow label="Breadth Score" value={`${breadth.breadthScore}%`} tone="gold" />
      </div>
      <div className="mt-3 rounded-lg border border-border-subtle bg-surface-panel p-3">
        <span className="text-xs text-text-muted">Overall Health: </span>
        <span className={`text-xs font-medium ${healthColor}`}>{breadth.overallHealth}</span>
      </div>
    </ResearchSection>
  );
}
