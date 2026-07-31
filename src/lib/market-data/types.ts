import type {
  SectorData, VolatilityData, BreadthData, MacroData,
  ETFData, COTReportData, OpenInterestRecord,
} from "@/types/institutional";

export interface MarketDataProviderResult {
  provider: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

export interface FREDData {
  us10Yield: string;
  us2Yield: string;
  fedFundsRate: string;
  realYield: string;
  unemploymentRate: string;
  gdpGrowth: string;
  balanceSheetSize: string;
  raw: Record<string, unknown>;
}

export interface AlphaVantageData {
  dxy: string;
  usDollarIndex: string;
  raw: Record<string, unknown>;
}

export interface FinnhubData {
  marketNews: NewsItem[];
  financialNews: NewsItem[];
  fedNews: NewsItem[];
  etfNews: NewsItem[];
  sentimentNews: NewsItem[];
  positioningNews: NewsItem[];
  raw: Record<string, unknown>;
}

export interface NewsApiData {
  goldNews: NewsItem[];
  fedNews: NewsItem[];
  inflationNews: NewsItem[];
  geopoliticalNews: NewsItem[];
  economicNews: NewsItem[];
  etfNews: NewsItem[];
  centralBankNews: NewsItem[];
  sentimentNews: NewsItem[];
  positioningNews: NewsItem[];
  liquidityNews: NewsItem[];
  seasonalityNews: NewsItem[];
  raw: Record<string, unknown>;
}

export interface GNewsData {
  goldNews: NewsItem[];
  fedNews: NewsItem[];
  economicNews: NewsItem[];
  etfNews: NewsItem[];
  centralBankNews: NewsItem[];
  sentimentNews: NewsItem[];
  positioningNews: NewsItem[];
  liquidityNews: NewsItem[];
  raw: Record<string, unknown>;
}

export interface NewsItem {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
}

export interface MarketData {
  goldPrice: string;
  dxy: string;
  us10Yield: string;
  us2Yield: string;
  realYield: string;
  fedFundsRate: string;
  unemploymentRate: string;
  gdpGrowth: string;
  balanceSheetSize: string;
  vixLevel: string;
  marketSentiment: string;
  goldNews: NewsItem[];
  fedNews: NewsItem[];
  inflationNews: NewsItem[];
  geopoliticalNews: NewsItem[];
  economicNews: NewsItem[];
  etfNews: NewsItem[];
  centralBankNews: NewsItem[];
  sentimentNews: NewsItem[];
  positioningNews: NewsItem[];
  liquidityNews: NewsItem[];
  timestamp: string;
  sources: string[];
  errors: string[];
  providerResults: MarketDataProviderResult[];
  cotData?: COTReportData[];
  etfData?: ETFData;
  openInterestData?: OpenInterestRecord[];
  breadthData?: BreadthData[];
  sectorData?: SectorData;
  volatilityData?: VolatilityData;
  macroData?: MacroData;
}

export interface MappedResearchSection {
  driver: string;
  currentDataValue: string;
  direction: string;
  newsHeadline: string;
  newsSummary: string;
  chartObservation: string;
  sourceLink: string;
  goldImpact: "Bullish Gold" | "Bearish Gold" | "Neutral" | "Mixed-Wait";
  reason: string;
  timestamp: string;
  source: string;
}
