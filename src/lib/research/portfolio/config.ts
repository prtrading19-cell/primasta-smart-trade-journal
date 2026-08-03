import type { RiskLevel } from "../decision/types";

export const PORTFOLIO_MIN_SNAPSHOTS_FOR_CORRELATION = 3;

export const CORRELATION_STRENGTH_THRESHOLDS = {
  strong: 0.7,
  moderate: 0.4,
  weak: 0.2,
} as const;

export const RISK_SCORE_BY_LEVEL: Record<RiskLevel, number> = {
  Low: 25,
  Medium: 50,
  High: 75,
  Extreme: 95,
};

export const RISK_LEVEL_BY_SCORE: { max: number; level: RiskLevel }[] = [
  { max: 34, level: "Low" },
  { max: 59, level: "Medium" },
  { max: 84, level: "High" },
  { max: 100, level: "Extreme" },
];

export const HEDGE_VEHICLES: Record<string, string> = {
  concentration: "Reduce top position; rebalance into underweight assets or cash",
  "risk-cluster": "Reduce correlated legs; add uncorrelated diversifier",
  conflict: "Neutralize opposing signals; trim the lower-confidence leg",
  macro: "Add macro hedge (e.g., USD/Yield-linked or inverse index exposure)",
  institutional: "Follow institutional flows; reduce crowded positioning",
  volatility: "Raise cash reserve or reduce size while volatility is elevated",
};

export const MACRO_HEDGE_SUGGESTIONS: { driver: string; instrument: string }[] = [
  { driver: "dxy", instrument: "USD-hedged exposure" },
  { driver: "dgs10", instrument: "Duration hedge" },
  { driver: "fedfunds", instrument: "Rate-sensitive underweight" },
  { driver: "cpi", instrument: "Inflation-linked exposure" },
];

export const ALLOCATION_ACTION_THRESHOLD = 5;
export const ALLOCATION_SCALE_IN_SCORE = 60;
export const ALLOCATION_SCALE_OUT_SCORE = 40;
export const ALLOCATION_CASH_RESERVE_LEVELS: Record<RiskLevel, number> = {
  Low: 5,
  Medium: 15,
  High: 30,
  Extreme: 45,
};

export interface ReferenceAssetSeries {
  id: string;
  label: string;
  providerId: string;
}

export const REFERENCE_ASSET_SERIES: ReferenceAssetSeries[] = [
  { id: "dxy", label: "US Dollar Index", providerId: "macro-institutional" },
  { id: "dgs10", label: "US 10Y Yield", providerId: "macro-institutional" },
  { id: "vix", label: "VIX Volatility", providerId: "volatility-institutional" },
  { id: "gvz", label: "Gold Volatility (GVZ)", providerId: "volatility-institutional" },
];
