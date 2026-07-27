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
  const startTime = Date.now();

  try {
    const data = await fmpFetch<FMPQuote[]>("/quote", { symbol: "^VIX" });
    const durationMs = Date.now() - startTime;

    if (!Array.isArray(data)) {
      console.log(`[FMP Volatility] Endpoint: /quote (^VIX) | Status: NO_DATA | Duration: ${durationMs}ms`);
      return buildUnavailableVolatility(timestamp, "Response is not an array");
    }

    const quoteMap = new Map<string, FMPQuote>();
    for (const q of data) quoteMap.set(q.symbol, q);

    const vixQuote = quoteMap.get("^VIX");
    const vxnQuote = quoteMap.get("^VXN");

    const vix = vixQuote?.price ?? null;
    const vxn = vxnQuote?.price ?? null;

    const hasValidData = vix !== null || vxn !== null;
    const status = hasValidData ? "LIVE" : "NO_DATA";

    console.log(`[FMP Volatility] Endpoint: /quote (^VIX) | Status: ${status} | VIX: ${vix ?? "N/A"} | VXN: N/A (premium) | Duration: ${durationMs}ms`);

    return {
      vix,
      vixChange: vixQuote?.change ?? null,
      vixChangePercent: vixQuote?.changesPercentage ?? null,
      vxn,
      vxnChange: vxnQuote?.change ?? null,
      vxnChangePercent: vxnQuote?.changesPercentage ?? null,
      trend: deriveTrend(vix),
      riskRating: deriveRiskRating(vix),
      meta: buildMeta(status === "LIVE" ? "live" : "unavailable", "FMP", timestamp),
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof FMPError ? err.message : err instanceof Error ? err.message : "Unknown error";
    let statusLabel = "ERROR";
    if (message.includes("not configured")) statusLabel = "INVALID_KEY";
    else if (message.includes("Rate limited")) statusLabel = "RATE_LIMITED";
    console.log(`[FMP Volatility] Endpoint: /quote (^VIX) | Status: ${statusLabel} | Error: ${message} | Duration: ${durationMs}ms`);
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
