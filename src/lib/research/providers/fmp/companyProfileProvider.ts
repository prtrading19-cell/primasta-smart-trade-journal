import type { US100CompanyProfile, US100DataMeta } from "@/types/us100";
import { US100_MEGA_CAP_SYMBOLS, type US100MegaCapSymbol } from "@/types/us100";
import { fmpFetch, nowISO, FMPError } from "./fmpClient";

interface FMPProfile {
  symbol: string;
  companyName: string;
  mktCap: number;
  sector: string;
  industry: string;
  description: string;
  website: string;
  ceo: string;
  fullTimeEmployees: number;
}

export async function fetchUS100CompanyProfiles(): Promise<US100CompanyProfile[]> {
  const timestamp = nowISO();

  try {
    const profiles: US100CompanyProfile[] = [];

    const batches = chunkArray([...US100_MEGA_CAP_SYMBOLS], 5);
    for (const batch of batches) {
      const symbols = batch.join(",");
      const data = await fmpFetch<FMPProfile[]>("/profile/" + symbols);

      if (Array.isArray(data)) {
        for (const p of data) {
          profiles.push({
            symbol: p.symbol,
            name: p.companyName,
            marketCap: p.mktCap,
            sector: p.sector,
            industry: p.industry,
            description: p.description,
            website: p.website,
            ceo: p.ceo,
            employees: p.fullTimeEmployees,
            meta: buildMeta("live", "FMP", timestamp),
          });
        }
      }
    }

    return profiles;
  } catch (err) {
    const message = err instanceof FMPError ? err.message : err instanceof Error ? err.message : "Unknown error";
    return US100_MEGA_CAP_SYMBOLS.map((symbol) => ({
      symbol,
      name: symbol,
      marketCap: 0,
      sector: "",
      industry: "",
      description: "",
      website: "",
      ceo: "",
      employees: 0,
      meta: buildMeta("unavailable", "FMP", timestamp, message),
    }));
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function buildMeta(status: US100DataMeta["status"], source: string, timestamp: string, error?: string): US100DataMeta {
  return { status, source, timestamp, lastUpdated: timestamp, ...(error ? { error } : {}) };
}
