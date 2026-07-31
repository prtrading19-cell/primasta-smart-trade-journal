import type { DriverBias } from "@/types/goldResearchConfig";

export type ConfidenceLevel = "Very High" | "High" | "Moderate" | "Low" | "Very Low";
export type RiskClass = "Low" | "Moderate" | "Elevated" | "High" | "Extreme";
export type AlignmentDirection = "Bullish" | "Bearish" | "Neutral" | "Mixed";
export type AlignmentStrength = "Strong" | "Moderate" | "Weak" | "None";

export interface DecisionContextRaw {
  macro?: {
    indicators: { name: string; value: string; trend?: string }[];
    fedFunds?: string;
    cpi?: string;
    gdp?: string;
    employment?: string;
  };
  volatility?: {
    vix: number;
    gvz?: number;
    vixPercentile?: number;
    vixChange?: number;
  };
  etfFlows?: {
    etfs: { symbol?: string; flowDirection: string; netFlow?: number }[];
    totalInflow?: number;
    totalOutflow?: number;
    netFlow?: number;
  };
  cot?: {
    contractName?: string;
    nonCommercials: { netLong: number; long: number; short: number };
    commercials: { netLong: number; long: number; short: number };
    totalOpenInterest?: number;
  }[];
  openInterest?: {
    currentLevel?: number;
    changeFromPrevious?: number;
    trend?: string;
  };
  breadth?: {
    advancing: number;
    declining: number;
    unchanged?: number;
    ratio?: number;
  };
  sectors?: {
    [key: string]: number;
  };
}

export interface MarketStructure {
  trend: "Bullish" | "Bearish" | "Neutral" | "Mixed";
  strength: number;
  breadth: number;
  sectorRotation: "Rotation Into" | "Rotation Out Of" | "Rotational" | "None";
  dominantSectors: string[];
}

export interface Liquidity {
  openInterestTrend: "Rising" | "Falling" | "Flat" | "Unknown";
  openInterestChange: number;
  volumeParticipation: number;
  liquidityScore: number;
  assessment: string;
}

export interface InstitutionalPositioning {
  etfDirection: string;
  commercialPositioning: string;
  speculatorPositioning: string;
  netPositioning: number;
  crowdingLevel: string;
  positioningScore: number;
}

export interface MacroBias {
  bias: DriverBias;
  score: number;
  keyIndicators: { name: string; impact: string }[];
  fedPolicyImpact: string;
  economicHealth: string;
}

export interface TechnicalRisk {
  vixLevel: number;
  gvzLevel?: number;
  volatilityRegime: "Low" | "Normal" | "Elevated" | "High" | "Extreme";
  vixPercentile: number;
  riskScore: number;
}

export interface MarketParticipation {
  breadthRatio: number;
  advancingStocks: number;
  decliningStocks: number;
  participationScore: number;
  assessment: string;
}

export interface ConfidenceInputs {
  providerAvailability: number;
  providerFreshness: number;
  providerAgreement: number;
  signalQuality: number;
  historicalConsistency: number;
}

export interface DecisionContext {
  marketStructure: MarketStructure;
  liquidity: Liquidity;
  institutionalPositioning: InstitutionalPositioning;
  macroBias: MacroBias;
  technicalRisk: TechnicalRisk;
  marketParticipation: MarketParticipation;
  confidenceInputs: ConfidenceInputs;
  timestamp: string;
}

export interface ConfidenceResult {
  score: number;
  level: ConfidenceLevel;
  components: {
    providerFreshness: number;
    providerAgreement: number;
    providerAvailability: number;
    signalQuality: number;
    conflictPenalty: number;
    historicalConsistency: number;
  };
  breakdown: string[];
}

export interface AlignmentResult {
  score: number;
  direction: AlignmentDirection;
  strength: AlignmentStrength;
  components: {
    etfAlignment: number;
    commercialAlignment: number;
    openInterestAlignment: number;
    breadthAlignment: number;
  };
  breakdown: string[];
}

export interface RiskResult {
  score: number;
  class: RiskClass;
  components: {
    gvzRisk: number;
    vixRisk: number;
    macroRisk: number;
    breadthRisk: number;
    cotRisk: number;
    openInterestRisk: number;
  };
  breakdown: string[];
}

export type DecisionV2Action = "Strong Buy" | "Buy" | "Wait" | "Sell" | "Strong Sell";

export interface DecisionV2Result {
  action: DecisionV2Action;
  score: number;
  bias: DriverBias;
  confidence: number;
  reasoning: string[];
  alignmentContribution: number;
  riskContribution: number;
  confidenceContribution: number;
}

export interface ProviderAgreement {
  providerId: string;
  bias: string;
  confidence: number;
  weight: number;
}

export interface ProviderDisagreement {
  providerId: string;
  bias: string;
  confidence: number;
  reason: string;
}

export interface ExplainabilityResult {
  reasoningChain: string[];
  providersAgreed: ProviderAgreement[];
  providersDisagreed: ProviderDisagreement[];
  missingProviders: string[];
  confidenceStatement: string;
  alignmentStatement: string;
  riskStatement: string;
}

export interface EvidenceRecord {
  category: string;
  provider: string;
  value: string;
  interpretation: string;
  confidence: number;
  bias: string;
  source: string;
}

export interface DecisionReportSection {
  title: string;
  content: string;
  data: Record<string, unknown>;
}

export interface DecisionReport {
  executiveSummary: string;
  institutionalPositioning: DecisionReportSection;
  macroOutlook: DecisionReportSection;
  liquidity: DecisionReportSection;
  risk: DecisionReportSection;
  confidence: DecisionReportSection;
  alignment: DecisionReportSection;
  recommendation: DecisionReportSection;
  evidence: EvidenceRecord[];
  missingData: string[];
  generatedAt: string;
}

export const CONFIDENCE_LEVEL_THRESHOLDS = {
  "Very High": 85,
  "High": 70,
  "Moderate": 50,
  "Low": 30,
  "Very Low": 0,
} as const;

export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 85) return "Very High";
  if (score >= 70) return "High";
  if (score >= 50) return "Moderate";
  if (score >= 30) return "Low";
  return "Very Low";
}

export const RISK_CLASS_THRESHOLDS = {
  Extreme: 80,
  High: 60,
  Elevated: 40,
  Moderate: 20,
  Low: 0,
} as const;

export function riskClass(score: number): RiskClass {
  if (score >= 80) return "Extreme";
  if (score >= 60) return "High";
  if (score >= 40) return "Elevated";
  if (score >= 20) return "Moderate";
  return "Low";
}

export const ALIGNMENT_STRENGTH_THRESHOLDS = {
  Strong: 75,
  Moderate: 50,
  Weak: 25,
  None: 0,
} as const;

export function alignmentStrength(score: number): AlignmentStrength {
  if (score >= 75) return "Strong";
  if (score >= 50) return "Moderate";
  if (score >= 25) return "Weak";
  return "None";
}

export function alignmentDirection(score: number): AlignmentDirection {
  if (score > 15) return "Bullish";
  if (score < -15) return "Bearish";
  return "Neutral";
}
