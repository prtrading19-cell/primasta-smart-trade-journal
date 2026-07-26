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

  try {
    const data = await fmpFetch<FMPMover[]>("/stock_market/nasdaq", {
      limit: "30",
    });

    if (!Array.isArray(data) || data.length === 0) {
      return buildUnavailableMovers(timestamp, "No data returned");
    }

    const sorted = [...data].sort((a, b) => b.changesPercentage - a.changesPercentage);
    const topGainers = sorted.slice(0, 10).map(normalizeMover);
    const topLosers = [...sorted].reverse().slice(0, 10).map(normalizeMover);
    const mostActive = [...data]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10)
      .map(normalizeMover);

    return {
      topGainers,
      topLosers,
      mostActive,
      meta: buildMeta("live", "FMP", timestamp),
    };
  } catch (err) {
    const message = err instanceof FMPError ? err.message : err instanceof Error ? err.message : "Unknown error";
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
