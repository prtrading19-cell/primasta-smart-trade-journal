import { cn } from "@/lib/format";
import type { EventStatus } from "@/types/economicCalendar";

interface StatusBadgeProps {
  status: EventStatus;
}

const STYLES: Record<EventStatus, string> = {
  Upcoming: "bg-surface-elevated text-text-secondary",
  Live: "bg-loss/10 text-loss",
  Released: "bg-profit/10 text-profit",
  Completed: "bg-surface-panel text-text-muted",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        STYLES[status]
      )}
    >
      {status === "Live" && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-loss" />
        </span>
      )}
      {status === "Released" && (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {status === "Live" ? "LIVE" : status}
    </span>
  );
}
