import { NextResponse } from "next/server";
import { getProfile } from "@/lib/research";
import { initializeProviderRegistry } from "@/lib/research/infrastructure/registerProviders";
import {
  executeUS100Index,
  executeStockQuotes,
  executeEarnings,
  executeUS100Sectors,
  executeUS100Movers,
  executeUS100Volatility,
  executeCompanyProfiles,
  executeCOTReport,
  executeETFData,
  executeOpenInterest,
  executeMarketBreadth,
  executeSectorData,
  executeVolatilityData,
  executeMacroData,
} from "@/lib/research/infrastructure/ProviderExecution";
import type { US100FullDataset } from "@/lib/research/us100/us100DataOrchestrator";
import type { US100Index, US100SectorPerformance, US100Movers, US100Volatility, US100MarketBreadth, US100MegaCapStock, US100MarketMover } from "@/types/us100";

export const dynamic = "force-dynamic";

export async function GET() {
  initializeProviderRegistry();
  const collectedAt = new Date().toISOString();
  const errors: string[] = [];
  const sourceSummary: string[] = [];

  const profile = getProfile("us100");
  const symbols = profile?.trackedSymbols ?? [];

  const settleProvider = <T>(label: string, promise: Promise<T>): Promise<{ data: T | null; error: string | null }> =>
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

  const settleInstitutional = <T>(label: string, promise: Promise<{ success: boolean; data: T | null; error?: string }>): Promise<T | null> =>
    promise
      .then((result) => {
        if (result.success && result.data !== null) {
          sourceSummary.push(label);
          return result.data;
        }
        errors.push(`${label}: ${result.error || "unavailable"}`);
        return null;
      })
      .catch((err) => {
        errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
        return null;
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
    cotResult,
    etfResult,
    oiResult,
    breadthResult,
    sectorRotationResult,
    volatilityInstResult,
    macroResult,
  ] = await Promise.all([
    settleProvider("FMP Index", executeUS100Index()),
    settleProvider("Twelve Data Stocks", executeStockQuotes(symbols)),
    settleProvider("FMP Earnings", executeEarnings(symbols)),
    settleProvider("FMP Sectors", executeUS100Sectors()),
    settleProvider("FMP Movers", executeUS100Movers()),
    settleProvider("FMP Volatility", executeUS100Volatility()),
    settleProvider("FMP Profiles", executeCompanyProfiles(symbols)),
    settleInstitutional("COT", executeCOTReport()),
    settleInstitutional("ETF", executeETFData()),
    settleInstitutional("Open Interest", executeOpenInterest()),
    settleInstitutional("Market Breadth", executeMarketBreadth()),
    settleInstitutional("Sector Rotation", executeSectorData()),
    settleInstitutional("Volatility", executeVolatilityData()),
    settleInstitutional("Macro", executeMacroData()),
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
    sectorRotation: sectorRotationResult ?? undefined,
    volatilityInstitutional: volatilityInstResult ?? undefined,
    breadth: breadthResult ?? undefined,
    macro: macroResult ?? undefined,
    etf: etfResult ?? undefined,
    cot: cotResult ?? undefined,
    openInterest: oiResult ?? undefined,
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
    meta: { status: "unavailable" as const, source: "composite", timestamp: ts, lastUpdated: ts, error: "Source data unavailable" },
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
    meta: { status: "unavailable" as const, source: "composite", timestamp: ts, lastUpdated: ts, error: "Source data unavailable" },
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
  const derivedIndex = liveStocks.length > 0 ? deriveIndex(liveStocks, dataset.collectedAt) : buildFallbackDerivedIndex(dataset.collectedAt);

  const enriched: EnrichedDataset = {
    ...dataset,
    index: dataset.index,
    sectors: dataset.sectors.meta.status === "live" ? dataset.sectors : deriveSectors(liveStocks, dataset.collectedAt),
    movers: dataset.movers.meta.status === "live" ? dataset.movers : deriveMovers(liveStocks, dataset.collectedAt),
    volatility: resolveVolatility(dataset),
    marketBreadth: resolveMarketBreadth(dataset),
    derivedIndex,
  };

  if (enriched.sectors.meta.source !== dataset.sectors.meta.source) {
    enriched.sourceSummary = [...enriched.sourceSummary, "Derived Twelve Data Sectors"];
  }
  if (enriched.movers.meta.source !== dataset.movers.meta.source) {
    enriched.sourceSummary = [...enriched.sourceSummary, "Derived Twelve Data Movers"];
  }

  return enriched;
}

function resolveVolatility(dataset: US100FullDataset): US100Volatility {
  if (dataset.volatility.meta.status === "live") return dataset.volatility;

  const volInst = dataset.volatilityInstitutional;
  if (volInst && volInst.meta.status === "live") {
    dataset.sourceSummary = [...dataset.sourceSummary, "Institutional Volatility Provider"];
    return {
      vix: volInst.vix,
      vixChange: volInst.vixChange,
      vixChangePercent: volInst.vixChangePercent,
      vxn: volInst.vxn,
      vxnChange: volInst.vxnChange,
      vxnChangePercent: volInst.vxnChangePercent,
      trend: volInst.trend,
      riskRating: volInst.riskRating,
      meta: { status: "live", source: volInst.meta.source, timestamp: dataset.collectedAt, lastUpdated: dataset.collectedAt },
    };
  }

  return buildFallbackVolatility(dataset.collectedAt);
}

function resolveMarketBreadth(dataset: US100FullDataset): US100MarketBreadth {
  if (dataset.marketBreadth.meta.status === "live") return dataset.marketBreadth;

  const breadthData = dataset.breadth;
  if (breadthData && breadthData.length > 0) {
    const liveEntries = breadthData.filter((b) => b.meta.status === "live");
    if (liveEntries.length > 0) {
      dataset.sourceSummary = [...dataset.sourceSummary, "Institutional Breadth Provider"];
      const primary = liveEntries.find((b) => b.exchange === "NASDAQ") || liveEntries[0];
      const score = primary.breadthScore;
      const health: US100MarketBreadth["overallHealth"] = score >= 70 ? "Healthy" : score >= 50 ? "Mixed" : score >= 30 ? "Weak" : "Critical";
      return {
        advanceDecline: `${primary.advances}-${primary.declines}`,
        newHighs: primary.newHighs,
        newLows: primary.newLows,
        breadthScore: score,
        overallHealth: health,
        meta: { status: "live", source: primary.meta.source, timestamp: dataset.collectedAt, lastUpdated: dataset.collectedAt },
      };
    }
  }

  return buildFallbackMarketBreadth(dataset.collectedAt);
}

function deriveIndex(liveStocks: US100MegaCapStock[], timestamp: string): US100Index {
  if (liveStocks.length === 0) {
    return {
      symbol: "^NDX",
      name: "NASDAQ-100 Composite (Derived)",
      price: 0,
      change: 0,
      changePercent: 0,
      open: 0,
      high: 0,
      low: 0,
      previousClose: 0,
      volume: 0,
      timestamp,
      meta: { status: "unavailable" as const, source: "Derived from Twelve Data", timestamp, lastUpdated: timestamp, error: "Source data unavailable" },
    };
  }

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
  if (liveStocks.length === 0) {
    return {
      technology: 0, semiconductors: 0, healthcare: 0, financials: 0,
      industrials: 0, energy: 0, utilities: 0, consumer: 0, communication: 0, realEstate: 0,
      meta: { status: "unavailable" as const, source: "Derived from Twelve Data", timestamp, lastUpdated: timestamp, error: "Source data unavailable" },
    };
  }

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
  if (liveStocks.length === 0) {
    return {
      topGainers: [], topLosers: [], mostActive: [],
      meta: { status: "unavailable" as const, source: "Derived from Twelve Data", timestamp, lastUpdated: timestamp, error: "Source data unavailable" },
    };
  }

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
