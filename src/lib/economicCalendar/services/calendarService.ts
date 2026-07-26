import type { EconomicCalendarResponse } from "@/types/economicCalendar";
import { getProvider } from "../providers/ProviderFactory";
import type { CalendarFetchOptions } from "../providers/EconomicCalendarProvider";

export type { CalendarFetchOptions };

export async function fetchEconomicCalendar(
  options?: CalendarFetchOptions
): Promise<EconomicCalendarResponse> {
  const provider = getProvider();
  return provider.fetchCalendar(options);
}
