import type { US100SectorPerformance, US100DataMeta } from "@/types/us100";
import { US100_SECTOR_ETF_MAP } from "@/types/us100";
import { fmpFetch, nowISO, FMPError } from "./fmpClient";

interface FMPSectorQuote {
  symbol: string;
  price: number;
  changesPercentage: number;
}

export async function fetchUS100Sectors(): Promise<US100SectorPerformance> {
  const timestamp = nowISO();
  const symbols = Object.values(US100_SECTOR_ETF_MAP).join(",");
  const startTime = Date.now();

  try {
    const data = await fmpFetch<FMPSectorQuote[]>("/quote", { symbol: symbols });
    const durationMs = Date.now() - startTime;

    if (!Array.isArray(data)) {
      console.log(`[FMP Sectors] Symbol: ${symbols} | Status: NO_DATA | Reason: Response is not an array | Duration: ${durationMs}ms`);
      return buildUnavailableSectors(timestamp, "Response is not an array");
    }

    const quoteMap = new Map<string, FMPSectorQuote>();
    for (const q of data) quoteMap.set(q.symbol, q);

    const getChange = (etf: string): number => {
      const q = quoteMap.get(etf);
      return typeof q?.changesPercentage === "number" ? q.changesPercentage : 0;
    };

    const result = {
      technology: getChange(US100_SECTOR_ETF_MAP.technology),
      semiconductors: getChange(US100_SECTOR_ETF_MAP.semiconductors),
      healthcare: getChange(US100_SECTOR_ETF_MAP.healthcare),
      financials: getChange(US100_SECTOR_ETF_MAP.financials),
      industrials: getChange(US100_SECTOR_ETF_MAP.industrials),
      energy: getChange(US100_SECTOR_ETF_MAP.energy),
      utilities: getChange(US100_SECTOR_ETF_MAP.utilities),
      consumer: getChange(US100_SECTOR_ETF_MAP.consumer),
      communication: getChange(US100_SECTOR_ETF_MAP.communication),
      realEstate: 0,
      meta: buildMeta("live", "FMP", timestamp),
    };

    console.log(`[FMP Sectors] Symbol: ${symbols} | Status: LIVE | Quotes: ${data.length} | Duration: ${durationMs}ms`);
    return result;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof FMPError ? err.message : err instanceof Error ? err.message : "Unknown error";
    let statusLabel = "ERROR";
    if (message.includes("not configured")) statusLabel = "INVALID_KEY";
    else if (message.includes("Rate limited")) statusLabel = "RATE_LIMITED";
    console.log(`[FMP Sectors] Symbol: ${symbols} | Status: ${statusLabel} | Error: ${message} | Duration: ${durationMs}ms`);
    return buildUnavailableSectors(timestamp, message);
  }
}

function buildUnavailableSectors(timestamp: string, error: string): US100SectorPerformance {
  return {
    technology: 0, semiconductors: 0, healthcare: 0, financials: 0,
    industrials: 0, energy: 0, utilities: 0, consumer: 0, communication: 0, realEstate: 0,
    meta: { status: "unavailable", source: "FMP", timestamp, lastUpdated: timestamp, error },
  };
}

function buildMeta(status: US100DataMeta["status"], source: string, timestamp: string): US100DataMeta {
  return { status, source, timestamp, lastUpdated: timestamp };
}
