"use client";

import { cn } from "@/lib/format";
import { useCountdown } from "@/lib/economicCalendar/hooks/useCountdown";
import type { EventStatus } from "@/types/economicCalendar";

interface CountdownProps {
  targetTime: string;
  status: EventStatus;
}

export function Countdown({ targetTime, status }: CountdownProps) {
  const { formattedTime, isReleased } = useCountdown(
    status === "Upcoming" ? targetTime : null
  );

  if (status === "Released" || (status === "Upcoming" && isReleased)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-profit">
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Released
      </span>
    );
  }

  if (status === "Live") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-loss">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-loss" />
        </span>
        LIVE
      </span>
    );
  }

  if (status === "Completed") {
    return <span className="text-xs text-text-muted">—</span>;
  }

  return (
    <span className="font-mono text-xs tabular-nums text-text-secondary">
      {formattedTime}
    </span>
  );
}
