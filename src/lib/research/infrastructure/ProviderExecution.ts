import type { ProviderResult } from "@/lib/research/providers/shared";
import type { VolatilityData, BreadthData, SectorData, MacroData, ETFData, COTReportData, OpenInterestRecord } from "@/types/institutional";
import { buildProviderMeta } from "@/types/institutional";
import type { US100Index, US100MegaCapStock, US100Earnings, US100SectorPerformance, US100Movers, US100Volatility, US100CompanyProfile } from "@/types/us100";
import { fetchCOTReport } from "../providers/cot/cftcProvider";
import { fetchETFData } from "../providers/etf/provider";
import { fetchOpenInterest } from "../providers/openInterest/provider";
import { fetchMarketBreadth } from "../providers/breadth/provider";
import { fetchSectorData } from "../providers/sectors/provider";
import { fetchVolatilityData } from "../providers/volatility/provider";
import { fetchMacroData } from "../providers/macro/provider";
import { fetchUS100Index } from "../providers/fmp/marketIndexProvider";
import { fetchStockQuotes } from "../providers/twelvedata/stockQuotesProvider";
import { fetchEarnings } from "../providers/fmp/earningsProvider";
import { fetchUS100Sectors } from "../providers/fmp/sectorProvider";
import { fetchUS100Movers } from "../providers/fmp/marketMoversProvider";
import { fetchUS100Volatility } from "../providers/fmp/volatilityProvider";
import { fetchCompanyProfiles } from "../providers/fmp/companyProfileProvider";

import { ProviderRegistry } from "./ProviderRegistry";
import { ProviderCache } from "./ProviderCache";
import { ProviderHealthEngine } from "./ProviderHealthEngine";
import { ProviderLogger } from "./ProviderLogger";
import { RequestManager } from "./RequestManager";

function getStartTime(): number {
  return Date.now();
}

function getElapsed(start: number): number {
  return Date.now() - start;
}

async function executeWithInfrastructure<T>(
  providerId: string,
  fn: () => Promise<T>,
  asset: string
): Promise<T> {
  const cache = ProviderCache.getInstance();
  const health = ProviderHealthEngine.getInstance();
  const logger = ProviderLogger.getInstance();
  const registry = ProviderRegistry.getInstance();
  const registration = registry.get(providerId);
  const startTime = getStartTime();
  const cacheKey = `exec:${providerId}`;

  const cached = cache.get<{ data: T }>(cacheKey);
  if (cached.hit) {
    const latency = getElapsed(startTime);
    logger.log({
      providerId,
      asset,
      timestamp: startTime,
      latency,
      success: true,
      failureReason: null,
      responseSize: 0,
      cacheHit: true,
      cacheMiss: false,
    });
    return (cached.data as { data: T }).data;
  }

  try {
    const result = await fn();
    const latency = getElapsed(startTime);

    const success = true;
    health.recordSuccess(providerId, latency);

    const ttl = registration?.cacheTtlMs ?? 60000;
    cache.set(cacheKey, { data: result }, ttl, providerId);

    logger.log({
      providerId,
      asset,
      timestamp: startTime,
      latency,
      success,
      failureReason: null,
      responseSize: 0,
      cacheHit: false,
      cacheMiss: true,
    });

    return result;
  } catch (err) {
    const latency = getElapsed(startTime);
    const errorMsg = err instanceof Error ? err.message : String(err);

    health.recordFailure(providerId, latency, errorMsg);

    logger.log({
      providerId,
      asset,
      timestamp: startTime,
      latency,
      success: false,
      failureReason: errorMsg,
      responseSize: 0,
      cacheHit: false,
      cacheMiss: true,
    });

    throw err;
  }
}

export async function executeCOTReport(markets?: Parameters<typeof fetchCOTReport>[0]): Promise<ProviderResult<COTReportData[]>> {
  return executeWithInfrastructure("cot-institutional", () => fetchCOTReport(markets), "gold,us100");
}

export async function executeETFData(markets?: Parameters<typeof fetchETFData>[0]): Promise<ProviderResult<ETFData>> {
  return executeWithInfrastructure("etf-institutional", () => fetchETFData(markets), "gold,us100");
}

export async function executeOpenInterest(markets?: Parameters<typeof fetchOpenInterest>[0]): Promise<ProviderResult<OpenInterestRecord[]>> {
  return executeWithInfrastructure("open-interest-institutional", () => fetchOpenInterest(markets), "gold,us100");
}

export async function executeMarketBreadth(markets?: Parameters<typeof fetchMarketBreadth>[0]): Promise<ProviderResult<BreadthData[]>> {
  return executeWithInfrastructure("breadth-institutional", () => fetchMarketBreadth(markets), "gold,us100");
}

