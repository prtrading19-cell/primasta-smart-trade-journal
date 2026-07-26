import type {
  EconomicEvent,
  EconomicCalendarResponse,
} from "@/types/economicCalendar";

export interface CalendarFetchOptions {
  startDate?: string;
  endDate?: string;
  currency?: string;
}

export type ProviderName = "forexfactory" | "tradingeconomics" | "fmp";

export interface EconomicCalendarProvider {
  readonly name: ProviderName;

  fetchCalendar(options?: CalendarFetchOptions): Promise<EconomicCalendarResponse>;
}
