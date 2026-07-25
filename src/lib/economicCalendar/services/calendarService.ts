import type {
  EconomicEvent,
  EconomicCalendarResponse,
  CalendarSource,
  CalendarStats,
} from "@/types/economicCalendar";

const TWELVE_DATA_BASE = "https://api.twelvedata.com";
const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";
const TIMEOUT_MS = 15000;

const FRED_SERIES_MAP: Record<string, { seriesId: string; eventName: string; country: string }> = {
  GDP: { seriesId: "GDP", eventName: "Gross Domestic Product", country: "United States" },
  UNRATE: { seriesId: "UNRATE", eventName: "Unemployment Rate", country: "United States" },
  CPI: { seriesId: "CPIAUCSL", eventName: "Consumer Price Index", country: "United States" },
  FEDFUNDS: { seriesId: "FEDFUNDS", eventName: "Federal Funds Rate", country: "United States" },
  T10Y2Y: { seriesId: "T10Y2Y", eventName: "10Y-2Y Treasury Spread", country: "United States" },
};

export async function fetchEconomicCalendar(
  options?: { startDate?: string; endDate?: string; currency?: string }
): Promise<EconomicCalendarResponse> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    const fredEvents = await fetchFromFRED();
    if (fredEvents.length > 0) {
      return buildResponse(fredEvents, "fred");
    }
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

    const url = new URL(`${TWELVE_DATA_BASE}/economic-calendar`);
    url.searchParams.set("apikey", apiKey);
    if (options?.startDate) url.searchParams.set("start_date", options.startDate);
    if (options?.endDate) url.searchParams.set("end_date", options.endDate);
    if (options?.currency) url.searchParams.set("currency", options.currency);

    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Twelve Data HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawEvents: Record<string, unknown>[] = Array.isArray(data?.events)
      ? data.events
      : Array.isArray(data)
        ? data
        : [];

    const events: EconomicEvent[] = rawEvents.map((e) => ({
      id: `td-${String(e.event ?? "")}-${String(e.date ?? "")}-${String(e.time ?? "")}`,
      eventName: String(e.event ?? ""),
      country: String(e.country ?? ""),
      currency: String(e.currency ?? ""),
      impact: mapImpact(e.impact),
      forecast: String(e.forecast ?? ""),
      previous: String(e.previous ?? ""),
      actual: String(e.actual ?? ""),
      time: String(e.time ?? ""),
      date: String(e.date ?? ""),
      status: determineStatus(e.actual, e.time, e.date),
      source: "twelve-data",
    }));

    return buildResponse(events, "twelve-data");
  } catch (error) {
    console.error("[calendarService] Twelve Data failed, trying FRED fallback:", error);
    const fredEvents = await fetchFromFRED();
    if (fredEvents.length > 0) {
      return buildResponse(fredEvents, "fred");
    }
    return {
      events: [],
      lastSync: new Date().toISOString(),
      source: "unavailable",
      stats: emptyStats(),
    };
  }
}

export async function fetchFromFRED(): Promise<EconomicEvent[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return [];

  const seriesEntries = Object.entries(FRED_SERIES_MAP);
  const results = await Promise.allSettled(
    seriesEntries.map(([, config]) => fetchFredObservation(apiKey, config.seriesId))
  );

  const events: EconomicEvent[] = [];

  results.forEach((result, index) => {
    if (result.status !== "fulfilled") return;
    const obs = result.value;
    if (!obs) return;

    const [, config] = seriesEntries[index];
    events.push({
      id: `fred-${config.seriesId}-${obs.date}`,
      eventName: config.eventName,
      country: config.country,
      currency: "USD",
      impact: "High",
      forecast: "",
      previous: "",
      actual: obs.value,
      time: "08:30",
      date: obs.date,
      status: "Released",
      source: "fred",
    });
  });

  return events;
}

interface FredObservation {
  date: string;
  value: string;
}

async function fetchFredObservation(
  apiKey: string,
  seriesId: string
): Promise<FredObservation | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL(FRED_BASE);
    url.searchParams.set("series_id", seriesId);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("file_type", "json");
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("limit", "1");

    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    const observations = data?.observations;
    if (!Array.isArray(observations) || observations.length === 0) return null;

    const latest = observations[0];
    if (!latest || latest.value === "." || latest.value === undefined) return null;

    return { date: latest.date ?? "", value: String(latest.value) };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

function mapImpact(raw: unknown): "High" | "Medium" | "Low" {
  const val = String(raw ?? "").toLowerCase();
  if (val === "3" || val === "high" || val.includes("high")) return "High";
  if (val === "2" || val === "medium" || val.includes("medium")) return "Medium";
  return "Low";
}

function determineStatus(
  actual: unknown,
  time: unknown,
  date: unknown
): "Released" | "Upcoming" | "Pending" {
  if (actual !== undefined && actual !== null && String(actual).trim() !== "") {
    return "Released";
  }

  if (date && time) {
    const eventDateTime = new Date(`${String(date)}T${String(time)}`);
    if (!isNaN(eventDateTime.getTime())) {
      return eventDateTime.getTime() > Date.now() ? "Upcoming" : "Pending";
    }
  }

  return "Pending";
}

function buildResponse(events: EconomicEvent[], source: CalendarSource): EconomicCalendarResponse {
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
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const nextEvent = upcoming[0];

  return {
    totalEvents: events.length,
    highImpactCount: events.filter((e) => e.impact === "High").length,
    mediumImpactCount: events.filter((e) => e.impact === "Medium").length,
    lowImpactCount: events.filter((e) => e.impact === "Low").length,
    upcomingCount: events.filter((e) => e.status === "Upcoming").length,
    liveCount: events.filter((e) => e.status === "Live").length,
    releasedCount: events.filter((e) => e.status === "Released").length,
    nextEventName: nextEvent?.eventName ?? "—",
    nextEventCountdown: nextEvent ? `${nextEvent.date}T${nextEvent.time}` : "",
    usdEventsToday: events.filter((e) => e.currency === "USD" && e.date === todayStr).length,
    marketStatus: getMarketStatusLabel(events),
  };
}

function getMarketStatusLabel(events: EconomicEvent[]): string {
  const liveCount = events.filter((e) => e.status === "Live").length;
  const upcomingCount = events.filter((e) => e.status === "Upcoming").length;
  if (liveCount > 0) return "Active";
  if (upcomingCount > 0) return "Pre-Market";
  return "Closed";
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
    nextEventName: "—",
    nextEventCountdown: "",
    usdEventsToday: 0,
    marketStatus: "Closed",
  };
}
