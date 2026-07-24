import type { FREDData } from "./types";

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

const SERIES_IDS = {
  US10Yield: "DGS10",
  US2Yield: "DGS2",
  FedFundsRate: "FEDFUNDS",
  RealYield: "DFII10",
  UnemploymentRate: "UNRATE",
  GDPGrowth: "A191RL1Q225SBEA",
  BalanceSheet: "WALCL",
} as const;

const TIMEOUT_MS = 10000;

export async function fetchFRED(apiKey: string): Promise<FREDData> {
  const [us10, us2, fed, real, unemployment, gdp, balance] = await Promise.allSettled([
    fetchFredSeries(apiKey, SERIES_IDS.US10Yield),
    fetchFredSeries(apiKey, SERIES_IDS.US2Yield),
    fetchFredSeries(apiKey, SERIES_IDS.FedFundsRate),
    fetchFredSeries(apiKey, SERIES_IDS.RealYield),
    fetchFredSeries(apiKey, SERIES_IDS.UnemploymentRate),
    fetchFredSeries(apiKey, SERIES_IDS.GDPGrowth),
    fetchFredSeries(apiKey, SERIES_IDS.BalanceSheet),
  ]);

  return {
    us10Yield: extractValue(us10),
    us2Yield: extractValue(us2),
    fedFundsRate: extractValue(fed),
    realYield: extractValue(real),
    unemploymentRate: extractValue(unemployment),
    gdpGrowth: extractValue(gdp),
    balanceSheetSize: extractBalanceSheet(balance),
    raw: {
      DGS10: extractRaw(us10),
      DGS2: extractRaw(us2),
      FEDFUNDS: extractRaw(fed),
      DFII10: extractRaw(real),
      UNRATE: extractRaw(unemployment),
      A191RL1Q225SBEA: extractRaw(gdp),
      WALCL: extractRaw(balance),
    },
  };
}

async function fetchFredSeries(apiKey: string, seriesId: string): Promise<FredObservation[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL(FRED_BASE);
    url.searchParams.set("series_id", seriesId);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("file_type", "json");
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("limit", "1");

    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`FRED ${seriesId}: HTTP ${response.status}`);
    }

    const data = await response.json();
    const observations = data?.observations;
    return Array.isArray(observations) ? observations : [];
  } catch (error) {
    clearTimeout(timeout);
    throw new Error(`FRED ${seriesId}: ${error instanceof Error ? error.message : "unknown"}`);
  }
}

interface FredObservation {
  date?: string;
  value?: string;
}

function extractValue(result: PromiseSettledResult<FredObservation[]>): string {
  if (result.status === "rejected") return "";
  const observations = result.value;
  const latest = observations[0];
  if (!latest || latest.value === "." || latest.value === undefined) return "";
  return `${latest.value}% (as of ${latest.date || "recent"})`;
}

function extractBalanceSheet(result: PromiseSettledResult<FredObservation[]>): string {
  if (result.status === "rejected") return "";
  const observations = result.value;
  const latest = observations[0];
  if (!latest || latest.value === "." || latest.value === undefined) return "";
  const billions = (parseFloat(latest.value) / 1000).toFixed(1);
  return `$${billions}B (as of ${latest.date || "recent"})`;
}

function extractRaw(result: PromiseSettledResult<FredObservation[]>): unknown {
  if (result.status === "rejected") return null;
  return result.value;
}
