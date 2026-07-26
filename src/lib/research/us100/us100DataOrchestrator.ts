import type {
  US100Index,
  US100MegaCapStock,
  US100Earnings,
  US100SectorPerformance,
  US100Movers,
  US100Volatility,
  US100CompanyProfile,
  US100DataMeta,
} from "@/types/us100";
import { fetchUS100Index } from "../providers/fmp/marketIndexProvider";
import { fetchUS100StockQuotes } from "../providers/twelvedata/stockQuotesProvider";
import { fetchUS100Earnings } from "../providers/fmp/earningsProvider";
import { fetchUS100Sectors } from "../providers/fmp/sectorProvider";
import { fetchUS100Movers } from "../providers/fmp/marketMoversProvider";
import { fetchUS100Volatility } from "../providers/fmp/volatilityProvider";
import { fetchUS100CompanyProfiles } from "../providers/fmp/companyProfileProvider";

export interface US100FullDataset {
  index: US100Index;
  stocks: US100MegaCapStock[];
  earnings: US100Earnings[];
  sectors: US100SectorPerformance;
  movers: US100Movers;
  volatility: US100Volatility;
  profiles: US100CompanyProfile[];
  collectedAt: string;
  sourceSummary: string[];
  errors: string[];
}

export async function collectUS100Data(): Promise<US100FullDataset> {
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

  const index = indexResult.data ?? buildFallbackIndex(collectedAt);
  const stocks = stocksResult.data ?? [];
  const earnings = earningsResult.data ?? [];
  const sectors = sectorsResult.data ?? buildFallbackSectors(collectedAt);
  const movers = moversResult.data ?? buildFallbackMovers(collectedAt);
  const volatility = volatilityResult.data ?? buildFallbackVolatility(collectedAt);
  const profiles = profilesResult.data ?? [];

  return {
    index,
    stocks,
    earnings,
    sectors,
    movers,
    volatility,
    profiles,
    collectedAt,
    sourceSummary,
    errors,
  };
}

