import type {
  EconomicEvent,
  EconomicImpact,
  CalendarFilterState,
} from "@/types/economicCalendar";
import { CURRENCY_MAP } from "@/types/economicCalendar";

export function formatEventTime(time: string, date?: string): string {
  const dateStr = date ? date + "T" + time : time;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return time || "--:--";
  return parsed.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

export function parseCountdown(targetTime: string): number {
  const target = new Date(targetTime).getTime();
  const now = Date.now();
  const diff = Math.floor((target - now) / 1000);
  return diff > 0 ? diff : 0;
}

export function filterEvents(
  events: EconomicEvent[],
  filter: CalendarFilterState
): EconomicEvent[] {
  let result = [...events];

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  if (filter.dateRange === "today") {
    result = result.filter((e) => e.date === todayStr);
  } else if (filter.dateRange === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    result = result.filter((e) => e.date === tomorrowStr);
  } else if (filter.dateRange === "thisWeek") {
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    result = result.filter((e) => {
      const eventDate = new Date(e.date);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    });
  }

  if (filter.impacts.length > 0) {
    result = result.filter((e) => filter.impacts.includes(e.importance));
  }

  if (filter.currencies.length > 0) {
    result = result.filter((e) => filter.currencies.includes(e.currency));
  }

  if (filter.searchQuery.trim()) {
    const q = filter.searchQuery.toLowerCase();
    result = result.filter(
      (e) =>
        e.event.toLowerCase().includes(q) ||
        e.country.toLowerCase().includes(q) ||
        e.currency.toLowerCase().includes(q)
    );
  }

  return result;
}

export function getNextEvent(events: EconomicEvent[]): EconomicEvent | null {
  const now = Date.now();
  const upcoming = events
    .filter((e) => {
      if (!e.date || !e.time) return false;
      const eventTime = new Date(e.date + "T" + e.time).getTime();
      return eventTime > now;
    })
    .sort(
      (a, b) =>
        new Date(a.date + "T" + a.time).getTime() -
        new Date(b.date + "T" + b.time).getTime()
    );
  return upcoming[0] ?? null;
}

export function getStatusForEvent(event: EconomicEvent): EconomicEvent["status"] {
  return event.status;
}

export function getImpactColor(impact: EconomicImpact): string {
  const map: Record<EconomicImpact, string> = {
    High: "text-loss",
    Medium: "text-amber-400",
    Low: "text-profit",
  };
  return map[impact];
}

export function getImpactDotColor(impact: EconomicImpact): string {
  const map: Record<EconomicImpact, string> = {
    High: "bg-loss",
    Medium: "bg-amber-400",
    Low: "bg-profit",
  };
  return map[impact];
}

export function isEventLive(event: EconomicEvent): boolean {
  return false;
}

export function getMarketStatus(): { status: string; label: string } {
  const now = new Date();
  const utcHour = now.getUTCHours();

  if (utcHour >= 22 || utcHour < 7) {
    return { status: "sydney", label: "Sydney Session" };
  }
  if (utcHour >= 0 && utcHour < 9) {
    return { status: "tokyo", label: "Tokyo Session" };
  }
  if (utcHour >= 7 && utcHour < 13) {
    return { status: "london", label: "London Session" };
  }
  if (utcHour >= 13 && utcHour < 16) {
    return { status: "overlap", label: "London/NY Overlap" };
  }
  if (utcHour >= 13 && utcHour < 22) {
    return { status: "newyork", label: "New York Session" };
  }

  return { status: "closed", label: "Market Closed" };
}

export function getCountryFlag(currency: string): string {
  return CURRENCY_MAP[currency]?.flag ?? "\u{1F310}";
}
