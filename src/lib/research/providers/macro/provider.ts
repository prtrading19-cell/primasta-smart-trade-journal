import type { MacroData } from "@/types/institutional";
import {
  fetchWithTimeout,
  ProviderError,
  buildUnavailableResult,
  buildSuccessResult,
  type ProviderResult,
} from "../shared";
import { parseTDQuote, parseFREDResponse } from "./parser";
import type { MacroParseRecord } from "./parser";
import { normalizeMacroData } from "./normalizer";
import { validateMacroData } from "./validator";

const TD_BASE = "https://api.twelvedata.com";
const FRED_BASE = "https://api.stlouisfed.org/fred";
const FETCH_TIMEOUT_MS = 10000;
const SOURCE = "Macro";

export interface MacroIndicatorConfig {
  id: string;
  name: string;
  source: "td" | "fred";
  symbol?: string;
  seriesId?: string;
  unit: string;
  impact: "High" | "Medium" | "Low";
}

export const MACRO_INDICATORS: MacroIndicatorConfig[] = [
  { id: "dxy", name: "US Dollar Index", source: "td", symbol: "DXY", unit: "points", impact: "High" },
  { id: "dgs2", name: "US 2Y Treasury Yield", source: "td", symbol: "US10Y", unit: "%", impact: "Medium" },
  { id: "dgs10", name: "US 10Y Treasury Yield", source: "td", symbol: "US10Y", unit: "%", impact: "High" },
  { id: "fedfunds", name: "Federal Funds Rate", source: "fred", seriesId: "FEDFUNDS", unit: "%", impact: "High" },
  { id: "cpi", name: "CPI", source: "fred", seriesId: "CPIAUCSL", unit: "index", impact: "High" },
  { id: "ppi", name: "PPI", source: "fred", seriesId: "PPIACO", unit: "index", impact: "Medium" },
  { id: "gdp", name: "GDP", source: "fred", seriesId: "GDP", unit: "billions", impact: "High" },
  { id: "unrate", name: "Unemployment Rate", source: "fred", seriesId: "UNRATE", unit: "%", impact: "High" },
  { id: "payems", name: "Non-Farm Payrolls", source: "fred", seriesId: "PAYEMS", unit: "thousands", impact: "High" },
];

export async function fetchMacroData(
  config?: MacroIndicatorConfig[]
): Promise<ProviderResult<MacroData>> {
  const targets = config ?? MACRO_INDICATORS;

  try {
    const tdConfigs = targets.filter((c) => c.source === "td");
    const fredConfigs = targets.filter((c) => c.source === "fred");

    const [tdRecords, fredRecords] = await Promise.all([
      fetchTDIndicators(tdConfigs),
      fetchFREDIndicators(fredConfigs),
    ]);

    const allRecords = [...tdRecords, ...fredRecords].filter((r) => r !== null);

    if (allRecords.length === 0) {
      return buildUnavailableResult(SOURCE, "No macro indicator data returned");
    }

    const normalized = normalizeMacroData(
      allRecords as MacroParseRecord[],
      SOURCE
    );
    const validated = validateMacroData(normalized);

    if (validated.valid && validated.data) {
      return buildSuccessResult(validated.data, SOURCE);
    }

    return buildUnavailableResult(SOURCE, validated.reason ?? "Macro validation failed");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.log(`[Macro Provider] ${SOURCE} failed: ${msg}`);
    return buildUnavailableResult(SOURCE, `Macro data unavailable: ${msg}`);
  }
}

async function fetchTDIndicators(
  configs: MacroIndicatorConfig[]
): Promise<(MacroParseRecord | null)[]> {
  if (configs.length === 0) return [];

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return [];

  const symbols = configs.map((c) => c.symbol).filter(Boolean).join(",");
  if (!symbols) return [];

  try {
    const url = `${TD_BASE}/quote?symbol=${encodeURIComponent(symbols)}&apikey=${apiKey}`;
    const response = await fetchWithTimeout(url, { timeout: FETCH_TIMEOUT_MS });

    if (!response.ok) return [];

    const raw = await response.json();
    const parsed = parseTDQuote(raw);

    return configs.map((cfg) => {
      const match = parsed.find((r) => r.id === cfg.symbol);
      if (!match) return null;
      return { ...match, id: cfg.id, name: cfg.name, impact: cfg.impact, unit: cfg.unit };
    });
  } catch {
    return [];
  }
}

async function fetchFREDIndicators(
  configs: MacroIndicatorConfig[]
): Promise<(MacroParseRecord | null)[]> {
  if (configs.length === 0) return [];

  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return [];

  const results = await Promise.allSettled(
    configs.map((cfg) => fetchFREDSingle(cfg, apiKey!))
  );

  return results.map((r) =>
    r.status === "fulfilled" ? r.value : null
  );
}

async function fetchFREDSingle(
  cfg: MacroIndicatorConfig,
  apiKey: string
): Promise<MacroParseRecord | null> {
  const url = `${FRED_BASE}/series/observations?series_id=${cfg.seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`;
  const response = await fetchWithTimeout(url, { timeout: FETCH_TIMEOUT_MS });

  if (!response.ok) return null;

  const raw = await response.json();
  return parseFREDResponse(raw, {
    seriesId: cfg.seriesId!,
    name: cfg.name,
    unit: cfg.unit,
    impact: cfg.impact,
  });
}
