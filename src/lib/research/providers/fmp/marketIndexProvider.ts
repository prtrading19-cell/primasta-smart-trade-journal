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
  const startTime = Date.now();

  try {
    const data = await fmpFetch<FMPQuote[]>("/quote", {
      symbol: US100_FMP_INDEX_SYMBOL,
    });

    const durationMs = Date.now() - startTime;

    if (!Array.isArray(data)) {
      console.log(
        `[FMP Index] Symbol: ${US100_FMP_INDEX_SYMBOL} | Status: UNAVAILABLE | Reason: Response is not an array | Duration: ${durationMs}ms`
      );
      return buildUnavailableIndex(timestamp, "Response is not an array");
    }

    const quote = data[0];
    if (!quote || typeof quote.price !== "number" || quote.price === 0) {
      console.log(
        `[FMP Index] Symbol: ${US100_FMP_INDEX_SYMBOL} | Status: NO_DATA | Reason: No valid quote in response (${data.length} items) | Duration: ${durationMs}ms`
      );
      return buildUnavailableIndex(timestamp, "No valid quote data in response");
    }

    console.log(
      `[FMP Index] Symbol: ${US100_FMP_INDEX_SYMBOL} | Status: LIVE | Price: ${quote.price} | Duration: ${durationMs}ms`
    );

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
    const durationMs = Date.now() - startTime;
    const message = err instanceof FMPError ? err.message : err instanceof Error ? err.message : "Unknown error";
    const statusCode = err instanceof FMPError ? err.statusCode : undefined;

    let statusLabel = "ERROR";
    if (message.includes("not configured")) statusLabel = "INVALID_KEY";
    else if (message.includes("Rate limited")) statusLabel = "RATE_LIMITED";
    else if (message.includes("timed out") || message.includes("AbortError")) statusLabel = "TIMEOUT";

    console.log(
      `[FMP Index] Symbol: ${US100_FMP_INDEX_SYMBOL} | Status: ${statusLabel} | HTTP: ${statusCode ?? "N/A"} | Error: ${message} | Duration: ${durationMs}ms`
    );

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
