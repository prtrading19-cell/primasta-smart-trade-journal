import type { VolatilityData } from "@/types/institutional";
import {
  fetchWithTimeout,
  ProviderError,
  buildUnavailableResult,
  buildSuccessResult,
  toUnavailableResult,
  type ProviderResult,
} from "../shared";
import { parseVolResponse } from "./parser";
import { normalizeVolatility } from "./normalizer";
import { validateVolData } from "./validator";

const TD_BASE = "https://api.twelvedata.com";
const FETCH_TIMEOUT_MS = 10000;
const SOURCE = "TwelveData";

export interface VolMarketConfig {
  assetId: string;
  primarySymbol: string;
  fallbackSymbol?: string;
}

export const VOLATILITY_MARKETS: VolMarketConfig[] = [
  {
    assetId: "us100",
    primarySymbol: "VXN",
    fallbackSymbol: "VIX",
  },
  {
    assetId: "gold",
    primarySymbol: "GVZ",
  },
];

export async function fetchVolatilityData(
  config?: VolMarketConfig[]
): Promise<ProviderResult<VolatilityData>> {
  const targets = config ?? VOLATILITY_MARKETS;
  const timestamp = new Date().toISOString();

  try {
    const symbols = collectSymbols(targets);
    const raw = await tryFetchTDQuotes(symbols);
    const records = parseVolResponse(raw, timestamp);

    if (records.length === 0) {
      return buildUnavailableResult(SOURCE, "No volatility index quotes returned");
    }

    const normalized = normalizeVolatility(records, SOURCE);
    const validated = validateVolData(normalized);

    if (validated.valid && validated.data) {
      return buildSuccessResult(validated.data, SOURCE);
    }

    return buildUnavailableResult(SOURCE, validated.reason ?? "Volatility validation failed");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.log(`[Volatility Provider] ${SOURCE} failed: ${msg}`);
    return toUnavailableResult(SOURCE, err, "Volatility data unavailable");
  }
}

function collectSymbols(configs: VolMarketConfig[]): string[] {
  const set = new Set<string>();
  for (const c of configs) {
    set.add(c.primarySymbol);
    if (c.fallbackSymbol) set.add(c.fallbackSymbol);
  }
  return Array.from(set);
}

async function tryFetchTDQuotes(
  symbols: string[]
): Promise<unknown> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new ProviderError("TWELVE_DATA_API_KEY not configured", SOURCE);
  }

  const symbolList = symbols.join(",");
  const url = `${TD_BASE}/quote?symbol=${encodeURIComponent(symbolList)}&apikey=${apiKey}`;
  const response = await fetchWithTimeout(url, { timeout: FETCH_TIMEOUT_MS });

  if (!response.ok) {
    throw new ProviderError(
      `Twelve Data returned HTTP ${response.status}`,
      SOURCE,
      response.status
    );
  }

  return response.json();
}
