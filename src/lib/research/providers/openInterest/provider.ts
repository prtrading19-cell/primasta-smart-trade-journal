import type { OpenInterestRecord } from "@/types/institutional";
import {
  fetchWithTimeout,
  ProviderError,
  buildUnavailableResult,
  buildSuccessResult,
  toUnavailableResult,
  type ProviderResult,
} from "../shared";
import { parseOIResponse } from "./parser";
import { normalizeOIRecord } from "./normalizer";
import { validateOIData } from "./validator";

const FMP_BASE = "https://financialmodelingprep.com/stable";
const FETCH_TIMEOUT_MS = 10000;
const SOURCE = "FMP";

export interface OIMarketConfig {
  assetId: string;
  contractName: string;
  fmpSymbol: string;
  exchange: string;
  cftcCode?: string;
}

export const OI_MARKETS: OIMarketConfig[] = [
  {
    assetId: "gold",
    contractName: "Gold Futures",
    fmpSymbol: "GCUSD",
    exchange: "COMEX",
    cftcCode: "088691",
  },
  {
    assetId: "us100",
    contractName: "Nasdaq-100 Futures",
    fmpSymbol: "NQUSD",
    exchange: "CME",
    cftcCode: "209747",
  },
  {
    assetId: "spx500",
    contractName: "S&P 500 Futures",
    fmpSymbol: "ESUSD",
    exchange: "CME",
    cftcCode: "13874",
  },
];

export async function fetchOpenInterest(
  markets?: OIMarketConfig[]
): Promise<ProviderResult<OpenInterestRecord[]>> {
  const targets = markets ?? OI_MARKETS;
  const symbolList = targets.map((m) => m.fmpSymbol).join(",");

  try {
    const raw = await tryFetchFMPOI(symbolList);
    const parsed = parseOIResponse(raw, SOURCE);

    if (parsed.records.length === 0) {
      return buildUnavailableResult(SOURCE, "No OI records returned from FMP");
    }

    const results: OpenInterestRecord[] = [];

    for (const market of targets) {
      const match = parsed.records.find(
        (r) => r.symbol.toUpperCase() === market.fmpSymbol.toUpperCase()
      );

      if (!match) {
        console.log(`[OI Provider] No match for ${market.contractName}`);
        continue;
      }

      const normalized = normalizeOIRecord(match, market.assetId, SOURCE);
      const validated = validateOIData(normalized);

      if (validated.valid && validated.data) {
        results.push(validated.data);
      }
    }

    if (results.length === 0) {
      return buildUnavailableResult(
        SOURCE,
        "No valid OI data for configured markets"
      );
    }

    return buildSuccessResult(results, SOURCE);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.log(`[OI Provider] ${SOURCE} failed: ${msg}`);
    return toUnavailableResult(SOURCE, err, "OI data unavailable");
  }
}

async function tryFetchFMPOI(
  symbols: string
): Promise<unknown> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    throw new ProviderError("FMP_API_KEY not configured", SOURCE);
  }

  const url = `${FMP_BASE}/quote/${encodeURIComponent(symbols)}?apikey=${apiKey}`;
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
