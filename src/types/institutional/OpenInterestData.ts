import type { ProviderMeta } from "./ProviderMeta";

export interface OpenInterestRecord {
  assetId: string;
  contractName: string;
  currentLevel: number;
  changeFromPrevious: number;
  highLevel: boolean;
  lowLevel: boolean;
  trend: "Rising" | "Falling" | "Flat";
  exchange: string;
  reportDate: string;
  meta: ProviderMeta;
}
