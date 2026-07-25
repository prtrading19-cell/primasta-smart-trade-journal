import type {
  EconomicEvent,
  EconomicCalendarResponse,
  CalendarStats,
  EventBias,
} from "@/types/economicCalendar";

const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const TIMEOUT_MS = 15000;

interface FmpRawEvent {
  date?: string;
  country?: string;
  event?: string;
  impact?: string;
  change?: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  currency?: string;
}

export async function fetchEconomicCalendar(
  options?: { startDate?: string; endDate?: string; currency?: string }
): Promise<EconomicCalendarResponse> {
  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return {
      events: [],
      lastSync: new Date().toISOString(),
      source: "unavailable",
      stats: emptyStats(),
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const url = new URL(`${FMP_BASE}/economic_calendar`);
    url.searchParams.set("apikey", apiKey);
    if (options?.startDate) url.searchParams.set("from", options.startDate);
    if (options?.endDate) url.searchParams.set("to", options.endDate);

    const response = await fetch(url.toString(), { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      const statusText = response.status === 401 ? "Unauthorized" :
        response.status === 403 ? "Forbidden" :
        response.status === 429 ? "Rate Limited" :
        `HTTP ${response.status}`;
      throw new Error(`FMP API ${statusText}`);
    }

    const data = await response.json();
    const rawEvents: FmpRawEvent[] = Array.isArray(data) ? data : [];

    const events: EconomicEvent[] = rawEvents.map((e, idx) => {
      const dateStr = e.date ?? "";
      const timePart = dateStr.includes("T") ? dateStr.split("T")[1]?.substring(0, 5) ?? "00:00" : "00:00";
      const datePart = dateStr.split("T")[0] ?? dateStr;

      return {
        id: `fmp-${idx}-${datePart}-${(e.event ?? "").replace(/\s+/g, "-").substring(0, 30)}`,
        date: datePart,
        time: timePart,
        country: e.country ?? "",
        currency: mapFmpCurrency(e.country ?? "", e.currency ?? ""),
        event: e.event ?? "",
        importance: mapFmpImpact(e.impact),
        actual: e.actual ?? null,
        forecast: e.forecast ?? null,
        previous: e.previous ?? null,
        source: "fmp",
        status: determineStatus(e.actual, dateStr),
        impact: "Unknown",
      };
    });

    const sorted = events.sort((a, b) => {
      const da = a.date + " " + a.time;
      const db = b.date + " " + b.time;
      return da.localeCompare(db);
    });

    return buildResponse(sorted, "fmp");
  } catch (error) {
    console.error("[calendarService] FMP fetch failed:", error);
    return {
      events: [],
      lastSync: new Date().toISOString(),
      source: "unavailable",
      stats: emptyStats(),
    };
  }
}

function mapFmpImpact(raw: string | undefined): "High" | "Medium" | "Low" {
  const val = (raw ?? "").toLowerCase();
  if (val.includes("high") || val === "3") return "High";
  if (val.includes("medium") || val === "2") return "Medium";
  return "Low";
}

function mapFmpCurrency(country: string, currency: string): string {
  if (currency && currency.length === 3) return currency.toUpperCase();
  const c = country.toLowerCase();
  if (c.includes("united states") || c.includes("usa")) return "USD";
  if (c.includes("euro") || c.includes("european")) return "EUR";
  if (c.includes("united kingdom") || c.includes("britain")) return "GBP";
  if (c.includes("japan")) return "JPY";
  if (c.includes("australia")) return "AUD";
  if (c.includes("new zealand")) return "NZD";
  if (c.includes("canada")) return "CAD";
  if (c.includes("switzerland")) return "CHF";
  if (c.includes("china")) return "CNY";
  return "USD";
}

function determineStatus(actual: string | undefined | null, dateStr: string): "Upcoming" | "Released" {
  if (actual !== undefined && actual !== null && actual.trim() !== "") {
    return "Released";
  }
  const eventTime = new Date(dateStr).getTime();
  if (!isNaN(eventTime) && eventTime > Date.now()) return "Upcoming";
  return "Upcoming";
}

function buildResponse(events: EconomicEvent[], source: "fmp" | "unavailable"): EconomicCalendarResponse {
  return {
    events,
    lastSync: new Date().toISOString(),
    source,
    stats: computeStats(events),
  };
}

function computeStats(events: EconomicEvent[]): CalendarStats {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const upcoming = events
    .filter((e) => e.status === "Upcoming")
    .sort((a, b) => (a.date + " " + a.time).localeCompare(b.date + " " + b.time));
  const nextEvent = upcoming[0];

  return {
    totalEvents: events.length,
    highImpactCount: events.filter((e) => e.importance === "High").length,
    mediumImpactCount: events.filter((e) => e.importance === "Medium").length,
    lowImpactCount: events.filter((e) => e.importance === "Low").length,
    upcomingCount: events.filter((e) => e.status === "Upcoming").length,
    liveCount: 0,
    releasedCount: events.filter((e) => e.status === "Released").length,
    nextEventName: nextEvent?.event ?? "\u2014",
    nextEventCountdown: nextEvent ? nextEvent.date + "T" + nextEvent.time : "",
    usdEventsToday: events.filter((e) => e.currency === "USD" && e.date === todayStr).length,
    marketStatus: "Active",
  };
}

function emptyStats(): CalendarStats {
  return {
    totalEvents: 0,
    highImpactCount: 0,
    mediumImpactCount: 0,
    lowImpactCount: 0,
    upcomingCount: 0,
    liveCount: 0,
    releasedCount: 0,
    nextEventName: "\u2014",
    nextEventCountdown: "",
    usdEventsToday: 0,
    marketStatus: "Closed",
  };
}
