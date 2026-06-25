import { cn } from "@/lib/format";
import type { TradeResult, TradeStatus } from "@/types/trade";

export function StatusBadge({ status, result }: { status: TradeStatus; result?: TradeResult }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "Open" && "bg-warning/15 text-amber-700 dark:text-amber-300",
        status === "Closed" && result === "Win" && "bg-profit/15 text-green-700 dark:text-green-300",
        status === "Closed" && result === "Loss" && "bg-loss/15 text-red-700 dark:text-red-300",
        status === "Closed" && result === "Break-even" && "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
      )}
    >
      {status === "Open" ? "Open" : result ?? "Closed"}
    </span>
  );
}
