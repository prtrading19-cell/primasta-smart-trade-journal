"use client"

import type { CalendarSource } from "@/types/economicCalendar";

const PROVIDER_LABELS: Record<CalendarSource, string> = {
  fmp: "Financial Modeling Prep",
  forexfactory: "Forex Factory",
  tradingeconomics: "Trading Economics",
  unavailable: "Unavailable",
};

interface CalendarHeaderProps {
  source?: CalendarSource;
}

export default function CalendarHeader({ source }: CalendarHeaderProps) {
  const now = new Date()
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  const providerLabel = source ? PROVIDER_LABELS[source] ?? source : "Economic Calendar";
  const isLive = source && source !== "unavailable";

  return (
    <div className="mb-6 pt-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">
        PRIMASTA RESEARCH ENGINE
      </p>
      <h1 className="text-2xl font-bold text-text-primary mt-1">
        Institutional Economic Calendar
      </h1>
      <p className="text-sm text-text-secondary mt-1">
        Monitor live macroeconomic events that influence Gold, USD, Treasury Yields and global markets.
      </p>
      <div className="flex items-center gap-3 mt-3">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[11px] font-medium text-green-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            LIVE DATA
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[11px] font-medium text-red-400">
            UNAVAILABLE
          </span>
        )}
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-panel border border-border-subtle text-[11px] font-medium text-text-secondary">
          {providerLabel}
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-panel border border-border-subtle text-[11px] font-medium text-text-secondary">
          {dateStr} &middot; {timeStr}
        </span>
      </div>
    </div>
  )
}
