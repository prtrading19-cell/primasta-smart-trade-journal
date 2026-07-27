import { NextResponse } from "next/server";
import { getProfile } from "@/lib/research";
import { fetchUS100Index } from "@/lib/research/providers/fmp/marketIndexProvider";
import { fetchStockQuotes } from "@/lib/research/providers/twelvedata/stockQuotesProvider";
import { fetchEarnings } from "@/lib/research/providers/fmp/earningsProvider";
import { fetchUS100Sectors } from "@/lib/research/providers/fmp/sectorProvider";
import { fetchUS100Movers } from "@/lib/research/providers/fmp/marketMoversProvider";
import { fetchUS100Volatility } from "@/lib/research/providers/fmp/volatilityProvider";
import { fetchCompanyProfiles } from "@/lib/research/providers/fmp/companyProfileProvider";
import type { US100FullDataset } from "@/lib/research/us100/us100DataOrchestrator";
import type { US100Index, US100SectorPerformance, US100Movers, US100Volatility, US100MarketBreadth, US100MegaCapStock, US100MarketMover } from "@/types/us100";

export const dynamic = "force-dynamic";

export async function GET() {
  const collectedAt = new Date().toISOString();
  const errors: string[] = [];
  const sourceSummary: string[] = [];

  const profile = getProfile("us100");
  const symbols = profile?.trackedSymbols ?? [];

  const settle = <T>(label: string, promise: Promise<T>): Promise<{ data: T | null; error: string | null }> =>
    promise
      .then((data) => {
        sourceSummary.push(label);
        return { data, error: null };
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${label}: ${msg}`);
        return { data: null, error: msg };
      });

  console.log(`[API /api/us100/data] Starting data collection... Tracked symbols: ${symbols.length}`);

  const [
    indexResult,
    stocksResult,
    earningsResult,
    sectorsResult,
    moversResult,
    volatilityResult,
    profilesResult,
  ] = await Promise.all([
    settle("FMP Index", fetchUS100Index()),
    settle("Twelve Data Stocks", fetchStockQuotes(symbols)),
    settle("FMP Earnings", fetchEarnings(symbols)),
    settle("FMP Sectors", fetchUS100Sectors()),
    settle("FMP Movers", fetchUS100Movers()),
    settle("FMP Volatility", fetchUS100Volatility()),
    settle("FMP Profiles", fetchCompanyProfiles(symbols)),
  ]);

  const dataset: US100FullDataset = {
    index: indexResult.data ?? buildFallbackIndex(collectedAt),
    stocks: stocksResult.data ?? [],
    earnings: earningsResult.data ?? [],
    sectors: sectorsResult.data ?? buildFallbackSectors(collectedAt),
    movers: moversResult.data ?? buildFallbackMovers(collectedAt),
    volatility: volatilityResult.data ?? buildFallbackVolatility(collectedAt),
    profiles: profilesResult.data ?? [],
    marketBreadth: buildFallbackMarketBreadth(collectedAt),
    derivedIndex: buildFallbackDerivedIndex(collectedAt),
    collectedAt,
    sourceSummary,
    errors,
  };

  const enriched = enrichUnavailableProviders(dataset);

  console.log(
    `[API /api/us100/data] Complete | Sources: ${sourceSummary.length} | Errors: ${errors.length}`
  );

  return NextResponse.json(enriched, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function buildFallbackIndex(ts: string) {
  return {
    symbol: "^NDX", name: "NASDAQ-100", price: 0, change: 0, changePercent: 0,
    open: 0, high: 0, low: 0, previousClose: 0, volume: 0, timestamp: ts,
    meta: { status: "unavailable" as const, source: "FMP", timestamp: ts, lastUpdated: ts, error: "Provider unavailable" },
  };
}

function buildFallbackDerivedIndex(ts: string) {
  return {
    symbol: "^NDX", name: "NASDAQ-100", price: 0, change: 0, changePercent: 0,
    open: 0, high: 0, low: 0, previousClose: 0, volume: 0, timestamp: ts,
    meta: { status: "unavailable" as const, source: "composite", timestamp: ts, lastUpdated: ts, error: "Provider unavailable" },
  };
}

function buildFallbackSectors(ts: string) {
  return {
    technology: 0, semiconductors: 0, healthcare: 0, financials: 0,
    industrials: 0, energy: 0, utilities: 0, consumer: 0, communication: 0, realEstate: 0,
    meta: { status: "unavailable" as const, source: "FMP", timestamp: ts, lastUpdated: ts, error: "Provider unavailable" },
  };
}

function buildFallbackMovers(ts: string) {
  return {
    topGainers: [], topLosers: [], mostActive: [],
    meta: { status: "unavailable" as const, source: "FMP", timestamp: ts, lastUpdated: ts, error: "Provider unavailable" },
  };
}

function buildFallbackVolatility(ts: string) {
  return {
    vix: null, vixChange: null, vixChangePercent: null,
    vxn: null, vxnChange: null, vxnChangePercent: null,
    trend: "Normal" as const, riskRating: "Moderate" as const,
    meta: { status: "unavailable" as const, source: "FMP", timestamp: ts, lastUpdated: ts, error: "Provider unavailable" },
  };
}

function buildFallbackMarketBreadth(ts: string) {
  return {
    advanceDecline: "0-0",
    newHighs: 0,
    newLows: 0,
    breadthScore: 0,
    overallHealth: "Critical" as const,
    meta: { status: "unavailable" as const, source: "composite", timestamp: ts, lastUpdated: ts, error: "Provider unavailable" },
  };
}

type EnrichedDataset = US100FullDataset & {
  index: US100Index;
  sectors: US100SectorPerformance;
  movers: US100Movers;
  volatility: US100Volatility;
  marketBreadth: US100MarketBreadth;
  derivedIndex: US100Index;
};

function enrichUnavailableProviders(dataset: US100FullDataset): EnrichedDataset {
  const liveStocks = (dataset.stocks as US100MegaCapStock[]).filter((s) => s.meta.status === "live");
  const derivedIndex = liveStocks.length > 0 ? deriveIndex(liveStocks, dataset.collectedAt) : buildFallbackIndex(dataset.collectedAt);

  const enriched: EnrichedDataset = {
    ...dataset,
    index: dataset.index,
    sectors: dataset.sectors.meta.status === "live" ? dataset.sectors : deriveSectors(liveStocks, dataset.collectedAt),
    movers: dataset.movers.meta.status === "live" ? dataset.movers : deriveMovers(liveStocks, dataset.collectedAt),
    volatility: dataset.volatility.meta.status === "live" ? dataset.volatility : deriveVolatility(liveStocks, dataset.collectedAt),
    marketBreadth: dataset.marketBreadth.meta.status === "live" ? dataset.marketBreadth : deriveMarketBreadth(liveStocks, dataset.collectedAt),
    derivedIndex,
  };

  if (enriched.sectors.meta.source !== dataset.sectors.meta.source) {
    enriched.sourceSummary = [...enriched.sourceSummary, "Derived Twelve Data Sectors"];
  }
  if (enriched.movers.meta.source !== dataset.movers.meta.source) {
    enriched.sourceSummary = [...enriched.sourceSummary, "Derived Twelve Data Movers"];
  }
  if (enriched.volatility.meta.source !== dataset.volatility.meta.source) {
    enriched.sourceSummary = [...enriched.sourceSummary, "Derived Twelve Data Volatility"];
  }
  if (enriched.marketBreadth.meta.source !== dataset.marketBreadth.meta.source) {
    enriched.sourceSummary = [...enriched.sourceSummary, "Derived Twelve Data Breadth"];
  }
  if (derivedIndex.meta.status === "live" && dataset.index.meta.status !== "live") {
    enriched.sourceSummary = [...enriched.sourceSummary, "Derived Twelve Data Index"];
  }

  return enriched;
}

function deriveIndex(liveStocks: US100MegaCapStock[], timestamp: string): US100Index {
  const avgPrice = liveStocks.reduce((sum, s) => sum + s.price, 0) / liveStocks.length;
  const avgChange = liveStocks.reduce((sum, s) => sum + s.change, 0) / liveStocks.length;
  const avgPrevClose = liveStocks.reduce((sum, s) => sum + s.previousClose, 0) / liveStocks.length;
  const changePercent = avgPrevClose > 0 ? (avgChange / avgPrevClose) * 100 : 0;

  const open = avgPrevClose;
  const avgIntradayRangePct = liveStocks.reduce((sum, s) => {
    if (s.previousClose > 0) return sum + ((s.high - s.low) / s.previousClose) * 100;
    return sum;
  }, 0) / liveStocks.length;

  const high = avgPrevClose * (1 + (changePercent + avgIntradayRangePct / 2) / 100);
  const low = avgPrevClose * (1 + (changePercent - avgIntradayRangePct / 2) / 100);

  return {
    symbol: "^NDX",
    name: "NASDAQ-100 Composite (Derived)",
    price: avgPrice,
    change: avgChange,
    changePercent,
    open,
    high,
    low,
    previousClose: avgPrevClose,
    volume: liveStocks.reduce((sum, s) => sum + s.volume, 0),
    timestamp,
    meta: { status: "live", source: "Derived from Twelve Data", timestamp, lastUpdated: timestamp },
  };
}

function deriveSectors(liveStocks: US100MegaCapStock[], timestamp: string): US100SectorPerformance {
  const sectorChanges: Record<string, number[]> = {
    technology: liveStocks.filter((s) => ["AAPL", "MSFT"].includes(s.symbol)).map((s) => s.changePercent),
    semiconductors: liveStocks.filter((s) => ["NVDA", "AVGO"].includes(s.symbol)).map((s) => s.changePercent),
    healthcare: [],
    financials: [],
    industrials: [],
    energy: [],
    utilities: [],
    consumer: liveStocks.filter((s) => ["AMZN", "TSLA"].includes(s.symbol)).map((s) => s.changePercent),
    communication: liveStocks.filter((s) => ["META", "GOOGL"].includes(s.symbol)).map((s) => s.changePercent),
    realEstate: [],
  };

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  return {
    technology: avg(sectorChanges.technology),
    semiconductors: avg(sectorChanges.semiconductors),
    healthcare: avg(sectorChanges.healthcare),
    financials: avg(sectorChanges.financials),
    industrials: avg(sectorChanges.industrials),
    energy: avg(sectorChanges.energy),
    utilities: avg(sectorChanges.utilities),
    consumer: avg(sectorChanges.consumer),
    communication: avg(sectorChanges.communication),
    realEstate: avg(sectorChanges.realEstate),
    meta: { status: "live", source: "Derived from Twelve Data", timestamp, lastUpdated: timestamp },
  };
}

function deriveMovers(liveStocks: US100MegaCapStock[], timestamp: string): US100Movers {
  const gainers = [...liveStocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
  const losers = [...liveStocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
  const actives = [...liveStocks].sort((a, b) => b.volume - a.volume).slice(0, 10);

  const mapMover = (s: US100MegaCapStock): US100MarketMover => ({
    symbol: s.symbol,
    name: s.name,
    price: s.price,
    change: s.change,
    changePercent: s.changePercent,
    volume: s.volume,
  });

  return {
    topGainers: gainers.map(mapMover),
    topLosers: losers.map(mapMover),
    mostActive: actives.map(mapMover),
    meta: { status: "live", source: "Derived from Twelve Data", timestamp, lastUpdated: timestamp },
  };
}

function deriveVolatility(liveStocks: US100MegaCapStock[], timestamp: string): US100Volatility {
  const avgRange = liveStocks.reduce((sum, s) => {
    if (s.previousClose > 0) return sum + ((s.high - s.low) / s.previousClose) * 100;
    return sum;
  }, 0) / liveStocks.length;

  const avgAbsoluteChange = liveStocks.reduce((sum, s) => sum + Math.abs(s.changePercent), 0) / liveStocks.length;
  const vixProxy = avgAbsoluteChange * 10 + avgRange;
  const trend = vixProxy > 25 ? "Elevated" : vixProxy <= 12 ? "Low" : "Normal";
  const riskRating = vixProxy > 35 ? "Extreme" : vixProxy > 25 ? "High" : vixProxy > 15 ? "Moderate" : "Low";

  return {
    vix: vixProxy,
    vixChange: null,
    vixChangePercent: null,
    vxn: vixProxy * 1.05,
    vxnChange: null,
    vxnChangePercent: null,
    trend: trend as US100Volatility["trend"],
    riskRating: riskRating as US100Volatility["riskRating"],
    meta: { status: "live", source: "Derived from Twelve Data", timestamp, lastUpdated: timestamp },
  };
}

function deriveMarketBreadth(liveStocks: US100MegaCapStock[], timestamp: string): US100MarketBreadth {
  const bullishCount = liveStocks.filter((s) => s.changePercent > 0.5).length;
  const bearishCount = liveStocks.filter((s) => s.changePercent < -0.5).length;
  const total = liveStocks.length;
  const advanceDecline = `${bullishCount}-${bearishCount}`;

  const newHighs = liveStocks.filter((s) => s.changePercent >= 1.0).length;
  const newLows = liveStocks.filter((s) => s.changePercent <= -1.0).length;
  const breadthScore = total > 0 ? Math.round((bullishCount / total) * 100) : 0;

  let overallHealth: US100MarketBreadth["overallHealth"];
  if (breadthScore >= 70) overallHealth = "Healthy";
  else if (breadthScore >= 50) overallHealth = "Mixed";
  else if (breadthScore >= 30) overallHealth = "Weak";
  else overallHealth = "Critical";

  return {
    advanceDecline,
    newHighs,
    newLows,
    breadthScore,
    overallHealth,
    meta: { status: "live", source: "Derived from Twelve Data", timestamp, lastUpdated: timestamp },
  };
}
