import type { US100CompanyProfile, US100DataMeta } from "@/types/us100";
import { fmpFetch, nowISO, FMPError } from "./fmpClient";
import { classifyProviderFailure, buildProviderLimitationError } from "../shared";

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

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const data = await fmpFetch<FMPProfile[]>("/profile", { symbol });
          if (Array.isArray(data) && data.length > 0) {
            const p = data[0];
            return {
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
            } as US100CompanyProfile;
          }
        } catch (err) {
          const classification = classifyProviderFailure("FMP", err);
          if (classification.isLimitation) {
            return {
              symbol,
              name: symbol,
              marketCap: 0,
              sector: "",
              industry: "",
              description: "",
              website: "",
              ceo: "",
              employees: 0,
              meta: buildMeta("unavailable", "FMP", timestamp, buildProviderLimitationError("FMP", classification.reason ?? "Profile fetch failed")),
            } as US100CompanyProfile;
          }
        }
        return {
          symbol,
          name: symbol,
          marketCap: 0,
          sector: "",
          industry: "",
          description: "",
          website: "",
          ceo: "",
          employees: 0,
          meta: buildMeta("unavailable", "FMP", timestamp, "Profile fetch failed"),
        } as US100CompanyProfile;
      })
    );

    const durationMs = Date.now() - startTime;
    const liveProfiles = results.filter((r) => r.meta.status === "live");
    console.log(`[FMP Profiles] Endpoint: /profile/* | Status: ${liveProfiles.length > 0 ? "LIVE" : "NO_DATA"} | Profiles: ${liveProfiles.length}/${symbols.length} | Duration: ${durationMs}ms`);
    return results;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof FMPError ? err.message : err instanceof Error ? err.message : "Unknown error";
    let statusLabel = "ERROR";
    if (message.includes("not configured")) statusLabel = "INVALID_KEY";
    else if (message.includes("Rate limited")) statusLabel = "RATE_LIMITED";
    console.log(`[FMP Profiles] Endpoint: /profile/* | Status: ${statusLabel} | Error: ${message} | Duration: ${durationMs}ms`);
    const classification = classifyProviderFailure("FMP", err);
    const meta = classification.isLimitation
      ? buildMeta("unavailable", "FMP", timestamp, buildProviderLimitationError("FMP", classification.reason ?? message))
      : buildMeta("unavailable", "FMP", timestamp, message);
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
      meta,
    }));
  }
}

function buildMeta(status: US100DataMeta["status"], source: string, timestamp: string, error?: string): US100DataMeta {
  return { status, source, timestamp, lastUpdated: timestamp, ...(error ? { error } : {}) };
}
