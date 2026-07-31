import type { ResearchAsset } from "../ResearchTypes";
import type { ProviderMeta } from "@/types/institutional";
import type { COTReportData } from "@/types/institutional";
import type { ETFHoldings } from "@/types/institutional";
import type { OpenInterestRecord } from "@/types/institutional";
import type { BreadthData } from "@/types/institutional";
import type { SectorPerformance } from "@/types/institutional";
import type { MacroIndicator } from "@/types/institutional";
import type { VolatilityData } from "@/types/institutional";

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
}

export interface EarningsEntry {
  symbol: string;
  date: string;
  eps?: number;
  epsEstimated?: number;
  revenue?: number;
  revenueEstimated?: number;
}

export interface MarketMoversEntry {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
}

export interface ResearchDataset {
  asset: ResearchAsset;
  collectedAt: string;
  currentPrice?: number;
  indexValue?: number;
  indexChange?: number;
  indexChangePercent?: number;

  macro?: {
    indicators: MacroIndicator[];
    meta: ProviderMeta;
  };
  volatility?: VolatilityData & { meta: ProviderMeta };
  etf?: {
    etfs: ETFHoldings[];
    meta: ProviderMeta;
  };
  cot?: COTReportData[];
  openInterest?: {
    records: OpenInterestRecord[];
    meta: ProviderMeta;
  };
  breadth?: BreadthData & { meta: ProviderMeta };
  sectors?: {
    performances: SectorPerformance[];
    meta: ProviderMeta;
  };

  us100?: {
    stocks: StockQuote[];
    earnings: EarningsEntry[];
    sectorChanges?: Record<string, number>;
    movers?: {
      topGainers: MarketMoversEntry[];
      topLosers: MarketMoversEntry[];
    };
    volatilityIndex?: {
      vix?: number;
      vxn?: number;
      meta: ProviderMeta;
    };
  };

  gold?: {
    gvz?: number;
  };
}

export const createEmptyDataset = (asset: ResearchAsset): ResearchDataset => ({
  asset,
  collectedAt: new Date().toISOString(),
});
