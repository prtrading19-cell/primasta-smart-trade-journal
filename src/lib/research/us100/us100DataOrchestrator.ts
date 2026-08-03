import type {
  US100Index,
  US100MegaCapStock,
  US100Earnings,
  US100SectorPerformance,
  US100Movers,
  US100Volatility,
  US100CompanyProfile,
  US100MarketBreadth,
  US100DataMeta,
} from "@/types/us100";
import type { SectorData, VolatilityData, BreadthData, MacroData, ETFData, COTReportData, OpenInterestRecord } from "@/types/institutional";

export interface US100FullDataset {
  index: US100Index;
  stocks: US100MegaCapStock[];
  earnings: US100Earnings[];
  sectors: US100SectorPerformance;
  movers: US100Movers;
  volatility: US100Volatility;
  profiles: US100CompanyProfile[];
  marketBreadth: US100MarketBreadth;
  derivedIndex: US100Index;
  sectorRotation?: SectorData;
  volatilityInstitutional?: VolatilityData;
  breadth?: BreadthData[];
  macro?: MacroData;
  etf?: ETFData;
  cot?: COTReportData[];
  openInterest?: OpenInterestRecord[];
  collectedAt: string;
  sourceSummary: string[];
  errors: string[];
}

const COLLECT_TIMEOUT_MS = 45000;

export async function collectUS100Data(): Promise<US100FullDataset> {
  const startTime = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), COLLECT_TIMEOUT_MS);

  try {
    const response = await fetch("/api/us100/data", {
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.log(
        `[US100 Data] Status: ERROR | HTTP: ${response.status} | Duration: ${durationMs}ms | Body: ${body.slice(0, 200)}`
      );
      return buildFallbackDataset(new Date().toISOString(), `HTTP ${response.status}: ${body.slice(0, 100)}`);
    }

    const dataset: US100FullDataset = await response.json();

    console.log(
      `[US100 Data] Status: OK | Sources: ${dataset.sourceSummary.length} | Errors: ${dataset.errors.length} | Duration: ${durationMs}ms`
    );

    if (dataset.errors.length > 0) {
      for (const err of dataset.errors) {
        console.log(`[US100 Data] Provider Error: ${err}`);
      }
    }

    return dataset;
  } catch (err) {
    clearTimeout(timeout);
    const durationMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : "Unknown error";

    let statusLabel = "ERROR";
    if (message.includes("AbortError") || message.includes("timed out")) statusLabel = "TIMEOUT";
    else if (message.includes("Failed to fetch") || message.includes("NetworkError")) statusLabel = "NETWORK_ERROR";

    console.log(
      `[US100 Data] Status: ${statusLabel} | Error: ${message} | Duration: ${durationMs}ms`
    );

    return buildFallbackDataset(new Date().toISOString(), message);
  }
}