export function buildUS100AIContext(dataset: US100FullDataset): string {
  const lines: string[] = [];
  const ts = dataset.collectedAt;

  lines.push(`US100 RESEARCH DATA — Collected: ${ts}`);
  lines.push(`Sources: ${dataset.sourceSummary.join(", ") || "None"}`);
  if (dataset.errors.length > 0) {
    lines.push(`Errors: ${dataset.errors.join("; ")}`);
  }
  lines.push("");

  lines.push("## MARKET OVERVIEW");
  const idx = dataset.index;
  if (idx.meta.status === "live") {
    lines.push(`US100 (NASDAQ-100): ${idx.price}`);
    lines.push(`Change: ${idx.change >= 0 ? "+" : ""}${idx.change.toFixed(2)} (${idx.changePercent >= 0 ? "+" : ""}${idx.changePercent.toFixed(2)}%)`);
    lines.push(`Open: ${idx.open} | High: ${idx.high} | Low: ${idx.low}`);
    lines.push(`Previous Close: ${idx.previousClose} | Volume: ${idx.volume}`);
  } else {
    lines.push(`US100 (NASDAQ-100): Live Data Unavailable`);
    lines.push(`Reason: ${idx.meta.error || "Provider unavailable"}`);
  }
  lines.push("");

  lines.push("## MEGA CAP LEADERSHIP");
  if (dataset.stocks.length > 0) {
    for (const s of dataset.stocks) {
      if (s.meta.status === "live") {
        const dir = s.changePercent >= 0 ? "+" : "";
        lines.push(`${s.symbol}: $${s.price.toFixed(2)} (${dir}${s.changePercent.toFixed(2)}%) Vol:${formatVolume(s.volume)}`);
      } else {
        lines.push(`${s.symbol}: Live Data Unavailable`);
      }
    }
  } else {
    lines.push("Live Data Unavailable — No stock quote data received.");
  }
  lines.push("");

  lines.push("## SECTOR ROTATION");
  if (dataset.sectors.meta.status === "live") {
    const s = dataset.sectors;
    const sectorEntries: [string, number][] = [
      ["Technology", s.technology], ["Semiconductors", s.semiconductors],
      ["Healthcare", s.healthcare], ["Financials", s.financials],
      ["Industrials", s.industrials], ["Energy", s.energy],
      ["Utilities", s.utilities], ["Consumer", s.consumer],
      ["Communication", s.communication],
    ];
    for (const [name, change] of sectorEntries) {
      const dir = change >= 0 ? "+" : "";
      lines.push(`${name}: ${dir}${change.toFixed(2)}%`);
    }
  } else {
    lines.push("Live Data Unavailable — Sector data not received.");
  }
  lines.push("");

  lines.push("## CORPORATE EARNINGS");
  const upcomingEarnings = dataset.earnings.filter((e) => e.earningsDate && e.meta.status === "live");
  if (upcomingEarnings.length > 0) {
    for (const e of upcomingEarnings.slice(0, 10)) {
      lines.push(`${e.symbol}: ${e.earningsDate} | Est EPS: ${e.estimateEPS ?? "N/A"} | Prev EPS: ${e.previousEPS ?? "N/A"} | Impact: ${e.importance}`);
    }
  } else {
    lines.push("No upcoming earnings data available.");
  }
  lines.push("");

  lines.push("## MARKET MOVERS");
  if (dataset.movers.meta.status === "live") {
    lines.push("Top Gainers:");
    for (const m of dataset.movers.topGainers.slice(0, 5)) {
      lines.push(`  ${m.symbol}: +${m.changePercent.toFixed(2)}% ($${m.price.toFixed(2)})`);
    }
    lines.push("Top Losers:");
    for (const m of dataset.movers.topLosers.slice(0, 5)) {
      lines.push(`  ${m.symbol}: ${m.changePercent.toFixed(2)}% ($${m.price.toFixed(2)})`);
    }
    lines.push("Most Active:");
    for (const m of dataset.movers.mostActive.slice(0, 5)) {
      lines.push(`  ${m.symbol}: Vol ${formatVolume(m.volume)} (${m.changePercent >= 0 ? "+" : ""}${m.changePercent.toFixed(2)}%)`);
    }
  } else {
    lines.push("Live Data Unavailable — Market movers not received.");
  }
  lines.push("");

  lines.push("## VOLATILITY");
  if (dataset.volatility.meta.status === "live") {
    const v = dataset.volatility;
    lines.push(`VIX: ${v.vix ?? "N/A"} (${v.vixChange !== null ? (v.vixChange >= 0 ? "+" : "") + v.vixChange.toFixed(2) : "N/A"})`);
    lines.push(`VXN: ${v.vxn ?? "N/A"} (${v.vxnChange !== null ? (v.vxnChange >= 0 ? "+" : "") + v.vxnChange.toFixed(2) : "N/A"})`);
    lines.push(`Trend: ${v.trend} | Risk Rating: ${v.riskRating}`);
  } else {
    lines.push("Live Data Unavailable — Volatility data not received.");
  }
  lines.push("");

  lines.push("## COMPANY PROFILES");
  if (dataset.profiles.length > 0) {
    for (const p of dataset.profiles) {
      if (p.meta.status === "live") {
        lines.push(`${p.symbol}: ${p.name} | Sector: ${p.sector} | Industry: ${p.industry} | CEO: ${p.ceo || "N/A"}`);
      }
    }
  } else {
    lines.push("Live Data Unavailable — Company profiles not received.");
  }
  lines.push("");

  lines.push("## INSTITUTIONAL NOTES");
  lines.push("AI analysis must use only the data provided above.");
  lines.push("If data is marked 'Live Data Unavailable', set that field accordingly.");
  lines.push("Do not search the internet. Do not fabricate data.");

  return lines.join("\n");
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function buildFallbackIndex(ts: string): US100Index {
  return {
    symbol: "^NDX", name: "NASDAQ-100", price: 0, change: 0, changePercent: 0,
    open: 0, high: 0, low: 0, previousClose: 0, volume: 0, timestamp: ts,
    meta: { status: "unavailable", source: "FMP", timestamp: ts, lastUpdated: ts, error: "Provider unavailable" },
  };
}

function buildFallbackSectors(ts: string): US100SectorPerformance {
  return {
    technology: 0, semiconductors: 0, healthcare: 0, financials: 0,
    industrials: 0, energy: 0, utilities: 0, consumer: 0, communication: 0, realEstate: 0,
    meta: { status: "unavailable", source: "FMP", timestamp: ts, lastUpdated: ts, error: "Provider unavailable" },
  };
}

function buildFallbackMovers(ts: string): US100Movers {
  return {
    topGainers: [], topLosers: [], mostActive: [],
    meta: { status: "unavailable", source: "FMP", timestamp: ts, lastUpdated: ts, error: "Provider unavailable" },
  };
}

function buildFallbackVolatility(ts: string): US100Volatility {
  return {
    vix: null, vixChange: null, vixChangePercent: null,
    vxn: null, vxnChange: null, vxnChangePercent: null,
    trend: "Normal", riskRating: "Moderate",
    meta: { status: "unavailable", source: "FMP", timestamp: ts, lastUpdated: ts, error: "Provider unavailable" },
  };
}
