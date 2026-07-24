export type DriverBias = "Strong Bullish" | "Bullish" | "Neutral" | "Bearish" | "Strong Bearish";
export type DriverStrength = "Strong" | "Moderate" | "Weak" | "None";
export type DriverTrend = "Rising" | "Falling" | "Stable" | "Accelerating" | "Decelerating";
export type HistoricalChange = "Improving" | "Deteriorating" | "Stable" | "New Development";
export type EconomicSurprise = "Above Consensus" | "At Consensus" | "Below Consensus" | "N/A";
export type TrendMagnitude = "Significant" | "Moderate" | "Minimal";
export type SurpriseMagnitude = "Major" | "Minor" | "Negligible";

export type DataSourceType =
  | "twelvedata"
  | "fred"
  | "cftc"
  | "world-gold-council"
  | "exchange"
  | "news-api"
  | "ai-analysis"
  | "manual"
  | "composite";

export interface DriverRegistryEntry {
  id: string;
  title: string;
  shortTitle: string;
  category: string;
  order: number;
  source: DataSourceType;
  sourceUrl?: string;
  enabled: boolean;
  weight: number;
  defaultWeight: number;
  supportsTrend: boolean;
  supportsHistory: boolean;
  supportsEconomicSurprise: boolean;
  supportsInstitutionalFlow: boolean;
  supportsTechnicalBias: boolean;
  icon?: string;
  color?: string;
  description: string;
  detailPlaceholder?: string;
}

export interface CategoryDefinition {
  id: string;
  title: string;
  description: string;
  driverIds: string[];
  defaultWeight: number;
  icon?: string;
  color?: string;
}

export interface CategoryWeightConfig {
  categoryId: string;
  weight: number;
  driverWeights: DriverWeightConfig[];
}

export interface DriverWeightConfig {
  driverId: string;
  weight: number;
}

export interface WeightConfiguration {
  categoryWeights: CategoryWeightConfig[];
}

export interface DriverAnalysisObject {
  driverId: string;
  driverTitle: string;
  categoryId: string;
  bias: DriverBias;
  biasReason: string;
  strength: DriverStrength;
  strengthFactors: string[];
  confidence: number;
  confidenceReason: string;
  trend?: DriverTrend;
  trendMagnitude?: TrendMagnitude;
  history?: DriverHistoricalContext;
  economicSurprise?: EconomicSurprise;
  surpriseMagnitude?: SurpriseMagnitude;
  consensusValue?: string;
  actualValue?: string;
  technicalObservation: string;
  technicalLevels?: Record<string, string>;
  supportingDrivers: string[];
  conflictingDrivers: string[];
  reason: string;
  aiExplanation: string;
  source: string;
  sourceUrl: string;
  sourceDate?: string;
  timestamp: string;
  weight: number;
  contribution: number;
  dataFields: Record<string, string>;
  categoryWeight?: number;
  weightedScore?: number;
  categoryOrder?: number;
  isPrimaryDriver?: boolean;
  dataFreshness?: "current" | "recent" | "stale" | "unknown";
  newsRecency?: string;
  chartRecency?: string;
}

export interface DriverHistoricalContext {
  current: string;
  previous: string;
  weekly: string;
  monthly: string;
  historicalNote?: string;
}

export interface CategoryScoreObject {
  categoryId: string;
  categoryTitle: string;
  score: number;
  bias: DriverBias | "Neutral";
  confidence: number;
  driverCount: number;
  reason: string;
  drivers: string[];
  timestamp: string;
  weight: number;
  weightedScore: number;
  driverContributions: DriverContribution[];
  alignmentScore: number;
  alignmentStrength: "Strong" | "Moderate" | "Weak" | "None";
  hasConflict: boolean;
}

export interface DriverContribution {
  driverId: string;
  driverTitle: string;
  bias: DriverBias;
  strength: DriverStrength;
  confidence: number;
  weight: number;
  contribution: number;
  reason: string;
}

export interface GoldDecisionEngineOutput {
  macroScore: number;
  technicalScore: number;
  institutionalScore: number;
  sentimentScore: number;
  riskScore: number;
  finalGoldScore: number;
  overallBias: DriverBias | "Neutral";
  confidence: number;
  decision: "Buy" | "Sell" | "Wait";
  supportingDrivers: string[];
  conflictingDrivers: string[];
  driverAlignment: number;
  alignmentStrength: "Strong" | "Moderate" | "Weak";
  reasoningSummary: string;
  riskWarnings: string[];
  timestamp: string;
  reportId?: string;
}

export interface InstitutionalFlowOutput {
  etfFlowBias: string;
  etfFlowMagnitude: string;
  centralBankBias: string;
  centralBankVolume: string;
  cotCommercialNet: string;
  cotSpeculatorNet: string;
  openInterestTrend: string;
  crowdBias: string;
  institutionalStrength: string;
  institutionalBias: string;
  crowdedTradeRisk: string;
  reason: string;
  dataSources: string[];
  timestamp: string;
}

export interface TechnicalBiasOutput {
  technicalBias: DriverBias;
  technicalConfidence: number;
  htfTrend: string;
  dailyTrend: string;
  fourHTrend: string;
  marketStructure: string;
  liquidityAssessment: string;
  orderFlowAssessment: string;
  setupPresent: boolean;
  setupType: string;
  supportLevels: string[];
  resistanceLevels: string[];
  reason: string;
  timestamp: string;
}

export const BIAS_NUMERIC_MAP: Record<DriverBias, number> = {
  "Strong Bullish": 2.0,
  "Bullish": 1.0,
  "Neutral": 0.0,
  "Bearish": -1.0,
  "Strong Bearish": -2.0,
};

export const STRENGTH_MULTIPLIER_MAP: Record<DriverStrength, number> = {
  "Strong": 1.0,
  "Moderate": 0.75,
  "Weak": 0.5,
  "None": 0.0,
};
