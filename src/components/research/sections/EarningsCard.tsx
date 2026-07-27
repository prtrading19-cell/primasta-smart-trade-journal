import { FileText, AlertTriangle } from "lucide-react";
import { ResearchSection, EmptyState, SourceBadge } from "../shared";
import type { US100Earnings } from "@/types/us100";

interface EarningsCardProps {
  earnings: US100Earnings[];
}

function getImportanceColor(i: string): string {
  if (i === "High") return "bg-loss/15 text-loss border-loss/30";
  if (i === "Medium") return "bg-gold/15 text-gold border-gold/30";
  return "bg-surface-panel text-text-muted border-border-subtle";
}

export function EarningsCard({ earnings }: EarningsCardProps) {
  const liveEarnings = earnings.filter((e) => e.meta.status === "live" && e.earningsDate);

  if (liveEarnings.length === 0) {
    return (
      <ResearchSection title="Corporate Earnings" icon={<FileText size={16} />}>
        <EmptyState icon={<AlertTriangle size={24} />} title="Earnings Data Unavailable" description="FMP earnings provider is currently unavailable due to quota/rate limiting. Please retry later." />
      </ResearchSection>
    );
  }

  return (
    <ResearchSection title="Corporate Earnings" icon={<FileText size={16} />} badge={<SourceBadge source={earnings[0]?.meta.source ?? "FMP"} />}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th className="pb-2 pr-3 font-medium">Symbol</th>
              <th className="pb-2 pr-3 font-medium">Date</th>
              <th className="pb-2 pr-3 text-right font-medium">Est EPS</th>
              <th className="pb-2 pr-3 text-right font-medium">Prev EPS</th>
              <th className="pb-2 font-medium">Impact</th>
            </tr>
          </thead>
          <tbody>
            {liveEarnings.slice(0, 8).map((e) => (
              <tr key={`${e.symbol}-${e.earningsDate}`} className="border-b border-border-subtle/50">
                <td className="py-2 pr-3 font-semibold text-text-primary">{e.symbol}</td>
                <td className="py-2 pr-3 text-text-secondary">{e.earningsDate}</td>
                <td className="py-2 pr-3 text-right text-text-primary">{e.estimateEPS !== null ? `$${e.estimateEPS.toFixed(2)}` : "--"}</td>
                <td className="py-2 pr-3 text-right text-text-secondary">{e.previousEPS !== null ? `$${e.previousEPS.toFixed(2)}` : "--"}</td>
                <td className="py-2">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getImportanceColor(e.importance)}`}>
                    {e.importance}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResearchSection>
  );
}
