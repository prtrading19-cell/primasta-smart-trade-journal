"use client";

import { cn } from "@/lib/format";
import { Countdown } from "@/components/economicCalendar/Countdown";
import type { CalendarStats as CalendarStatsType } from "@/types/economicCalendar";

interface CalendarStatsProps {
  stats: CalendarStatsType;
}

export function CalendarStats({ stats }: CalendarStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {/* Upcoming High Impact */}
      <div className="rounded-xl border border-border-subtle bg-surface-card p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-loss/10">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-loss" />
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-text-secondary truncate">Upcoming High Impact</p>
          <p className="text-xl font-bold text-text-primary tabular-nums">{stats.highImpactCount}</p>
          <p className="text-[10px] text-text-muted">events pending</p>
        </div>
      </div>

      {/* Next Event */}
      <div className="rounded-xl border border-border-subtle bg-surface-card p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/10">
          <span className="text-gold text-lg">⏱</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-text-secondary truncate">Next Event</p>
          <p className="text-sm font-bold text-text-primary truncate">
            {stats.nextEventName || "—"}
          </p>
          {stats.nextEventCountdown ? (
            <span className="text-xs tabular-nums text-gold">
              {stats.nextEventCountdown}
            </span>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          )}
        </div>
      </div>

      {/* USD Events Today */}
      <div className="rounded-xl border border-border-subtle bg-surface-card p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-panel text-sm leading-none">
          🇺🇸
        </div>
        <div className="min-w-0">
          <p className="text-xs text-text-secondary truncate">USD Events Today</p>
          <p className="text-xl font-bold text-text-primary tabular-nums">{stats.usdEventsToday}</p>
          <p className="text-[10px] text-text-muted">US Dollar</p>
        </div>
      </div>

      {/* Live Event */}
      <div className="rounded-xl border border-border-subtle bg-surface-card p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-loss/10">
          {stats.liveCount > 0 ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-loss" />
            </span>
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-text-muted/40" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-text-secondary truncate">Live Event</p>
          <p className="text-xl font-bold text-text-primary tabular-nums">{stats.liveCount}</p>
          <p className="text-[10px] text-text-muted">in progress</p>
        </div>
      </div>

      {/* Market Status */}
      <div className="rounded-xl border border-border-subtle bg-surface-card p-4 flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            stats.marketStatus === "Active" && "bg-profit/10",
            stats.marketStatus === "Pre-Market" && "bg-amber-400/10",
            stats.marketStatus !== "Active" && stats.marketStatus !== "Pre-Market" && "bg-surface-panel"
          )}
        >
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              stats.marketStatus === "Active" && "bg-profit",
              stats.marketStatus === "Pre-Market" && "bg-amber-400",
              stats.marketStatus !== "Active" && stats.marketStatus !== "Pre-Market" && "bg-text-muted/40"
            )}
          />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-text-secondary truncate">Market Status</p>
          <p
            className={cn(
              "text-lg font-bold",
              stats.marketStatus === "Active" && "text-profit",
              stats.marketStatus === "Pre-Market" && "text-amber-400",
              stats.marketStatus !== "Active" && stats.marketStatus !== "Pre-Market" && "text-text-muted"
            )}
          >
            {stats.marketStatus}
          </p>
        </div>
      </div>
    </div>
  );
}
