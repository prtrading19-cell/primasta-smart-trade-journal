import type { US100Earnings, US100DataMeta } from "@/types/us100";
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

export async function fetchEarnings(symbols: readonly string[]): Promise<US100Earnings[]> {
  const timestamp = nowISO();
  const startTime = Date.now();
  const from = getDateOffset(-7);
  const to = getDateOffset(30);
  const symbolSet = new Set(symbols);

  try {
    const data = await fmpFetch<FMPEarningsCalendar[]>("/earnings-calendar", { from, to });
    const durationMs = Date.now() - startTime;

    if (!Array.isArray(data)) {
      console.log(`[FMP Earnings] Endpoint: /earnings-calendar | DateRange: ${from}..${to} | Status: NO_DATA | Duration: ${durationMs}ms`);
      return symbols.map((symbol) => ({
        symbol,
        company: symbol,
        earningsDate: "",
        estimateEPS: null,
        previousEPS: null,
        importance: "Medium" as const,
        meta: buildMeta("unavailable", "FMP", timestamp, "Response is not an array"),
      }));
    }

    const earnings: US100Earnings[] = data
      .filter((e) => symbolSet.has(e.symbol))
      .map((e) => ({
        symbol: e.symbol,
        company: e.symbol,
        earningsDate: e.date,
        estimateEPS: e.epsEstimated,
        previousEPS: e.eps,
        importance: symbolSet.has(e.symbol) ? "High" as const : "Medium" as const,
        meta: buildMeta("live", "FMP", timestamp),
      }));

    console.log(`[FMP Earnings] Endpoint: /earnings-calendar | DateRange: ${from}..${to} | Status: LIVE | Entries: ${earnings.length} (filtered from ${data.length}) | Duration: ${durationMs}ms`);
    return earnings;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof FMPError ? err.message : err instanceof Error ? err.message : "Unknown error";
    let statusLabel = "ERROR";
    if (message.includes("not configured")) statusLabel = "INVALID_KEY";
    else if (message.includes("Rate limited")) statusLabel = "RATE_LIMITED";
    console.log(`[FMP Earnings] Endpoint: /earnings-calendar | DateRange: ${from}..${to} | Status: ${statusLabel} | Error: ${message} | Duration: ${durationMs}ms`);
    return symbols.map((symbol) => ({
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
