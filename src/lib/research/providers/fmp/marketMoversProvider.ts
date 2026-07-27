import type { US100Movers, US100MarketMover, US100DataMeta } from "@/types/us100";
import { fmpFetch, nowISO, FMPError } from "./fmpClient";

interface FMPMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  volume: number;
}

export async function fetchUS100Movers(): Promise<US100Movers> {
  const timestamp = nowISO();
  const startTime = Date.now();

  try {
    const data = await fmpFetch<FMPMover[]>("/stock_market/nasdaq", { limit: "30" });
    const durationMs = Date.now() - startTime;

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`[FMP Movers] Endpoint: /stock_market/nasdaq | Status: NO_DATA | Duration: ${durationMs}ms`);
      return buildUnavailableMovers(timestamp, "No data returned from FMP");
    }

    const sorted = [...data].sort((a, b) => b.changesPercentage - a.changesPercentage);
    const topGainers = sorted.slice(0, 10).map(normalizeMover);
    const topLosers = [...sorted].reverse().slice(0, 10).map(normalizeMover);
    const mostActive = [...data]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10)
      .map(normalizeMover);

    const hasValidData = topGainers.some((m) => m.price > 0) || topLosers.some((m) => m.price > 0);
    const status = hasValidData ? "LIVE" : "NO_DATA";

    console.log(`[FMP Movers] Endpoint: /stock_market/nasdaq | Status: ${status} | Movers: ${data.length} | Duration: ${durationMs}ms`);
    return {
      topGainers,
      topLosers,
      mostActive,
      meta: buildMeta(status === "LIVE" ? "live" : "unavailable", "FMP", timestamp),
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof FMPError ? err.message : err instanceof Error ? err.message : "Unknown error";
    let statusLabel = "ERROR";
    if (message.includes("not configured")) statusLabel = "INVALID_KEY";
    else if (message.includes("Rate limited")) statusLabel = "RATE_LIMITED";
    console.log(`[FMP Movers] Endpoint: /stock_market/nasdaq | Status: ${statusLabel} | Error: ${message} | Duration: ${durationMs}ms`);
    return buildUnavailableMovers(timestamp, message);
  }
}

function normalizeMover(m: FMPMover): US100MarketMover {
  return {
    symbol: m.symbol,
    name: m.name,
    price: m.price,
    change: m.change,
    changePercent: m.changesPercentage,
    volume: m.volume,
  };
}

function buildUnavailableMovers(timestamp: string, error: string): US100Movers {
  return {
    topGainers: [], topLosers: [], mostActive: [],
    meta: { status: "unavailable", source: "FMP", timestamp, lastUpdated: timestamp, error },
  };
}

function buildMeta(status: US100DataMeta["status"], source: string, timestamp: string): US100DataMeta {
  return { status, source, timestamp, lastUpdated: timestamp };
}
