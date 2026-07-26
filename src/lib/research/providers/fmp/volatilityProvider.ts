import type { US100Volatility, US100DataMeta } from "@/types/us100";
import { fmpFetch, nowISO, FMPError } from "./fmpClient";

interface FMPQuote {
  symbol: string;
  price: number;
  change: number;
  changesPercentage: number;
}

export async function fetchUS100Volatility(): Promise<US100Volatility> {
  const timestamp = nowISO();

  try {
    const data = await fmpFetch<FMPQuote[]>("/quote", {
      symbol: "^VIX,^VXN",
    });

    if (!Array.isArray(data)) return buildUnavailableVolatility(timestamp, "No data returned");

    const quoteMap = new Map<string, FMPQuote>();
    for (const q of data) quoteMap.set(q.symbol, q);

    const vixQuote = quoteMap.get("^VIX");
    const vxnQuote = quoteMap.get("^VXN");

    const vix = vixQuote?.price ?? null;
    const vxn = vxnQuote?.price ?? null;

    return {
      vix,
      vixChange: vixQuote?.change ?? null,
      vixChangePercent: vixQuote?.changesPercentage ?? null,
      vxn,
      vxnChange: vxnQuote?.change ?? null,
      vxnChangePercent: vxnQuote?.changesPercentage ?? null,
      trend: deriveTrend(vix),
      riskRating: deriveRiskRating(vix),
      meta: buildMeta("live", "FMP", timestamp),
    };
  } catch (err) {
    const message = err instanceof FMPError ? err.message : err instanceof Error ? err.message : "Unknown error";
    return buildUnavailableVolatility(timestamp, message);
  }
}

function deriveTrend(vix: number | null): US100Volatility["trend"] {
  if (vix === null) return "Normal";
  if (vix >= 25) return "Elevated";
  if (vix <= 12) return "Low";
  return "Normal";
}

function deriveRiskRating(vix: number | null): US100Volatility["riskRating"] {
  if (vix === null) return "Moderate";
  if (vix >= 35) return "Extreme";
  if (vix >= 25) return "High";
  if (vix >= 15) return "Moderate";
  return "Low";
}

function buildUnavailableVolatility(timestamp: string, error: string): US100Volatility {
  return {
    vix: null, vixChange: null, vixChangePercent: null,
    vxn: null, vxnChange: null, vxnChangePercent: null,
    trend: "Normal", riskRating: "Moderate",
    meta: { status: "unavailable", source: "FMP", timestamp, lastUpdated: timestamp, error },
  };
}

function buildMeta(status: US100DataMeta["status"], source: string, timestamp: string): US100DataMeta {
  return { status, source, timestamp, lastUpdated: timestamp };
}
