import type { SectorData } from "@/types/institutional";
import {
  fetchWithTimeout,
  ProviderError,
  buildUnavailableResult,
  buildSuccessResult,
  type ProviderResult,
} from "../shared";
import { parseSectorQuotes } from "./parser";
import type { SectorQuoteResponse } from "./parser";
import { normalizeSectorData } from "./normalizer";
import { validateSectorData } from "./validator";

const TD_BASE = "https://api.twelvedata.com";
const FETCH_TIMEOUT_MS = 10000;
const SOURCE = "TwelveData";

export interface SectorMarketConfig {
  symbol: string;
  name: string;
}

const TD_QUOTES_BATCH_LIMIT = 8;

export const SECTOR_ETFS: SectorMarketConfig[] = [
  { symbol: "XLK", name: "Technology" },
  { symbol: "XLC", name: "Communication Services" },
  { symbol: "XLY", name: "Consumer Discretionary" },
  { symbol: "XLP", name: "Consumer Staples" },
  { symbol: "XLV", name: "Healthcare" },
  { symbol: "XLF", name: "Financials" },
  { symbol: "XLI", name: "Industrials" },
  { symbol: "XLE", name: "Energy" },
  { symbol: "XLB", name: "Materials" },
  { symbol: "XLU", name: "Utilities" },
  { symbol: "XLRE", name: "Real Estate" },
  { symbol: "SMH", name: "Semiconductors" },
];

export async function fetchSectorData(
  config?: SectorMarketConfig[]
): Promise<ProviderResult<SectorData>> {
  const targets = config ?? SECTOR_ETFS;
  const timestamp = new Date().toISOString();

  try {
    const records = await tryFetchAll(targets, timestamp);

    if (records.length === 0) {
      return buildUnavailableResult(SOURCE, "No sector quotes returned");
    }

    const normalized = normalizeSectorData(records, targets, SOURCE);
    const validated = validateSectorData(normalized);

    if (validated.valid && validated.data) {
      return buildSuccessResult(validated.data, SOURCE);
    }

    return buildUnavailableResult(SOURCE, validated.reason ?? "Sector validation failed");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.log(`[Sector Provider] ${SOURCE} failed: ${msg}`);
    return buildUnavailableResult(SOURCE, `Sector data unavailable: ${msg}`);
  }
}

async function tryFetchAll(
  configs: SectorMarketConfig[],
  timestamp: string
): Promise<import("./parser").SectorParseRecord[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new ProviderError("TWELVE_DATA_API_KEY not configured", SOURCE);
  }

  const all: import("./parser").SectorParseRecord[] = [];

  for (let i = 0; i < configs.length; i += TD_QUOTES_BATCH_LIMIT) {
    const batch = configs.slice(i, i + TD_QUOTES_BATCH_LIMIT);
    const symbols = batch.map((c) => c.symbol).join(",");

    const url = `${TD_BASE}/quote?symbol=${encodeURIComponent(symbols)}&apikey=${apiKey}`;
    const response = await fetchWithTimeout(url, { timeout: FETCH_TIMEOUT_MS });

    if (!response.ok) {
      console.log(`[Sector Provider] Twelve Data HTTP ${response.status} for batch ${i}`);
      continue;
    }

    const raw = await response.json();

    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      if (raw.code && raw.message) {
        console.log(`[Sector Provider] Twelve Data error: ${raw.message}`);
        continue;
      }

      if (raw.symbol) {
        const parsed = parseSectorQuotes(raw as SectorQuoteResponse, timestamp);
        all.push(...parsed);
      }
    } else if (Array.isArray(raw)) {
      const parsed = parseSectorQuotes(raw as SectorQuoteResponse[], timestamp);
      all.push(...parsed);
    }
  }

  return all;
}
