import type { BreadthData } from "@/types/institutional";
import {
  fetchWithTimeout,
  ProviderError,
  buildUnavailableResult,
  buildSuccessResult,
  type ProviderResult,
} from "../shared";
import { parseBreadthResponse } from "./parser";
import { normalizeBreadth } from "./normalizer";
import { validateBreadthData } from "./validator";

const FMP_BASE = "https://financialmodelingprep.com/stable";
const FETCH_TIMEOUT_MS = 10000;
const SOURCE = "FMP";

export interface BreadthMarketConfig {
  assetId: string;
  exchange: string;
}

export const BREADTH_MARKETS: BreadthMarketConfig[] = [
  { assetId: "gold", exchange: "NYSE" },
  { assetId: "us100", exchange: "NASDAQ" },
];

export async function fetchMarketBreadth(
  markets?: BreadthMarketConfig[]
): Promise<ProviderResult<BreadthData[]>> {
  const targets = markets ?? BREADTH_MARKETS;

  try {
    const raw = await tryFetchFMPBreadth();
    const results: BreadthData[] = [];

    for (const market of targets) {
      const parsed = parseBreadthResponse(raw, market.exchange);
      if (!parsed) continue;

      const normalized = normalizeBreadth(parsed, SOURCE);
      const validated = validateBreadthData(normalized);
      if (validated.valid && validated.data) {
        results.push(validated.data);
      }
    }

    if (results.length === 0) {
      return buildUnavailableResult(SOURCE, "No breadth data for configured markets");
    }

    return buildSuccessResult(results, SOURCE);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.log(`[Breadth Provider] ${SOURCE} failed: ${msg}`);
    return buildUnavailableResult(SOURCE, `Breadth data unavailable: ${msg}`);
  }
}

async function tryFetchFMPBreadth(): Promise<unknown> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    throw new ProviderError("FMP_API_KEY not configured", SOURCE);
  }

  const url = `${FMP_BASE}/market-breadth?apikey=${apiKey}`;
  const response = await fetchWithTimeout(url, { timeout: FETCH_TIMEOUT_MS });

  if (!response.ok) {
    throw new ProviderError(
      `FMP returned HTTP ${response.status}`,
      SOURCE,
      response.status
    );
  }

  return response.json();
}
