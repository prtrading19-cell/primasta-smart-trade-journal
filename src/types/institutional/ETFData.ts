import type { ProviderMeta } from "./ProviderMeta";

export type FlowDirection = "Inflow" | "Outflow" | "Flat";
export type FlowMagnitude = "Heavy" | "Moderate" | "Light" | "None";

export interface ETFHoldings {
  symbol: string;
  name: string;
  totalAssets: number;
  netAssetValue: number;
  sharesOutstanding: number;
  changeFromPrevious?: number;
  flowDirection: FlowDirection;
  flowMagnitude?: FlowMagnitude;
  period?: string;
}

export interface ETFData {
  etfs: ETFHoldings[];
  meta: ProviderMeta;
}
