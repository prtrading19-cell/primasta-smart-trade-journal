import { NextResponse } from "next/server";
import { fetchUS100Index } from "@/lib/research/providers/fmp/marketIndexProvider";
import { fetchUS100StockQuotes } from "@/lib/research/providers/twelvedata/stockQuotesProvider";
import { fetchUS100Earnings } from "@/lib/research/providers/fmp/earningsProvider";
import { fetchUS100Sectors } from "@/lib/research/providers/fmp/sectorProvider";
import { fetchUS100Movers } from "@/lib/research/providers/fmp/marketMoversProvider";
import { fetchUS100Volatility } from "@/lib/research/providers/fmp/volatilityProvider";
import { fetchUS100CompanyProfiles } from "@/lib/research/providers/fmp/companyProfileProvider";
import type { US100FullDataset } from "@/lib/research/us100/us100DataOrchestrator";

export const dynamic = "force-dynamic";

export async function GET() {
  const collectedAt = new Date().toISOString();
  const errors: string[] = [];
  const sourceSummary: string[] = [];

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

  console.log("[API /api/us100/data] Starting data collection...");

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
    settle("Twelve Data Stocks", fetchUS100StockQuotes()),
    settle("FMP Earnings", fetchUS100Earnings()),
    settle("FMP Sectors", fetchUS100Sectors()),
    settle("FMP Movers", fetchUS100Movers()),
    settle("FMP Volatility", fetchUS100Volatility()),
    settle("FMP Profiles", fetchUS100CompanyProfiles()),
  ]);

  const dataset: US100FullDataset = {
    index: indexResult.data ?? buildFallbackIndex(collectedAt),
    stocks: stocksResult.data ?? [],
    earnings: earningsResult.data ?? [],
    sectors: sectorsResult.data ?? buildFallbackSectors(collectedAt),
    movers: moversResult.data ?? buildFallbackMovers(collectedAt),
    volatility: volatilityResult.data ?? buildFallbackVolatility(collectedAt),
    profiles: profilesResult.data ?? [],
    collectedAt,
    sourceSummary,
    errors,
  };

  console.log(
    `[API /api/us100/data] Complete | Sources: ${sourceSummary.length} | Errors: ${errors.length}`
  );

  return NextResponse.json(dataset, {
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
