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

  const settleProvider = <T>(label: string, promise: Promise<T | null>): Promise<T | null> =>
    promise
      .then((result) => {
        if (result !== null) {
          sourceSummary.push(label);
          return result;
        }
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
      errors.push("TwelveData Gold: unavailable");
      return null;
    }),
    settleProvider("COT", executeCOTReport().then((r) => (r.success ? r.data : (errors.push(`COT: ${r.error || "unavailable"}`), null)))),
    settleProvider("ETF", executeETFData().then((r) => (r.success ? r.data : (errors.push(`ETF: ${r.error || "unavailable"}`), null)))),
    settleProvider("Open Interest", executeOpenInterest().then((r) => (r.success ? r.data : (errors.push(`Open Interest: ${r.error || "unavailable"}`), null)))),
    settleProvider("Market Breadth", executeMarketBreadth().then((r) => (r.success ? r.data : (errors.push(`Market Breadth: ${r.error || "unavailable"}`), null)))),
    settleProvider("Sector Rotation", executeSectorData().then((r) => (r.success ? r.data : (errors.push(`Sector Rotation: ${r.error || "unavailable"}`), null)))),
    settleProvider("Volatility", executeVolatilityData().then((r) => (r.success ? r.data : (errors.push(`Volatility: ${r.error || "unavailable"}`), null)))),
    settleProvider("Macro", executeMacroData().then((r) => (r.success ? r.data : (errors.push(`Macro: ${r.error || "unavailable"}`), null)))),
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