function buildFallbackDataset(ts: string, error: string): US100FullDataset {
  return {
    index: {
      symbol: "^NDX", name: "NASDAQ-100", price: 0, change: 0, changePercent: 0,
      open: 0, high: 0, low: 0, previousClose: 0, volume: 0, timestamp: ts,
      meta: { status: "unavailable", source: "FMP", timestamp: ts, lastUpdated: ts, error },
    },
    stocks: [],
    earnings: [],
    sectors: {
      technology: 0, semiconductors: 0, healthcare: 0, financials: 0,
      industrials: 0, energy: 0, utilities: 0, consumer: 0, communication: 0, realEstate: 0,
      meta: { status: "unavailable", source: "FMP", timestamp: ts, lastUpdated: ts, error },
    },
    movers: {
      topGainers: [], topLosers: [], mostActive: [],
      meta: { status: "unavailable", source: "FMP", timestamp: ts, lastUpdated: ts, error },
    },
    volatility: {
      vix: null, vixChange: null, vixChangePercent: null,
      vxn: null, vxnChange: null, vxnChangePercent: null,
      trend: "Normal", riskRating: "Moderate",
      meta: { status: "unavailable", source: "FMP", timestamp: ts, lastUpdated: ts, error },
    },
    profiles: [],
    marketBreadth: {
      advanceDecline: "0-0",
      newHighs: 0,
      newLows: 0,
      breadthScore: 0,
      overallHealth: "Critical",
      meta: { status: "unavailable", source: "composite", timestamp: ts, lastUpdated: ts, error },
    },
    derivedIndex: {
      symbol: "^NDX", name: "NASDAQ-100", price: 0, change: 0, changePercent: 0,
      open: 0, high: 0, low: 0, previousClose: 0, volume: 0, timestamp: ts,
      meta: { status: "unavailable", source: "composite", timestamp: ts, lastUpdated: ts, error },
    },
    collectedAt: ts,
    sourceSummary: [],
    errors: [error],
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
  const sectorRotation = dataset.sectorRotation;
  if (sectorRotation && sectorRotation.meta.status === "live") {
    for (const s of sectorRotation.sectors) {
      const dir = s.changePercent >= 0 ? "+" : "";
      lines.push(`${s.sector}: ${dir}${s.changePercent.toFixed(2)}% (${s.etf})`);
    }
    lines.push(`Strongest: ${sectorRotation.strongest} | Weakest: ${sectorRotation.weakest}`);
  } else if (dataset.sectors.meta.status === "live") {
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
  const volInst = dataset.volatilityInstitutional;
  if (volInst && volInst.meta.status === "live") {
    lines.push(`VIX: ${volInst.vix ?? "N/A"} (${volInst.vixChange !== null ? (volInst.vixChange >= 0 ? "+" : "") + volInst.vixChange.toFixed(2) : "N/A"})`);
    lines.push(`VXN: ${volInst.vxn ?? "N/A"} (${volInst.vxnChange !== null ? (volInst.vxnChange >= 0 ? "+" : "") + volInst.vxnChange.toFixed(2) : "N/A"})`);
    lines.push(`GVZ: ${volInst.gvz ?? "N/A"} (${volInst.gvzChange !== null ? (volInst.gvzChange >= 0 ? "+" : "") + volInst.gvzChange.toFixed(2) : "N/A"})`);
    lines.push(`Trend: ${volInst.trend} | Risk Rating: ${volInst.riskRating}`);
  } else if (dataset.volatility.meta.status === "live") {
    const v = dataset.volatility;
    lines.push(`VIX: ${v.vix ?? "N/A"} (${v.vixChange !== null ? (v.vixChange >= 0 ? "+" : "") + v.vixChange.toFixed(2) : "N/A"})`);
    lines.push(`VXN: ${v.vxn ?? "N/A"} (${v.vxnChange !== null ? (v.vxnChange >= 0 ? "+" : "") + v.vxnChange.toFixed(2) : "N/A"})`);
    lines.push(`Trend: ${v.trend} | Risk Rating: ${v.riskRating}`);
  } else {
    lines.push("Live Data Unavailable — Volatility data not received.");
  }
  lines.push("");

  lines.push("## INSTITUTIONAL DATA");
  if (dataset.cot && dataset.cot.length > 0) {
    lines.push("COT Positioning:");
    for (const c of dataset.cot) {
      if (c.meta.status === "live") {
        lines.push(`  ${c.contractName} | Commercials: ${c.commercials.netLong >= 0 ? "+" : ""}${c.commercials.netLong} | Non-Commercials: ${c.nonCommercials.netLong >= 0 ? "+" : ""}${c.nonCommercials.netLong} | OI: ${c.totalOpenInterest}`);
      }
    }
  } else {
    lines.push("COT Positioning: Live Data Unavailable");
  }

  if (dataset.etf && dataset.etf.meta.status === "live") {
    lines.push("ETF Flows:");
    for (const h of dataset.etf.etfs) {
      lines.push(`  ${h.symbol} | Direction: ${h.flowDirection} | Assets: $${(h.totalAssets / 1e9).toFixed(2)}B`);
    }
  } else {
    lines.push("ETF Flows: Live Data Unavailable");
  }

  if (dataset.openInterest && dataset.openInterest.length > 0) {
    lines.push("Open Interest:");
    for (const oi of dataset.openInterest) {
      if (oi.meta.status === "live") {
        lines.push(`  ${oi.contractName} | OI: ${oi.currentLevel} | Change: ${oi.changeFromPrevious >= 0 ? "+" : ""}${oi.changeFromPrevious} | Trend: ${oi.trend}`);
      }
    }
  } else {
    lines.push("Open Interest: Live Data Unavailable");
  }

  if (dataset.macro && dataset.macro.meta.status === "live") {
    lines.push("Macro Indicators:");
    for (const ind of dataset.macro.indicators) {
      const dir = ind.change >= 0 ? "+" : "";
      lines.push(`  ${ind.name}: ${ind.value} (${dir}${ind.change}) | Trend: ${ind.trend} | Impact: ${ind.impact}`);
    }
  } else {
    lines.push("Macro Indicators: Live Data Unavailable");
  }

  if (dataset.breadth && dataset.breadth.length > 0) {
    lines.push("Market Breadth:");
    for (const b of dataset.breadth) {
      if (b.meta.status === "live") {
        lines.push(`  ${b.exchange} | Advances: ${b.advances} | Declines: ${b.declines} | A/D: ${b.aDRatio} | Score: ${b.breadthScore}`);
      }
    }
  } else {
    lines.push("Market Breadth: Live Data Unavailable");
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
