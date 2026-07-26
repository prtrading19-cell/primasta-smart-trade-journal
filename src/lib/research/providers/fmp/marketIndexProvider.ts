import type { US100Index, US100DataMeta } from "@/types/us100";
import { US100_FMP_INDEX_SYMBOL } from "@/types/us100";
import { fmpFetch, nowISO, FMPError } from "./fmpClient";

interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  timestamp: number;
}

export async function fetchUS100Index(): Promise<US100Index> {
  const timestamp = nowISO();

  try {
    const data = await fmpFetch<FMPQuote[]>("/quote", {
      symbol: US100_FMP_INDEX_SYMBOL,
    });

    const quote = Array.isArray(data) ? data[0] : null;
    if (!quote || typeof quote.price !== "number") {
      return buildUnavailableIndex(timestamp, "No data returned from FMP");
    }

    return {
      symbol: US100_FMP_INDEX_SYMBOL,
      name: "NASDAQ-100",
      price: quote.price,
      change: quote.change,
      changePercent: quote.changesPercentage,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      previousClose: quote.previousClose,
      volume: quote.volume,
      timestamp: new Date(quote.timestamp * 1000).toISOString(),
      meta: buildMeta("live", "FMP", timestamp),
    };
  } catch (err) {
    const message = err instanceof FMPError ? err.message : err instanceof Error ? err.message : "Unknown error";
    return buildUnavailableIndex(timestamp, message);
  }
}

function buildUnavailableIndex(timestamp: string, error: string): US100Index {
  return {
    symbol: US100_FMP_INDEX_SYMBOL,
    name: "NASDAQ-100",
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    high: 0,
    low: 0,
    previousClose: 0,
    volume: 0,
    timestamp,
    meta: { status: "unavailable", source: "FMP", timestamp, lastUpdated: timestamp, error },
  };
}

function buildMeta(status: US100DataMeta["status"], source: string, timestamp: string): US100DataMeta {
  return { status, source, timestamp, lastUpdated: timestamp };
}
