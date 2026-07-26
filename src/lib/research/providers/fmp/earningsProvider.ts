import type { US100Earnings, US100DataMeta } from "@/types/us100";
import { US100_MEGA_CAP_SYMBOLS, type US100MegaCapSymbol } from "@/types/us100";
import { fmpFetch, nowISO, FMPError } from "./fmpClient";

interface FMPEarningsCalendar {
  symbol: string;
  date: string;
  epsEstimated: number | null;
  eps: number | null;
  revenueEstimated: number | null;
  revenue: number | null;
  fiscalDateEnding: string;
  reportedDate: string;
}

const HIGH_IMPACT_SYMBOLS = new Set<US100MegaCapSymbol>([
  "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "AVGO",
]);

export async function fetchUS100Earnings(): Promise<US100Earnings[]> {
  const timestamp = nowISO();

  try {
    const symbols = US100_MEGA_CAP_SYMBOLS.join(",");
    const data = await fmpFetch<FMPEarningsCalendar[]>("/earnings_calendar", {
      from: getDateOffset(-7),
      to: getDateOffset(30),
    });

    if (!Array.isArray(data)) return [];

    const earnings: US100Earnings[] = data
      .filter((e) => US100_MEGA_CAP_SYMBOLS.includes(e.symbol as US100MegaCapSymbol))
      .map((e) => ({
        symbol: e.symbol,
        company: e.symbol,
        earningsDate: e.date,
        estimateEPS: e.epsEstimated,
        previousEPS: e.eps,
        importance: HIGH_IMPACT_SYMBOLS.has(e.symbol as US100MegaCapSymbol) ? "High" as const : "Medium" as const,
        meta: buildMeta("live", "FMP", timestamp),
      }));

    return earnings;
  } catch (err) {
    const message = err instanceof FMPError ? err.message : err instanceof Error ? err.message : "Unknown error";
    return US100_MEGA_CAP_SYMBOLS.map((symbol) => ({
      symbol,
      company: symbol,
      earningsDate: "",
      estimateEPS: null,
      previousEPS: null,
      importance: "Medium" as const,
      meta: buildMeta("unavailable", "FMP", timestamp, message),
    }));
  }
}

function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function buildMeta(status: US100DataMeta["status"], source: string, timestamp: string, error?: string): US100DataMeta {
  return { status, source, timestamp, lastUpdated: timestamp, error };
}
