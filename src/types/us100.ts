export type US100DataStatus = "live" | "delayed" | "unavailable";

export interface US100DataMeta {
  status: US100DataStatus;
  source: string;
  timestamp: string;
  lastUpdated: string;
  error?: string;
}

export interface US100Index {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  timestamp: string;
  meta: US100DataMeta;
}

export interface US100MegaCapStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  sector: string;
  industry: string;
  volume: number;
  high: number;
  low: number;
  previousClose: number;
  timestamp: string;
  meta: US100DataMeta;
}

export interface US100Earnings {
  symbol: string;
  company: string;
  earningsDate: string;
  estimateEPS: number | null;
  previousEPS: number | null;
  importance: "High" | "Medium" | "Low";
  meta: US100DataMeta;
}

export interface US100SectorPerformance {
  technology: number;
  semiconductors: number;
  healthcare: number;
  financials: number;
  industrials: number;
  energy: number;
  utilities: number;
  consumer: number;
  communication: number;
  realEstate: number;
  meta: US100DataMeta;
}

export interface US100MarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface US100Movers {
  topGainers: US100MarketMover[];
  topLosers: US100MarketMover[];
  mostActive: US100MarketMover[];
  meta: US100DataMeta;
}

export interface US100Volatility {
  vix: number | null;
  vixChange: number | null;
  vixChangePercent: number | null;
  vxn: number | null;
  vxnChange: number | null;
  vxnChangePercent: number | null;
  trend: "Elevated" | "Normal" | "Low";
  riskRating: "Extreme" | "High" | "Moderate" | "Low";
  meta: US100DataMeta;
}

export interface US100CompanyProfile {
  symbol: string;
  name: string;
  marketCap: number;
  sector: string;
  industry: string;
  description: string;
  website: string;
  ceo: string;
  employees: number;
  meta: US100DataMeta;
}

export interface US100MarketBreadth {
  advanceDecline: string;
  newHighs: number;
  newLows: number;
  breadthScore: number;
  overallHealth: "Healthy" | "Mixed" | "Weak" | "Critical";
  meta: US100DataMeta;
}

export const US100_SECTOR_ETF_MAP: Record<string, string> = {
  technology: "XLK",
  semiconductors: "SMH",
  healthcare: "XLV",
  financials: "XLF",
  industrials: "XLI",
  energy: "XLE",
  utilities: "XLU",
  consumer: "XLY",
  communication: "XLC",
};

export const US100_FMP_INDEX_SYMBOL = "^GSPC";
