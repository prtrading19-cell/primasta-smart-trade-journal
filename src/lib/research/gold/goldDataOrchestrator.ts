import type { SectorData, VolatilityData, BreadthData, MacroData, ETFData, COTReportData, OpenInterestRecord } from "@/types/institutional";

export interface GoldFullDataset {
  goldPrice: number;
  goldChange: number;
  goldChangePercent: number;
  goldHigh: number;
  goldLow: number;
  goldOpen: number;
  goldPreviousClose: number;
  goldTimestamp: string;
  macro?: MacroData;
  volatilityInstitutional?: VolatilityData;
  sectorRotation?: SectorData;
  breadth?: BreadthData[];
  etf?: ETFData;
  cot?: COTReportData[];
  openInterest?: OpenInterestRecord[];
  collectedAt: string;
  sourceSummary: string[];
  errors: string[];
  meta: {
    source: string;
    status: "live" | "unavailable";
    timestamp: string;
    lastUpdated: string;
    error?: string;
  };
}

export async function collectGoldData(): Promise<GoldFullDataset> {
  const startTime = Date.now();
  console.log("[Gold Data] Fetching from /api/gold/data...");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch("/api/gold/data", {
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.log(`[Gold Data] Status: ERROR | HTTP: ${response.status} | Duration: ${durationMs}ms | Body: ${body.slice(0, 200)}`);
      return buildFallbackDataset(new Date().toISOString(), `HTTP ${response.status}: ${body.slice(0, 100)}`);
    }

    const dataset: GoldFullDataset = await response.json();
    console.log(`[Gold Data] Status: OK | Sources: ${dataset.sourceSummary.length} | Errors: ${dataset.errors.length} | Duration: ${durationMs}ms`);

    if (dataset.errors.length > 0) {
      for (const err of dataset.errors) {
        console.log(`[Gold Data] Provider Error: ${err}`);
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

    console.log(`[Gold Data] Status: ${statusLabel} | Error: ${message} | Duration: ${durationMs}ms`);
    return buildFallbackDataset(new Date().toISOString(), message);
  }
}

function buildFallbackDataset(ts: string, error: string): GoldFullDataset {
  return {
    goldPrice: 0, goldChange: 0, goldChangePercent: 0,
    goldHigh: 0, goldLow: 0, goldOpen: 0, goldPreviousClose: 0,
    goldTimestamp: ts,
    collectedAt: ts,
    sourceSummary: [],
    errors: [error],
    meta: { source: "composite", status: "unavailable", timestamp: ts, lastUpdated: ts, error },
  };
}

export function buildGoldAIContext(dataset: GoldFullDataset): string {
  const lines: string[] = [];
  const ts = dataset.collectedAt;

  lines.push(`GOLD RESEARCH DATA — Collected: ${ts}`);
  lines.push(`Sources: ${dataset.sourceSummary.join(", ") || "None"}`);
  if (dataset.errors.length > 0) {
    lines.push(`Errors: ${dataset.errors.join("; ")}`);
  }
  lines.push("");

  lines.push("## GOLD PRICE");
  if (dataset.meta.status === "live") {
    const dir = dataset.goldChange >= 0 ? "+" : "";
    lines.push(`XAU/USD: $${dataset.goldPrice.toFixed(2)} (${dir}${dataset.goldChange.toFixed(2)} / ${dir}${dataset.goldChangePercent.toFixed(2)}%)`);
    lines.push(`Open: ${dataset.goldOpen.toFixed(2)} | High: ${dataset.goldHigh.toFixed(2)} | Low: ${dataset.goldLow.toFixed(2)} | Prev Close: ${dataset.goldPreviousClose.toFixed(2)}`);
  } else {
    lines.push("XAU/USD: Live Data Unavailable");
  }
  lines.push("");

  lines.push("## MACRO");
  if (dataset.macro && dataset.macro.meta.status === "live") {
    for (const ind of dataset.macro.indicators) {
      const dir = ind.change >= 0 ? "+" : "";
      lines.push(`  ${ind.name}: ${ind.value} (${dir}${ind.change}) | Trend: ${ind.trend} | Impact: ${ind.impact}`);
    }
  } else {
    lines.push("Macro Indicators: Live Data Unavailable");
  }
  lines.push("");

  lines.push("## VOLATILITY");
  if (dataset.volatilityInstitutional && dataset.volatilityInstitutional.meta.status === "live") {
    const v = dataset.volatilityInstitutional;
    lines.push(`GVZ: ${v.gvz ?? "N/A"} (${v.gvzChange !== null ? (v.gvzChange >= 0 ? "+" : "") + v.gvzChange.toFixed(2) : "N/A"})`);
    lines.push(`VIX: ${v.vix ?? "N/A"} | Trend: ${v.trend} | Risk: ${v.riskRating}`);
  } else {
    lines.push("Volatility Data: Live Data Unavailable");
  }
  lines.push("");

  lines.push("## SECTOR ROTATION");
  if (dataset.sectorRotation && dataset.sectorRotation.meta.status === "live") {
    for (const s of dataset.sectorRotation.sectors) {
      const dir = s.changePercent >= 0 ? "+" : "";
      lines.push(`  ${s.sector}: ${dir}${s.changePercent.toFixed(2)}% (${s.etf})`);
    }
    lines.push(`Strongest: ${dataset.sectorRotation.strongest} | Weakest: ${dataset.sectorRotation.weakest}`);
  } else {
    lines.push("Sector Rotation: Live Data Unavailable");
  }
  lines.push("");

  lines.push("## MARKET BREADTH");
  if (dataset.breadth && dataset.breadth.length > 0) {
    for (const b of dataset.breadth) {
      if (b.meta.status === "live") {
        lines.push(`  ${b.exchange} | Advances: ${b.advances} | Declines: ${b.declines} | A/D: ${b.aDRatio} | Score: ${b.breadthScore}`);
      }
    }
  } else {
    lines.push("Market Breadth: Live Data Unavailable");
  }
  lines.push("");

  lines.push("## INSTITUTIONAL DATA");
  if (dataset.etf && dataset.etf.meta.status === "live") {
    lines.push("ETF Flows:");
    for (const h of dataset.etf.etfs) {
      lines.push(`  ${h.symbol} | Direction: ${h.flowDirection} | Assets: $${(h.totalAssets / 1e9).toFixed(2)}B`);
    }
  } else {
    lines.push("ETF Flows: Live Data Unavailable");
  }

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
  lines.push("");

  lines.push("## NOTES");
  lines.push("AI analysis must use only the data provided above.");
  lines.push("If data is marked 'Live Data Unavailable', set that field accordingly.");
  lines.push("Do not search the internet. Do not fabricate data.");

  return lines.join("\n");
}
