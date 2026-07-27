import { Crown, AlertTriangle } from "lucide-react";
import { ResearchSection, EmptyState, SourceBadge } from "../shared";
import type { US100MegaCapStock } from "@/types/us100";

interface MegaCapLeadershipCardProps {
  stocks: US100MegaCapStock[];
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function formatMarketCap(v: number): string {
  if (v >= 1_000_000_000_000) return `$${(v / 1_000_000_000_000).toFixed(1)}T`;
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(0)}B`;
  return `$${(v / 1_000_000).toFixed(0)}M`;
}

export function MegaCapLeadershipCard({ stocks }: MegaCapLeadershipCardProps) {
  const hasData = stocks.length > 0 && stocks.some((s) => s.meta.status === "live");

  if (!hasData) {
    return (
      <ResearchSection title="Mega Cap Leadership" icon={<Crown size={16} />}>
        <EmptyState icon={<AlertTriangle size={24} />} title="Live Data Unavailable" description="No stock quote data received." />
      </ResearchSection>
    );
  }

  const sorted = [...stocks].sort((a, b) => {
    const aLive = a.meta.status === "live" ? 1 : 0;
    const bLive = b.meta.status === "live" ? 1 : 0;
    if (aLive !== bLive) return bLive - aLive;
    return Math.abs(b.changePercent) - Math.abs(a.changePercent);
  });

  return (
    <ResearchSection title="Mega Cap Leadership" icon={<Crown size={16} />} badge={<SourceBadge source="Twelve Data" />}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th className="pb-2 pr-3 font-medium">Symbol</th>
              <th className="pb-2 pr-3 text-right font-medium">Price</th>
              <th className="pb-2 pr-3 text-right font-medium">Daily %</th>
              <th className="hidden pb-2 pr-3 text-right font-medium sm:table-cell">Volume</th>
              <th className="hidden pb-2 text-right font-medium md:table-cell">Mkt Cap</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const live = s.meta.status === "live";
              const tone = live ? (s.changePercent >= 0 ? "text-profit" : "text-loss") : "text-text-muted";
              return (
                <tr key={s.symbol} className="border-b border-border-subtle/50">
                  <td className="py-2 pr-3">
                    <span className="font-semibold text-text-primary">{s.symbol}</span>
                    <span className="ml-1 hidden text-text-muted lg:inline">{s.name}</span>
                  </td>
                  <td className="py-2 pr-3 text-right font-medium text-text-primary">{live ? `$${s.price.toFixed(2)}` : "--"}</td>
                  <td className={`py-2 pr-3 text-right font-medium ${tone}`}>
                    {live ? `${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%` : "--"}
                  </td>
                  <td className="hidden py-2 pr-3 text-right text-text-secondary sm:table-cell">
                    {live ? formatVolume(s.volume) : "--"}
                  </td>
                  <td className="hidden py-2 text-right text-text-secondary md:table-cell">
                    {live && s.marketCap > 0 ? formatMarketCap(s.marketCap) : "--"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ResearchSection>
  );
}