export async function executeSectorData(config?: Parameters<typeof fetchSectorData>[0]): Promise<ProviderResult<SectorData>> {
  return executeWithInfrastructure("sectors-institutional", () => fetchSectorData(config), "gold,us100");
}

export async function executeVolatilityData(config?: Parameters<typeof fetchVolatilityData>[0]): Promise<ProviderResult<VolatilityData>> {
  return executeWithInfrastructure("volatility-institutional", () => fetchVolatilityData(config), "gold,us100");
}

export async function executeMacroData(config?: Parameters<typeof fetchMacroData>[0]): Promise<ProviderResult<MacroData>> {
  return executeWithInfrastructure("macro-institutional", () => fetchMacroData(config), "gold,us100");
}

export async function executeUS100Index(): Promise<US100Index> {
  return executeWithInfrastructure("market-index-fmp", () => fetchUS100Index(), "us100");
}

export async function executeStockQuotes(symbols: readonly string[]): Promise<US100MegaCapStock[]> {
  return executeWithInfrastructure("stock-quotes-twelve", () => fetchStockQuotes(symbols), "us100");
}

export async function executeEarnings(symbols: readonly string[]): Promise<US100Earnings[]> {
  return executeWithInfrastructure("earnings-fmp", () => fetchEarnings(symbols), "us100");
}

export async function executeUS100Sectors(): Promise<US100SectorPerformance> {
  return executeWithInfrastructure("sectors-fmp", () => fetchUS100Sectors(), "us100");
}

export async function executeUS100Movers(): Promise<US100Movers> {
  return executeWithInfrastructure("movers-fmp", () => fetchUS100Movers(), "us100");
}

export async function executeUS100Volatility(): Promise<US100Volatility> {
  return executeWithInfrastructure("volatility-fmp", () => fetchUS100Volatility(), "us100");
}

export async function executeCompanyProfiles(symbols: readonly string[]): Promise<US100CompanyProfile[]> {
  return executeWithInfrastructure("company-profiles-fmp", () => fetchCompanyProfiles(symbols), "us100");
}

const providerExecutors: Record<string, (params?: any) => Promise<any>> = {
  "cot-institutional": (params) => executeCOTReport(params?.markets),
  "etf-institutional": (params) => executeETFData(params?.markets),
  "open-interest-institutional": (params) => executeOpenInterest(params?.markets),
  "breadth-institutional": (params) => executeMarketBreadth(params?.markets),
  "sectors-institutional": (params) => executeSectorData(params?.config),
  "volatility-institutional": (params) => executeVolatilityData(params?.config),
  "macro-institutional": (params) => executeMacroData(params?.config),
  "market-index-fmp": () => executeUS100Index(),
  "stock-quotes-twelve": (params) => executeStockQuotes(params?.symbols ?? []),
  "earnings-fmp": (params) => executeEarnings(params?.symbols ?? []),
  "sectors-fmp": () => executeUS100Sectors(),
  "movers-fmp": () => executeUS100Movers(),
  "volatility-fmp": () => executeUS100Volatility(),
  "company-profiles-fmp": (params) => executeCompanyProfiles(params?.symbols ?? []),
  "gold-price-twelve": () => executeWithInfrastructure("gold-price-twelve", async () => {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) return null;
    const rm = RequestManager.getInstance();
    const response = await rm.fetch(
      `https://api.twelvedata.com/quote?symbol=XAU/USD&apikey=${apiKey}`,
      "gold-price-twelve",
      { timeoutMs: 8000 }
    );
    if (!response.ok) {
      const isLimitation = response.status === 429 || response.status === 403;
      if (isLimitation) {
        return {
          success: false,
          data: null,
          error: `Unavailable (Provider Limitation): Twelve Data rate limit (HTTP ${response.status})`,
          meta: buildProviderMeta("Twelve Data", "unavailable", `Unavailable (Provider Limitation): Twelve Data rate limit (HTTP ${response.status})`),
        };
      }
      return null;
    }
    const raw = await response.json();
    const price = parseFloat(raw.close ?? raw.price) || 0;
    return {
      price,
      change: parseFloat(raw.change) || 0,
      changePercent: parseFloat(raw.percent_change) || 0,
      meta: buildProviderMeta("Twelve Data", "live"),
    };
  }, "gold"),
};

export async function executeProvider(providerId: string, params?: any): Promise<any> {
  const executor = providerExecutors[providerId];
  if (!executor) {
    throw new Error(`No executor registered for provider: ${providerId}`);
  }
  return executor(params);
}
