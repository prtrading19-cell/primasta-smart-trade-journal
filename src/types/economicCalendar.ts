export type EconomicImpact = "High" | "Medium" | "Low";

export type EventStatus = "Upcoming" | "Live" | "Released" | "Completed";

export interface EconomicEvent {
  id: string;
  eventName: string;
  country: string;
  currency: string;
  impact: EconomicImpact;
  forecast: string;
  previous: string;
  actual: string;
  time: string;
  date: string;
  status: EventStatus | "Pending";
  source: string;
}

export type CalendarSource = "twelve-data" | "fred" | "unavailable";

export interface CalendarStats {
  totalEvents: number;
  highImpactCount: number;
  mediumImpactCount: number;
  lowImpactCount: number;
  upcomingCount: number;
  liveCount: number;
  releasedCount: number;
  nextEventName: string;
  nextEventCountdown: string;
  usdEventsToday: number;
  marketStatus: string;
}

export interface CalendarFilterState {
  dateRange: "today" | "tomorrow" | "thisWeek" | "all";
  impacts: EconomicImpact[];
  currencies: string[];
  searchQuery: string;
}

export interface CalendarPreferences {
  defaultCurrency?: string;
  defaultView?: string;
  favoriteEventIds?: string[];
  readEventIds?: string[];
}

export interface EconomicCalendarResponse {
  events: EconomicEvent[];
  lastSync: string;
  source: CalendarSource;
  stats: CalendarStats;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  flag: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", name: "United States Dollar", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳" },
];

export const CURRENCY_MAP: Record<string, CurrencyInfo> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c])
);
