import type { ProviderMeta } from "./ProviderMeta";

export interface MacroIndicator {
  name: string;
  value: number;
  previous: number;
  change: number;
  forecast: number | null;
  surprise: number | null;
  unit: string;
  impact: "High" | "Medium" | "Low";
  trend: "Improving" | "Deteriorating" | "Stable" | "Mixed";
  releaseDate: string;
  nextRelease: string | null;
  timestamp: string;
}

export interface MacroData {
  indicators: MacroIndicator[];
  meta: ProviderMeta;
}
