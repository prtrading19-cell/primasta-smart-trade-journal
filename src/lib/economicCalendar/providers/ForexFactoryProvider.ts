import type {
  EconomicEvent,
  EconomicCalendarResponse,
  CalendarStats,
} from "@/types/economicCalendar";
import type {
  EconomicCalendarProvider,
  CalendarFetchOptions,
  ProviderName,
} from "./EconomicCalendarProvider";

interface FfRawEvent {
  title?: string;
  country?: string;
  date?: string;
  impact?: string;
  forecast?: string;
  previous?: string;
}

const FF_FEED_BASE = "https://nfs.faireconomy.media";
const TIMEOUT_MS = 12000;

export class ForexFactoryProvider implements EconomicCalendarProvider {
  readonly name: ProviderName = "forexfactory";

  async fetchCalendar(options?: CalendarFetchOptions): Promise<EconomicCalendarResponse> {
    const debugInfo: { message: string; status?: number; url?: string; body?: string } = {
      message: "",
    };

    try {
      const rawEvents = await this.fetchFeed(debugInfo);

      const events: EconomicEvent[] = rawEvents
        .map((e) => this.normalize(e))
        .filter((e): e is EconomicEvent => e !== null);

      let filtered = events;

      if (options?.startDate) {
        filtered = filtered.filter((e) => e.date >= options.startDate!);
      }
      if (options?.endDate) {
        filtered = filtered.filter((e) => e.date <= options.endDate!);
      }
      if (options?.currency) {
        const cur = options.currency.toUpperCase();
        filtered = filtered.filter((e) => e.currency === cur);
      }

      const sorted = filtered.sort((a, b) => {
        const da = a.date + " " + a.time;
        const db = b.date + " " + b.time;
        return da.localeCompare(db);
      });

      return {
        events: sorted,
        lastSync: new Date().toISOString(),
        source: "forexfactory",
        stats: computeStats(sorted),
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("[ForexFactoryProvider] fetch failed:", err.message);
      console.error("[ForexFactoryProvider] debug:", JSON.stringify(debugInfo, null, 2));

      const message = debugInfo.message || err.message || "Unknown error";

      return {
        events: [],
        lastSync: new Date().toISOString(),
        source: "unavailable",
        stats: emptyStats(),
        debug: {
          message,
          status: debugInfo.status,
          url: debugInfo.url,
          body: debugInfo.body,
        },
      };
    }
  }

  private async fetchFeed(debugInfo: { message: string; status?: number; url?: string; body?: string }): Promise<FfRawEvent[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const thisWeek = await this.fetchJson(
        `${FF_FEED_BASE}/ff_calendar_thisweek.json`,
        controller.signal,
        debugInfo
      );
      const nextWeek = await this.fetchJson(
        `${FF_FEED_BASE}/ff_calendar_nextweek.json`,
        controller.signal,
        debugInfo
      );
      return [...thisWeek, ...nextWeek];
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchJson(
    url: string,
    signal: AbortSignal,
    debugInfo: { message: string; status?: number; url?: string; body?: string }
  ): Promise<FfRawEvent[]> {
    let response: Response | undefined;
    try {
      response = await fetch(url, { cache: "no-store", signal });
      if (!response.ok) {
        let body = "";
        try { body = (await response.text()).substring(0, 500); } catch {}
        debugInfo.message = `HTTP ${response.status} from ${url}`;
        debugInfo.status = response.status;
        debugInfo.url = url;
        debugInfo.body = body;
        console.error(`[ForexFactoryProvider] ${debugInfo.message}`);
        console.error(`[ForexFactoryProvider] body: ${body}`);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (fetchError) {
      const err = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
      debugInfo.message = `Fetch error for ${url}: ${err.message}`;
      debugInfo.url = url;
      if (response) {
        try { debugInfo.body = (await response.text()).substring(0, 500); } catch {}
      }
      if (err.name === "AbortError") {
        debugInfo.message = `Timeout after ${TIMEOUT_MS}ms fetching ${url}`;
      }
      console.error(`[ForexFactoryProvider] ${debugInfo.message}`);
      throw err;
    }
  }

  private normalize(raw: FfRawEvent): EconomicEvent | null {
    const title = raw.title?.trim();
    if (!title) return null;

    const dateStr = raw.date ?? "";
    const parsed = this.parseDateTime(dateStr);
    if (!parsed) return null;

    const currency = (raw.country ?? "").trim().toUpperCase();
    const impact = this.mapImpact(raw.impact);

    return {
      id: `ff-${parsed.date}-${parsed.time}-${title.replace(/\s+/g, "-").substring(0, 30)}`,
      date: parsed.date,
      time: parsed.time,
      country: currency,
      currency,
      event: title,
      importance: impact,
      actual: null,
      forecast: this.cleanValue(raw.forecast),
      previous: this.cleanValue(raw.previous),
      source: "forexfactory",
      status: determineStatus(parsed.date, parsed.time),
      impact: "Unknown",
    };
  }

  private parseDateTime(dateStr: string): { date: string; time: string } | null {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");

    return {
      date: `${yyyy}-${mm}-${dd}`,
      time: `${hh}:${min}`,
    };
  }

  private mapImpact(raw: string | undefined): "High" | "Medium" | "Low" {
    const val = (raw ?? "").toLowerCase().trim();
    if (val === "high") return "High";
    if (val === "medium") return "Medium";
    if (val === "holiday") return "Low";
    return "Low";
  }

  private cleanValue(val: string | undefined): string | null {
    if (!val) return null;
    const trimmed = val.trim();
    return trimmed === "" ? null : trimmed;
  }
}

function determineStatus(date: string, time: string): "Upcoming" | "Released" {
  const eventTime = new Date(date + "T" + time).getTime();
  if (isNaN(eventTime)) return "Upcoming";
  return eventTime > Date.now() ? "Upcoming" : "Released";
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
