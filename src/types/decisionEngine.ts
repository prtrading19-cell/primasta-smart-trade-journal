import type { CategoryScoreBatchResult } from "@/lib/categoryScoreEngine";
import type { TechnicalBiasResult } from "@/types/technicalBias";
import type { InstitutionalFlowResult } from "@/types/institutionalFlow";
import type { DriverBias, DriverStrength, WeightConfiguration } from "@/types/goldResearchConfig";

export type DecisionAction = "Strong Buy" | "Buy" | "Wait" | "Sell" | "Strong Sell";
export type RiskRating = "Low" | "Medium" | "High" | "Extreme";
export type DecisionQuality = "High" | "Medium" | "Low";

export interface DecisionEngineInput {
  categoryScores: CategoryScoreBatchResult;
  technicalBias: TechnicalBiasResult;
  institutionalFlow: InstitutionalFlowResult;
  driverConfidence?: number;
  driverStrength?: DriverStrength;
  weightConfiguration?: WeightConfiguration;
  currentPrice?: number;
  timestamp?: string;
  notes?: string;
}

export interface Contributor {
  name: string;
  source: "Category" | "Technical" | "Institutional";
  score: number;
  bias: DriverBias;
  confidence: number;
  weight: number;
  contribution: number;
  reason: string;
}

export interface AlignmentBreakdown {
  categoryAlignment: number;
  technicalAlignment: number;
  institutionalAlignment: number;
  crossSourceAlignment: number;
  overallAlignment: number;
}

export interface ConflictBreakdown {
  categoryConflict: number;
  technicalConflict: number;
  institutionalConflict: number;
  crossSourceConflict: number;
  overallConflict: number;
  conflictDrivers: string[];
}

export interface DecisionExplanation {
  primaryReason: string;
  supportingReasons: string[];
  conflictingReasons: string[];
  riskFactors: string[];
  confidenceFactors: string[];
  sourceSummary: {
    category: string;
    technical: string;
    institutional: string;
  };
}

export interface DecisionEngineResult {
  overallGoldScore: number;
  overallBias: DriverBias;
  decision: DecisionAction;
  overallConfidence: number;
  riskRating: RiskRating;
  alignmentScore: number;
  conflictScore: number;
  decisionQuality: DecisionQuality;
  supportingDrivers: string[];
  conflictingDrivers: string[];
  topContributors: Contributor[];
  weakestContributors: Contributor[];
  summary: string;
  institutionalExplanation: DecisionExplanation;
  alignmentBreakdown: AlignmentBreakdown;
  conflictBreakdown: ConflictBreakdown;
  concentrationRisks: string[];
  timestamp: string;
  schemaVersion: string;
}

export const BIAS_TO_DIRECTION: Record<DriverBias, number> = {
  "Strong Bullish": 2.0,
  "Bullish": 1.0,
  "Neutral": 0.0,
  "Bearish": -1.0,
  "Strong Bearish": -2.0
};

export const DECISION_ACTION_NUMERIC: Record<DecisionAction, number> = {
  "Strong Buy": 2.0,
  "Buy": 1.0,
  "Wait": 0.0,
  "Sell": -1.0,
  "Strong Sell": -2.0
};

export const RISK_RATING_NUMERIC: Record<RiskRating, number> = {
  "Low": 0.0,
  "Medium": 0.33,
  "High": 0.66,
  "Extreme": 1.0
};

export const DECISION_QUALITY_NUMERIC: Record<DecisionQuality, number> = {
  "High": 1.0,
  "Medium": 0.5,
  "Low": 0.0
};

export const DECISION_ENGINE_SCHEMA_VERSION = "1.0.0";
