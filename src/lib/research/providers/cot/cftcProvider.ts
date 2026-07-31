import type { COTReportData } from "@/types/institutional";
import { buildProviderMeta } from "@/types/institutional";
import {
  fetchWithTimeout,
  ProviderError,
  buildUnavailableResult,
  buildSuccessResult,
  type ProviderResult,
} from "../shared";
import { parseCFTCFile } from "./parser";
import { normalizeCOTRecord } from "./normalizer";
import { validateCOTData } from "./validator";
import { unzipBuffer } from "./zipUtil";

const CFTC_BASE_URL = "https://www.cftc.gov/dea/newcot";
const FETCH_TIMEOUT_MS = 10000;
const SOURCE = "CFTC";

export interface COTMarketConfig {
  assetId: string;
  contractCode: string;
  marketPattern: string;
}

export const COT_MARKETS: COTMarketConfig[] = [
  {
    assetId: "gold",
    contractCode: "088691",
    marketPattern: "GOLD",
  },
  {
    assetId: "us100",
    contractCode: "209747",
    marketPattern: "NASDAQ 100",
  },
  {
    assetId: "spx500",
    contractCode: "13874",
    marketPattern: "S&P 500",
  },
];

export async function fetchCOTReport(
  markets?: COTMarketConfig[]
): Promise<ProviderResult<COTReportData[]>> {
  const targets = markets ?? COT_MARKETS;
  const startTime = Date.now();

  try {
    const rawText = await downloadCFTC();
    const records = parseCFTCFile(rawText);

    if (records.length === 0) {
      return buildUnavailableResult(SOURCE, "No records found in CFTC report");
    }

    const results: COTReportData[] = [];

    for (const market of targets) {
      const matching = records.filter((r) => {
        const name = r.marketName.toUpperCase();
        const code = r.marketCode.toUpperCase();
        return (
          code === market.contractCode ||
          name.includes(market.marketPattern.toUpperCase())
        );
      });

      if (matching.length === 0) {
        results.push(buildUnavailableRecord(market, "No matching record found"));
        continue;
      }

      const latest = matching.reduce((a, b) =>
        a.asOfDate > b.asOfDate ? a : b
      );

      const normalized = normalizeCOTRecord(latest, market, SOURCE);
      const validated = validateCOTData(normalized);

      if (!validated.valid) {
        results.push(
          buildUnavailableRecord(market, validated.reason ?? "Validation failed")
        );
        continue;
      }

      validated.data.meta.latency = Date.now() - startTime;
      results.push(validated.data);
    }

    return buildSuccessResult(results, SOURCE);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.log(`[COT Provider] ${SOURCE} failed: ${msg}`);
    return buildUnavailableResult(SOURCE, `COT data unavailable: ${msg}`);
  }
}

async function downloadCFTC(): Promise<string> {
  const year = new Date().getFullYear();
  const url = `${CFTC_BASE_URL}/f_l_future_${year}.zip`;

  const response = await fetchWithTimeout(url, { timeout: FETCH_TIMEOUT_MS });

  if (!response.ok) {
    throw new ProviderError(
      `CFTC returned HTTP ${response.status}`,
      SOURCE,
      response.status
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return unzipBuffer(buffer);
}

function buildUnavailableRecord(
  market: COTMarketConfig,
  error: string
): COTReportData {
  return {
    reportDate: "",
    assetId: market.assetId,
    contractName: market.marketPattern,
    contractCode: market.contractCode,
    exchange: "",
    commercials: { long: 0, short: 0, netLong: 0, netShort: 0 },
    nonCommercials: { long: 0, short: 0, netLong: 0, netShort: 0 },
    totalOpenInterest: 0,
    meta: buildProviderMeta(SOURCE, "unavailable", error),
  };
}
