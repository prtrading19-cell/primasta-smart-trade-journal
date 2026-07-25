import { cn } from "@/lib/format";
import type { EconomicImpact } from "@/types/economicCalendar";

interface ImpactBadgeProps {
  impact: EconomicImpact;
  size?: "sm" | "md";
}

const STYLES: Record<EconomicImpact, string> = {
  High: "bg-loss/10 text-loss border-loss/30",
  Medium: "bg-amber-300/10 text-amber-400 border-amber-300/30",
  Low: "bg-profit/10 text-profit border-profit/30",
};

const DOT_STYLES: Record<EconomicImpact, string> = {
  High: "bg-loss",
  Medium: "bg-amber-400",
  Low: "bg-profit",
};

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-[10px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
};

export function ImpactBadge({ impact, size = "md" }: ImpactBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        STYLES[impact],
        SIZE_CLASSES[size]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_STYLES[impact])} />
      {impact}
    </span>
  );
}
