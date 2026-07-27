import type { DriverBias } from "@/types/goldResearchConfig";
import type { DecisionEngineResult, Contributor, AlignmentBreakdown, ConflictBreakdown, DecisionExplanation } from "@/types/decisionEngine";

export type TradeRecommendation =
  | "BUY"
  | "BUY ON PULLBACK"
  | "WAIT"
  | "REDUCE RISK"
  | "SELL"
  | "STRONG SELL";

export type InstitutionalMarketBias =
  | "Strong Bullish"
  | "Bullish"
  | "Neutral"
  | "Bearish"
  | "Strong Bearish";

export type InstitutionalRiskRating =
  | "Very Low"
  | "Low"
  | "Moderate"
  | "High"
  | "Extreme";

export type CategoryStatus =
  | "Available"
  | "Partial"
  | "Unavailable";

export interface CategoryBreakdown {
  categoryId: string;
  categoryTitle: string;
  rawScore: number;
  weightedScore: number;
  weight: number;
  contribution: number;
  confidence: number;
  status: CategoryStatus;
  bullishDrivers: string[];
  bearishDrivers: string[];
  missingDrivers: string[];
}

export interface InstitutionalExplanation {
  marketBias: string;
  topBullishDrivers: string[];
  topBearishDrivers: string[];
  institutionalRisks: string[];
  tradePlan: string;
  confidenceSummary: string;
}

export interface InstitutionalDecisionResult {
  baseDecision: DecisionEngineResult;
  overallScore: number;
  marketBias: InstitutionalMarketBias;
  recommendation: TradeRecommendation;
  riskRating: InstitutionalRiskRating;
  confidence: number;
  categoryBreakdown: CategoryBreakdown[];
  topBullishDrivers: string[];
  topBearishDrivers: string[];
  explanation: InstitutionalExplanation;
  diagnosticsSummary: string[];
  timestamp: string;
}
