import { TrendingUp, AlertTriangle } from "lucide-react";
import { ResearchSection, MetricRow, EmptyState, SourceBadge } from "../shared";
import type { ETFData } from "@/types/institutional";

interface EtfFlowsCardProps {
  etf?: ETFData;
  title?: string;
}

const flowColor = (direction: string) => {
  if (direction === "Inflow") return "text-profit";
  if (direction === "Outflow") return "text-loss";
  return "text-text-muted";
};

export function EtfFlowsCard({ etf, title = "ETF Flows" }: EtfFlowsCardProps) {
  const live = etf?.meta.status === "live" && etf.etfs.length > 0;

  if (!live) {
    return (
      <ResearchSection title={title} icon={<TrendingUp size={16} />}>
        <EmptyState icon={<AlertTriangle size={24} />} title="Live Data Unavailable" description="ETF flow data not received from providers." />
      </ResearchSection>
    );
  }

  const inflowCount = etf!.etfs.filter((e) => e.flowDirection === "Inflow").length;
  const outflowCount = etf!.etfs.filter((e) => e.flowDirection === "Outflow").length;

  return (
    <ResearchSection title={title} icon={<TrendingUp size={16} />} badge={<SourceBadge source={etf!.meta.source} />}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <MetricRow label="Inflows" value={String(inflowCount)} tone="profit" />
        <MetricRow label="Outflows" value={String(outflowCount)} tone="loss" />
      </div>
      <div className="mt-3 space-y-2">
        {etf!.etfs.map((h) => (
          <div key={h.symbol} className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-panel px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary">{h.symbol}</span>
              <span className="text-[10px] text-text-muted">{h.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${flowColor(h.flowDirection)}`}>{h.flowDirection}</span>
              <span className="text-[10px] text-text-muted">${(h.totalAssets / 1e9).toFixed(2)}B</span>
            </div>
          </div>
        ))}
      </div>
    </ResearchSection>
  );
}
