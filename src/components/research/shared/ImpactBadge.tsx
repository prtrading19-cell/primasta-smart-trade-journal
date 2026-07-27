interface ImpactBadgeProps {
  impact: string;
}

function getImpactColor(impact: string): string {
  const lower = impact.toLowerCase();
  if (lower.includes("bullish")) return "bg-profit/15 text-profit border-profit/30";
  if (lower.includes("bearish")) return "bg-loss/15 text-loss border-loss/30";
  if (lower.includes("mixed") || lower.includes("wait")) return "bg-gold/15 text-gold border-gold/30";
  return "bg-surface-panel text-text-muted border-border-subtle";
}

export function ImpactBadge({ impact }: ImpactBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getImpactColor(impact)}`}>
      {impact}
    </span>
  );
}
