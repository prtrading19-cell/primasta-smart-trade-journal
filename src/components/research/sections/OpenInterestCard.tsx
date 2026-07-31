import { BarChart3, AlertTriangle } from "lucide-react";
import { ResearchSection, MetricRow, EmptyState, SourceBadge } from "../shared";
import type { OpenInterestRecord } from "@/types/institutional";

interface OpenInterestCardProps {
  records?: OpenInterestRecord[];
  title?: string;
}

export function OpenInterestCard({ records, title = "Open Interest" }: OpenInterestCardProps) {
  const live = records && records.length > 0 && records.some((r) => r.meta.status === "live");

  if (!live) {
    return (
      <ResearchSection title={title} icon={<BarChart3 size={16} />}>
        <EmptyState icon={<AlertTriangle size={24} />} title="Live Data Unavailable" description="Open Interest data not received from providers." />
      </ResearchSection>
    );
  }

  const liveRecords = records!.filter((r) => r.meta.status === "live");

  return (
    <ResearchSection title={title} icon={<BarChart3 size={16} />} badge={<SourceBadge source={liveRecords[0]?.meta.source ?? "N/A"} />}>
      <div className="space-y-2">
        {liveRecords.map((r) => {
          const trendTone = r.trend === "Rising" ? "profit" : r.trend === "Falling" ? "loss" : "neutral";
          return (
            <div key={r.contractName} className="rounded-lg border border-border-subtle bg-surface-panel p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">{r.contractName}</span>
                <span className={`text-xs font-medium ${trendTone === "profit" ? "text-profit" : trendTone === "loss" ? "text-loss" : "text-text-muted"}`}>
                  {r.trend}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                <MetricRow label="Current" value={String(r.currentLevel)} />
                <MetricRow label="Change" value={`${r.changeFromPrevious >= 0 ? "+" : ""}${r.changeFromPrevious}`} tone={r.changeFromPrevious >= 0 ? "profit" : "loss"} />
              </div>
            </div>
          );
        })}
      </div>
    </ResearchSection>
  );
}
