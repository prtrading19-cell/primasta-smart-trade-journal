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
  raw: Record<string, unknown>;
}

export interface NewsApiData {
  goldNews: NewsItem[];
  fedNews: NewsItem[];
  inflationNews: NewsItem[];
  geopoliticalNews: NewsItem[];
  raw: Record<string, unknown>;
}

export interface GNewsData {
  goldNews: NewsItem[];
  fedNews: NewsItem[];
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
  marketSentiment: string;
  goldNews: NewsItem[];
  fedNews: NewsItem[];
  inflationNews: NewsItem[];
  geopoliticalNews: NewsItem[];
  timestamp: string;
  sources: string[];
  errors: string[];
  providerResults: MarketDataProviderResult[];
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
