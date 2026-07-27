import type { US100SectorPerformance, US100DataMeta } from "@/types/us100";
import { fmpFetch, nowISO, FMPError } from "./fmpClient";

interface FMPSectorSnapshot {
  date: string;
  sector: string;
  exchange: string;
  averageChange: number;
}

const SECTOR_KEY_MAP: Record<string, keyof US100SectorPerformance> = {
  "Technology": "technology",
  "Healthcare": "healthcare",
  "Financial Services": "financials",
  "Industrials": "industrials",
  "Energy": "energy",
  "Utilities": "utilities",
  "Consumer Cyclical": "consumer",
  "Communication Services": "communication",
  "Real Estate": "realEstate",
};

export async function fetchUS100Sectors(): Promise<US100SectorPerformance> {
  const timestamp = nowISO();
  const startTime = Date.now();

  try {
    const data = await fmpFetch<FMPSectorSnapshot[]>("/sector-performance-snapshot", {
      date: new Date().toISOString().split("T")[0],
    });
    const durationMs = Date.now() - startTime;

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`[FMP Sectors] Endpoint: /sector-performance-snapshot | Status: NO_DATA | Duration: ${durationMs}ms`);
      return buildUnavailableSectors(timestamp, "No sector data returned");
    }

    const sectorMap = new Map<string, number>();
    for (const s of data) {
      if (s.exchange === "NASDAQ") {
        sectorMap.set(s.sector, s.averageChange);
      }
    }

    const getChange = (sectorName: string): number => {
      const key = Object.keys(SECTOR_KEY_MAP).find((k) => k.toLowerCase() === sectorName.toLowerCase());
      if (key) {
        const mappedField = SECTOR_KEY_MAP[key];
        return sectorMap.get(key) ?? 0;
      }
      return 0;
    };

    const result = {
      technology: sectorMap.get("Technology") ?? 0,
      semiconductors: 0,
      healthcare: sectorMap.get("Healthcare") ?? 0,
      financials: sectorMap.get("Financial Services") ?? 0,
      industrials: sectorMap.get("Industrials") ?? 0,
      energy: sectorMap.get("Energy") ?? 0,
      utilities: sectorMap.get("Utilities") ?? 0,
      consumer: sectorMap.get("Consumer Cyclical") ?? 0,
      communication: sectorMap.get("Communication Services") ?? 0,
      realEstate: sectorMap.get("Real Estate") ?? 0,
      meta: buildMeta("live", "FMP", timestamp),
    };

    console.log(`[FMP Sectors] Endpoint: /sector-performance-snapshot | Status: LIVE | Sectors: ${data.length} | Duration: ${durationMs}ms`);
    return result;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof FMPError ? err.message : err instanceof Error ? err.message : "Unknown error";
    let statusLabel = "ERROR";
    if (message.includes("not configured")) statusLabel = "INVALID_KEY";
    else if (message.includes("Rate limited")) statusLabel = "RATE_LIMITED";
    console.log(`[FMP Sectors] Endpoint: /sector-performance-snapshot | Status: ${statusLabel} | Error: ${message} | Duration: ${durationMs}ms`);
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
