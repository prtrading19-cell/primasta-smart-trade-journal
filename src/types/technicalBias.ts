export type TrendDirection = "Bullish" | "Bearish" | "Sideways" | "Unknown";
export type TrendStrength = "Strong" | "Moderate" | "Weak" | "None";
export type MarketStructure = "Bullish BOS" | "Bearish BOS" | "Bullish MSS" | "Bearish MSS" | "Ranging" | "Unknown";
export type SetupType = "Liquidity Sweep" | "BOS" | "MSS" | "FVG" | "OB" | "Retest" | "None" | "Unknown";
export type VolatilityLevel = "High" | "Moderate" | "Low" | "Unknown";
export type BreakoutStatus = "Breakout" | "Breakdown" | "None" | "Pending" | "Unknown";

export type Timeframe = "M1" | "M5" | "M15" | "H1" | "H4" | "D1" | "W1";

export interface TrendInput {
  direction: TrendDirection;
  strength: TrendStrength;
  duration?: string;
  description?: string;
}

export interface MomentumInput {
  rsi?: number;
  rsiInterpretation?: "Overbought" | "Oversold" | "Neutral";
  macd?: string;
  macdInterpretation?: "Bullish" | "Bearish" | "Neutral";
  stochastics?: string;
  stochasticsInterpretation?: "Overbought" | "Oversold" | "Neutral";
  atr?: number;
  atrContext?: string;
}

export interface MovingAverageInput {
  sma20?: number;
  sma50?: number;
  sma200?: number;
  ema9?: number;
  ema21?: number;
  ema50?: number;
  price?: number;
  alignment?: "Bullish" | "Bearish" | "Mixed" | "Unknown";
}

export interface StructureInput {
  supportLevels?: string[];
  resistanceLevels?: string[];
  marketStructure?: MarketStructure;
  higherTimeframeStructure?: TrendDirection;
  dailyStructure?: TrendDirection;
  fourHourStructure?: TrendDirection;
  liquiditySweep?: "Yes" | "No" | "Pending" | "Unknown";
  liquiditySweepDirection?: "Buy-Side" | "Sell-Side" | "Unknown";
  orderBlock?: string;
  fairValueGap?: string;
}

export interface BreakoutInput {
  status: BreakoutStatus;
  level?: string;
  confirmed?: boolean;
  volumeConfirmation?: boolean;
  retestPending?: boolean;
}

export interface VolatilityInput {
  level: VolatilityLevel;
  atrValue?: number;
  atrRelative?: string;
  bollingerBandWidth?: string;
  description?: string;
}

export interface SetupInput {
  present: boolean;
  type?: SetupType;
  grade?: "A+" | "A" | "B" | "C" | "None";
  entryZone?: string;
  invalidationLevel?: string;
}

export interface TechnicalInput {
  timeframe?: Timeframe;
  currentPrice?: number;
  trend?: TrendInput;
  momentum?: MomentumInput;
  movingAverages?: MovingAverageInput;
  structure?: StructureInput;
  breakout?: BreakoutInput;
  volatility?: VolatilityInput;
  setup?: SetupInput;
  notes?: string;
  timestamp?: string;
}

export interface TechnicalFactor {
  name: string;
  direction: "Bullish" | "Bearish" | "Neutral";
  strength: TrendStrength;
  weight: number;
  contribution: number;
  reason: string;
}

export interface TechnicalDataQuality {
  score: number;
  completeness: number;
  hasTrend: boolean;
  hasMomentum: boolean;
  hasStructure: boolean;
  hasVolatility: boolean;
  hasMovingAverages: boolean;
  missingFields: string[];
}

export interface TechnicalBiasResult {
  technicalBias: "Strong Bullish" | "Bullish" | "Neutral" | "Bearish" | "Strong Bearish";
  technicalScore: number;
  confidence: number;
  strength: TrendStrength;
  supportingFactors: string[];
  conflictingFactors: string[];
  summary: string;
  timestamp: string;
  dataQuality: TechnicalDataQuality;
  factors: TechnicalFactor[];
  timeframe: Timeframe;
  marketStructure: MarketStructure;
  setupPresent: boolean;
  setupType: SetupType;
  riskLevel: VolatilityLevel;
}

export const TREND_DIRECTION_NUMERIC: Record<TrendDirection, number> = {
  "Bullish": 1.0,
  "Bearish": -1.0,
  "Sideways": 0.0,
  "Unknown": 0.0
};

export const TREND_STRENGTH_MULTIPLIER: Record<TrendStrength, number> = {
  "Strong": 1.0,
  "Moderate": 0.7,
  "Weak": 0.4,
  "None": 0.0
};

export const MARKET_STRUCTURE_NUMERIC: Record<MarketStructure, number> = {
  "Bullish BOS": 1.5,
  "Bullish MSS": 1.0,
  "Bearish BOS": -1.5,
  "Bearish MSS": -1.0,
  "Ranging": 0.0,
  "Unknown": 0.0
};

export const SETUP_GRADE_NUMERIC: Record<string, number> = {
  "A+": 1.0,
  "A": 0.8,
  "B": 0.5,
  "C": 0.2,
  "None": 0.0
};
