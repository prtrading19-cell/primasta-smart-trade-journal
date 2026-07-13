import { cn } from "@/lib/format";
import type { TradeResult, TradeStatus } from "@/types/trade";

export function StatusBadge({ status, result }: { status: TradeStatus; result?: TradeResult }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "Open" && "bg-warning/15 text-warning",
        status === "Closed" && result === "Win" && "bg-profit/15 text-profit",
        status === "Closed" && result === "Loss" && "bg-loss/15 text-loss",
        status === "Closed" && result === "Break-even" && "bg-surface-panel text-text-secondary"
      )}
    >
      {status === "Open" ? "Open" : result ?? "Closed"}
    </span>
  );
}
