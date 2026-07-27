import { Globe, AlertTriangle } from "lucide-react";
import { ResearchSection, MetricRow, EmptyState, SourceBadge } from "../shared";

interface MacroDriver {
  label: string;
  value: string;
  impact: string;
  reason: string;
  source: string;
}

interface MacroEnvironmentCardProps {
  drivers: MacroDriver[];
}

export function MacroEnvironmentCard({ drivers }: MacroEnvironmentCardProps) {
  const hasData = drivers.length > 0 && drivers.some((d) => d.value !== "N/A" && d.value !== "Live Data Unavailable");

  if (!hasData) {
    return (
      <ResearchSection title="Macro Environment" icon={<Globe size={16} />}>
        <EmptyState icon={<AlertTriangle size={24} />} title="Live Data Unavailable" description="Macro data not received from providers." />
      </ResearchSection>
    );
  }

  return (
    <ResearchSection title="Macro Environment" icon={<Globe size={16} />} badge={<SourceBadge source="Multi-source" />}>
      <div className="grid gap-3 md:grid-cols-2">
        {drivers.map((d) => {
          const impactLower = d.impact.toLowerCase();
          const tone = impactLower.includes("bullish") ? "profit" : impactLower.includes("bearish") ? "loss" : "neutral";
          return (
            <div key={d.label} className="rounded-lg border border-border-subtle bg-surface-panel p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">{d.label}</span>
                <span className={`text-[10px] font-medium ${tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-text-muted"}`}>
                  {d.impact}
                </span>
              </div>
              <MetricRow label="Observation" value={d.value} tone={tone} />
              {d.reason && <p className="mt-1 text-[10px] text-text-muted">{d.reason}</p>}
              <div className="mt-1">
                <SourceBadge source={d.source} />
              </div>
            </div>
          );
        })}
      </div>
    </ResearchSection>
  );
}
