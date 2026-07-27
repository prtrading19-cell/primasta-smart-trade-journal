import { Activity, AlertTriangle } from "lucide-react";
import { ResearchSection, MetricRow, EmptyState, SourceBadge, TimestampBadge } from "../shared";
import type { US100Index } from "@/types/us100";

interface MarketOverviewCardProps {
  index: US100Index;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

export function MarketOverviewCard({ index }: MarketOverviewCardProps) {
  const live = index.meta.status === "live";

  if (!live) {
    return (
      <ResearchSection title="Market Overview" icon={<Activity size={16} />}>
        <EmptyState icon={<AlertTriangle size={24} />} title="Live Data Unavailable" description={index.meta.error || "Provider unavailable"} />
      </ResearchSection>
    );
  }

  const dailyTone = index.changePercent >= 0 ? "profit" : "loss";

  return (
    <ResearchSection
      title="Market Overview"
      icon={<Activity size={16} />}
      badge={<SourceBadge source={index.meta.source} />}
    >
      <div className="mb-4">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-text-primary">{index.price.toFixed(2)}</span>
          <span className={`text-sm font-medium ${dailyTone === "profit" ? "text-profit" : "text-loss"}`}>
            {index.change >= 0 ? "+" : ""}{index.change.toFixed(2)} ({index.changePercent >= 0 ? "+" : ""}{index.changePercent.toFixed(2)}%)
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-text-muted">{index.symbol}</span>
          <TimestampBadge timestamp={index.timestamp} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 md:grid-cols-3">
        <MetricRow label="Open" value={index.open.toFixed(2)} />
        <MetricRow label="High" value={index.high.toFixed(2)} tone="profit" />
        <MetricRow label="Low" value={index.low.toFixed(2)} tone="loss" />
        <MetricRow label="Prev Close" value={index.previousClose.toFixed(2)} />
        <MetricRow label="Volume" value={formatVolume(index.volume)} />
        <MetricRow label="Daily Range" value={`${index.low.toFixed(0)}–${index.high.toFixed(0)}`} tone="gold" />
      </div>
    </ResearchSection>
  );
}
