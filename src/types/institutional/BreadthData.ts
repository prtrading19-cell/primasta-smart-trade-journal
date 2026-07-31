import type { ProviderMeta } from "./ProviderMeta";

export interface BreadthData {
  advances: number;
  declines: number;
  aDRatio: number;
  newHighs: number;
  newLows: number;
  upVolume: number;
  downVolume: number;
  breadthScore: number;
  exchange: string;
  timestamp: string;
  meta: ProviderMeta;
}
