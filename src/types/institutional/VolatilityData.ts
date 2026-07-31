import type { ProviderMeta } from "./ProviderMeta";

export interface VolatilityData {
  vix: number | null;
  vixChange: number | null;
  vixChangePercent: number | null;
  vxn: number | null;
  vxnChange: number | null;
  vxnChangePercent: number | null;
  gvz: number | null;
  gvzChange: number | null;
  gvzChangePercent: number | null;
  trend: "Elevated" | "Normal" | "Low";
  riskRating: "Extreme" | "High" | "Moderate" | "Low";
  meta: ProviderMeta;
}
