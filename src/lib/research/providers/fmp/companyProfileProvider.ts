import type { US100CompanyProfile, US100DataMeta } from "@/types/us100";
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

export async function fetchCompanyProfiles(symbols: readonly string[]): Promise<US100CompanyProfile[]> {
  const timestamp = nowISO();
  const startTime = Date.now();
  const profiles: US100CompanyProfile[] = [];

  try {
    for (const symbol of symbols) {
      const data = await fmpFetch<FMPProfile[]>("/profile", { symbol });

      if (Array.isArray(data) && data.length > 0) {
        const p = data[0];
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

    const durationMs = Date.now() - startTime;
    console.log(`[FMP Profiles] Endpoint: /profile/* | Status: ${profiles.length > 0 ? "LIVE" : "NO_DATA"} | Profiles: ${profiles.length} | Duration: ${durationMs}ms`);
    return profiles;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof FMPError ? err.message : err instanceof Error ? err.message : "Unknown error";
    let statusLabel = "ERROR";
    if (message.includes("not configured")) statusLabel = "INVALID_KEY";
    else if (message.includes("Rate limited")) statusLabel = "RATE_LIMITED";
    console.log(`[FMP Profiles] Endpoint: /profile/* | Status: ${statusLabel} | Error: ${message} | Duration: ${durationMs}ms`);
    return symbols.map((symbol) => ({
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

function buildMeta(status: US100DataMeta["status"], source: string, timestamp: string, error?: string): US100DataMeta {
  return { status, source, timestamp, lastUpdated: timestamp, ...(error ? { error } : {}) };
}
