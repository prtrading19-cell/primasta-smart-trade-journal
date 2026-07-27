import { BarChart3, AlertTriangle } from "lucide-react";
import { ResearchSection, MetricRow, EmptyState, SourceBadge } from "../shared";

interface MarketBreadthCardProps {
  advanceDecline?: string;
  newHighs?: string;
  newLows?: string;
  breadthScore?: string;
  overallHealth?: string;
  source?: string;
  available?: boolean;
}

export function MarketBreadthCard({
  advanceDecline = "N/A",
  newHighs = "N/A",
  newLows = "N/A",
  breadthScore = "N/A",
  overallHealth = "N/A",
  source = "composite",
  available = false,
}: MarketBreadthCardProps) {
  if (!available) {
    return (
      <ResearchSection title="Market Breadth" icon={<BarChart3 size={16} />}>
        <EmptyState icon={<AlertTriangle size={24} />} title="Live Data Unavailable" description="Breadth data not yet available from providers." />
      </ResearchSection>
    );
  }

  return (
    <ResearchSection title="Market Breadth" icon={<BarChart3 size={16} />} badge={<SourceBadge source={source} />}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <MetricRow label="Advance / Decline" value={advanceDecline} />
        <MetricRow label="New Highs" value={newHighs} tone="profit" />
        <MetricRow label="New Lows" value={newLows} tone="loss" />
        <MetricRow label="Breadth Score" value={breadthScore} tone="gold" />
      </div>
      <div className="mt-3 rounded-lg border border-border-subtle bg-surface-panel p-3">
        <span className="text-xs text-text-muted">Overall Health: </span>
        <span className="text-xs font-medium text-text-primary">{overallHealth}</span>
      </div>
    </ResearchSection>
  );
}
