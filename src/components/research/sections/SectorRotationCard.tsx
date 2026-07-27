import { Repeat, AlertTriangle } from "lucide-react";
import { ResearchSection, EmptyState, SourceBadge } from "../shared";
import type { US100SectorPerformance } from "@/types/us100";

interface SectorRotationCardProps {
  sectors: US100SectorPerformance;
}

interface SectorEntry {
  name: string;
  change: number;
}

export function SectorRotationCard({ sectors }: SectorRotationCardProps) {
  const live = sectors.meta.status === "live";

  if (!live) {
    return (
      <ResearchSection title="Sector Rotation" icon={<Repeat size={16} />}>
        <EmptyState icon={<AlertTriangle size={24} />} title="Live Data Unavailable" description="Sector data not received." />
      </ResearchSection>
    );
  }

  const entries: SectorEntry[] = [
    { name: "Technology", change: sectors.technology },
    { name: "Semiconductors", change: sectors.semiconductors },
    { name: "Financials", change: sectors.financials },
    { name: "Healthcare", change: sectors.healthcare },
    { name: "Energy", change: sectors.energy },
    { name: "Industrials", change: sectors.industrials },
    { name: "Consumer", change: sectors.consumer },
    { name: "Utilities", change: sectors.utilities },
    { name: "Communication", change: sectors.communication },
  ];

  const sorted = [...entries].sort((a, b) => b.change - a.change);
  const maxAbs = Math.max(...sorted.map((e) => Math.abs(e.change)), 1);

  return (
    <ResearchSection title="Sector Rotation" icon={<Repeat size={16} />} badge={<SourceBadge source={sectors.meta.source} />}>
      <div className="space-y-2">
        {sorted.map((s) => {
          const tone = s.change >= 0 ? "text-profit" : "text-loss";
          const barWidth = Math.min((Math.abs(s.change) / maxAbs) * 100, 100);
          return (
            <div key={s.name} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-text-secondary">{s.name}</span>
              <div className="relative h-4 flex-1 overflow-hidden rounded bg-surface-panel">
                <div
                  className={`absolute inset-y-0 ${s.change >= 0 ? "left-1/2 bg-profit/30" : "right-1/2 bg-loss/30"}`}
                  style={{ width: `${barWidth / 2}%` }}
                />
              </div>
              <span className={`w-16 shrink-0 text-right text-xs font-medium ${tone}`}>
                {s.change >= 0 ? "+" : ""}{s.change.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </ResearchSection>
  );
}
