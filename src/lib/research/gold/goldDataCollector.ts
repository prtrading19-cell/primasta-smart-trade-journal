import type { GoldFullDataset } from "./goldDataOrchestrator";
import { RequestManager } from "../infrastructure/RequestManager";
import { initializeProviderRegistry } from "../infrastructure/registerProviders";
import {
  executeCOTReport,
  executeETFData,
  executeOpenInterest,
  executeMarketBreadth,
  executeSectorData,
  executeVolatilityData,
  executeMacroData,
} from "../infrastructure/ProviderExecution";
import { applySnapshotFallback } from "../infrastructure/snapshotFallback";
import { ProviderCache } from "../infrastructure/ProviderCache";

const FETCH_TIMEOUT_MS = 8000;

async function fetchGoldPriceThroughManager(): Promise<{ price: number; change: number; changePercent: number; high: number; low: number; open: number; previousClose: number } | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://api.twelvedata.com/quote?symbol=XAU/USD&apikey=${apiKey}`;
    const response = await RequestManager.getInstance().fetch(url, "gold-price-twelve", {
      timeoutMs: FETCH_TIMEOUT_MS,
    });

    if (!response.ok) return null;

    const raw = await response.json();
    const price = parseFloat(raw.close ?? raw.price);
    if (isNaN(price)) return null;

    return {
      price,
      change: parseFloat(raw.change) || 0,
      changePercent: parseFloat(raw.percent_change) || 0,
      high: parseFloat(raw.high) || price,
      low: parseFloat(raw.low) || price,
      open: parseFloat(raw.open) || price,
      previousClose: parseFloat(raw.previous_close) || price,
    };
  } catch {
    return null;
  }
}

export async function collectGoldFullDataset(): Promise<GoldFullDataset> {
  initializeProviderRegistry();
  const collectedAt = new Date().toISOString();
  const errors: string[] = [];
  const sourceSummary: string[] = [];

  const settleProvider = <T>(label: string, providerId: string, promise: Promise<T | null>, isLive: (data: T) => boolean): Promise<T | null> =>
    promise
      .then((result) => {
        if (result !== null && isLive(result)) {
          sourceSummary.push(label);
          return result;
        }
        const fb = applySnapshotFallback<T>(providerId, result, isLive, `${label} provider limited`);
        if (fb.fromSnapshot && fb.value) {
          sourceSummary.push(`${label} (cached snapshot)`);
          return fb.value;
        }
        errors.push(`${label}: unavailable`);
        return null;
      })
      .catch((err) => {
        errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      });

  const settleInstitutional = <T>(label: string, providerId: string, promise: Promise<{ success: boolean; data: T | null; error?: string }>, isLive: (result: { success: boolean; data: T | null }) => boolean): Promise<T | null> =>
    promise
      .then((result) => {
        const fb = applySnapshotFallback(providerId, result, isLive, `${label} provider limited`);
        if (fb.fromSnapshot && fb.value) {
          sourceSummary.push(`${label} (cached snapshot)`);
          return fb.value as T;
        }
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

  const [goldPriceResult, cotResult, etfResult, oiResult, breadthResult, sectorResult, volResult, macroResult] = await Promise.all([
    fetchGoldPriceThroughManager().then((data) => {
      if (data) {
        sourceSummary.push("TwelveData Gold");
        return data;
      }
      const cached = ProviderCache.getInstance().getLastKnownGood<{ data: { price: number; change: number; changePercent: number } }>("exec:gold-price-twelve");
      const snap = cached.hit ? cached.data?.data : undefined;
      if (snap && snap.price > 0) {
        sourceSummary.push("TwelveData Gold (cached snapshot)");
        return {
          price: snap.price,
          change: snap.change ?? 0,
          changePercent: snap.changePercent ?? 0,
          high: snap.price,
          low: snap.price,
          open: snap.price,
          previousClose: snap.price,
        };
      }
      errors.push("TwelveData Gold: unavailable");
      return null;
    }),
    settleInstitutional("COT", "cot-institutional", executeCOTReport(), (r) => r.success && r.data !== null),
    settleInstitutional("ETF", "etf-institutional", executeETFData(), (r) => r.success && r.data !== null),
    settleInstitutional("Open Interest", "open-interest-institutional", executeOpenInterest(), (r) => r.success && r.data !== null),
    settleInstitutional("Market Breadth", "breadth-institutional", executeMarketBreadth(), (r) => r.success && r.data !== null),
    settleInstitutional("Sector Rotation", "sectors-institutional", executeSectorData(), (r) => r.success && r.data !== null),
    settleInstitutional("Volatility", "volatility-institutional", executeVolatilityData(), (r) => r.success && r.data !== null),
    settleInstitutional("Macro", "macro-institutional", executeMacroData(), (r) => r.success && r.data !== null),
  ]);

  const goldLive = goldPriceResult !== null;
  const dataset: GoldFullDataset = {
    goldPrice: goldPriceResult?.price ?? 0,
    goldChange: goldPriceResult?.change ?? 0,
    goldChangePercent: goldPriceResult?.changePercent ?? 0,
    goldHigh: goldPriceResult?.high ?? 0,
    goldLow: goldPriceResult?.low ?? 0,
    goldOpen: goldPriceResult?.open ?? 0,
    goldPreviousClose: goldPriceResult?.previousClose ?? 0,
    goldTimestamp: collectedAt,
    macro: macroResult ?? undefined,
    volatilityInstitutional: volResult ?? undefined,
    sectorRotation: sectorResult ?? undefined,
    breadth: breadthResult ?? undefined,
    etf: etfResult ?? undefined,
    cot: cotResult ?? undefined,
    openInterest: oiResult ?? undefined,
    collectedAt,
    sourceSummary,
    errors,
    meta: {
      source: "composite",
      status: goldLive ? "live" : "unavailable",
      timestamp: collectedAt,
      lastUpdated: collectedAt,
      error: goldLive ? undefined : "Gold price unavailable",
    },
  };

  return dataset;
}
