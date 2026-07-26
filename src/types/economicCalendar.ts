export type EconomicImpact = "High" | "Medium" | "Low";

export type EventStatus = "Upcoming" | "Released";

export type EventBias = "Bullish" | "Bearish" | "Neutral" | "Unknown";

export interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  country: string;
  currency: string;
  event: string;
  importance: EconomicImpact;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  unit?: string;
  source: string;
  status: EventStatus;
  impact: EventBias;
}

export type CalendarSource = "fmp" | "forexfactory" | "tradingeconomics" | "unavailable";

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
  goldFocus: boolean;
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
  debug?: {
    message: string;
    status?: number;
    url?: string;
    body?: string;
  };
}

export interface CurrencyInfo {
  code: string;
  name: string;
  flag: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", name: "United States Dollar", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "EUR", name: "Euro", flag: "\u{1F1EA}\u{1F1FA}" },
  { code: "GBP", name: "British Pound", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "JPY", name: "Japanese Yen", flag: "\u{1F1EF}\u{1F1F5}" },
  { code: "AUD", name: "Australian Dollar", flag: "\u{1F1E6}\u{1F1FA}" },
  { code: "NZD", name: "New Zealand Dollar", flag: "\u{1F1F3}\u{1F1FF}" },
  { code: "CAD", name: "Canadian Dollar", flag: "\u{1F1E8}\u{1F1E6}" },
  { code: "CHF", name: "Swiss Franc", flag: "\u{1F1E8}\u{1F1ED}" },
  { code: "CNY", name: "Chinese Yuan", flag: "\u{1F1E8}\u{1F1F3}" },
];

export const CURRENCY_MAP: Record<string, CurrencyInfo> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c])
);

export const GOLD_FOCUS_KEYWORDS = [
  "fomc", "fed", "cpi", "core cpi", "pce", "core pce",
  "nfp", "non-farm", "nonfarm", "unemployment", "jobless",
  "initial jobless", "gdp", "retail sales", "pmi", "ppi",
  "treasury", "powell", "ecb", "boe", "boj", "snb", "rba", "rbnz", "boc",
  "interest rate", "rate decision", "monetary policy",
  "inflation", "employment", "payroll",
];
