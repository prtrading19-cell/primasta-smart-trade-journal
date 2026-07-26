import type {
  EconomicCalendarResponse,
} from "@/types/economicCalendar";
import type {
  EconomicCalendarProvider,
  CalendarFetchOptions,
  ProviderName,
} from "./EconomicCalendarProvider";

export class TradingEconomicsProvider implements EconomicCalendarProvider {
  readonly name: ProviderName = "tradingeconomics";

  async fetchCalendar(_options?: CalendarFetchOptions): Promise<EconomicCalendarResponse> {
    console.warn("[TradingEconomicsProvider] Not yet implemented. Configure ECONOMIC_PROVIDER=forexfactory or =fmp.");
    return {
      events: [],
      lastSync: new Date().toISOString(),
      source: "unavailable",
      stats: {
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
      },
    };
  }
}
