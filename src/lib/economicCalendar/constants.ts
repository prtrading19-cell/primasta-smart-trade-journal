import type { EconomicImpact, EventStatus } from "@/types/economicCalendar";

export const API_TIMEOUT = 8000;
export const REFRESH_INTERVAL = 60000;

export const IMPACT_COLORS: Record<EconomicImpact, { bg: string; text: string; border: string; dot: string }> = {
  High: { bg: "bg-loss/10", text: "text-loss", border: "border-loss/30", dot: "bg-loss" },
  Medium: { bg: "bg-amber-400/10", text: "text-amber-400", border: "border-amber-400/30", dot: "bg-amber-400" },
  Low: { bg: "bg-profit/10", text: "text-profit", border: "border-profit/30", dot: "bg-profit" },
};

export const STATUS_CONFIG: Record<
  EventStatus,
  { color: string; icon: string; bg: string; text: string; label: string }
> = {
  Upcoming: {
    color: "blue",
    icon: "⏳",
    bg: "bg-surface-elevated",
    text: "text-text-secondary",
    label: "Upcoming",
  },
  Live: {
    color: "red",
    icon: "🔴",
    bg: "bg-loss/10",
    text: "text-loss",
    label: "LIVE",
  },
  Released: {
    color: "green",
    icon: "✔",
    bg: "bg-profit/10",
    text: "text-profit",
    label: "Released",
  },
  Completed: {
    color: "gray",
    icon: "✓",
    bg: "bg-surface-panel",
    text: "text-text-muted",
    label: "Completed",
  },
};

export const TIMEFRAMES = [
  { id: "today" as const, label: "Today" },
  { id: "tomorrow" as const, label: "Tomorrow" },
  { id: "thisWeek" as const, label: "This Week" },
  { id: "all" as const, label: "All" },
];
