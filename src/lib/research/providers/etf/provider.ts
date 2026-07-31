import type { ETFData } from "@/types/institutional";
import {
  fetchWithTimeout,
  ProviderError,
  buildUnavailableResult,
  buildSuccessResult,
  type ProviderResult,
} from "../shared";
import { parseETFResponse } from "./parser";
import { normalizeETFRecords } from "./normalizer";
import { validateETFData } from "./validator";

const FMP_BASE = "https://financialmodelingprep.com/stable";
const FETCH_TIMEOUT_MS = 10000;
const SOURCE = "FMP";

export interface ETFMarketConfig {
  assetId: string;
  symbols: string[];
}

export const ETF_MARKETS: ETFMarketConfig[] = [
  { assetId: "gold", symbols: ["GLD", "IAU"] },
  { assetId: "us100", symbols: ["QQQ", "TQQQ", "SQQQ"] },
];

export async function fetchETFData(
  markets?: ETFMarketConfig[]
): Promise<ProviderResult<ETFData>> {
  const targets = markets ?? ETF_MARKETS;
  const symbolSet = new Set(targets.flatMap((m) => m.symbols));

  try {
    const raw = await tryFetchFMPETFInfo(symbolSet);
    const parsed = parseETFResponse(raw, SOURCE);

    if (parsed.records.length === 0) {
      return buildUnavailableResult(SOURCE, "No ETF records returned from FMP");
    }

    for (const market of targets) {
      const assetRecords = parsed.records.filter((r) =>
        market.symbols.includes(r.symbol)
      );
      if (assetRecords.length === 0) continue;

      const normalized = normalizeETFRecords(
        assetRecords,
        market.assetId,
        SOURCE
      );
      const validated = validateETFData(normalized);
      if (validated.valid && validated.data) {
        return buildSuccessResult(validated.data, SOURCE);
      }
    }

    return buildUnavailableResult(SOURCE, "No valid ETF data for configured markets");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.log(`[ETF Provider] ${SOURCE} failed: ${msg}`);
    return buildUnavailableResult(SOURCE, `ETF flow data unavailable: ${msg}`);
  }
}

async function tryFetchFMPETFInfo(
  symbols: Set<string>
): Promise<unknown> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    throw new ProviderError("FMP_API_KEY not configured", SOURCE);
  }

  const symbolList = Array.from(symbols).join(",");
  const url = `${FMP_BASE}/profile?symbol=${encodeURIComponent(symbolList)}&apikey=${apiKey}`;
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
