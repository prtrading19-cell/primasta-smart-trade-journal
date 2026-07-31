import type { ProviderMeta } from "./ProviderMeta";

export interface SectorPerformance {
  sector: string;
  etf: string;
  price: number;
  change: number;
  changePercent: number;
  trend: "Bullish" | "Bearish" | "Neutral";
  strength: number;
  volume: number | null;
  timestamp: string;
}

export interface SectorData {
  sectors: SectorPerformance[];
  strongest: string;
  weakest: string;
  exchange: string;
  timestamp: string;
  meta: ProviderMeta;
}
