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

  try {
    const symbols = Object.values(US100_SECTOR_ETF_MAP).join(",");
    const data = await fmpFetch<FMPSectorQuote[]>("/quote", { symbol: symbols });

    if (!Array.isArray(data)) return buildUnavailableSectors(timestamp, "No data returned");

    const quoteMap = new Map<string, FMPSectorQuote>();
    for (const q of data) {
      quoteMap.set(q.symbol, q);
    }

    const getChange = (etf: string): number => {
      const q = quoteMap.get(etf);
      return typeof q?.changesPercentage === "number" ? q.changesPercentage : 0;
    };

    return {
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
  } catch (err) {
    const message = err instanceof FMPError ? err.message : err instanceof Error ? err.message : "Unknown error";
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
