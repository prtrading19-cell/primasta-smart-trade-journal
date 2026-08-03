import type { AssetClass } from "../asset/types";
import type { ResearchAsset } from "../ResearchTypes";
import type { RiskLevel } from "../decision/types";
import type { DriverBias } from "@/types/goldResearchConfig";
import type { DecisionAction } from "../models";

export interface PortfolioAssetConfig {
  assetId: ResearchAsset;
  name: string;
  displayName: string;
  assetClass: AssetClass;
  enabled: boolean;
  baseCurrency: string;
  quoteCurrency?: string;
}

export type PositionState = "Waiting" | "Active" | "Reduced" | "Closed" | "Invalidated";
export type PositionDirection = "long" | "short" | "flat";

export interface PortfolioPosition {
  assetId: string;
  assetName: string;
  assetClass: AssetClass;
  state: PositionState;
  direction: PositionDirection;
  action: DecisionAction;
  bias: DriverBias;
  score: number;
  confidence: number;
  riskLevel: RiskLevel;
  riskScore: number;
  conflictScore: number;
  conflictSeverity: string;
  openedAt: string | null;
  updatedAt: string;
  reason: string;
  invalidationReasons: string[];
}

export interface CorrelationCell {
  assetA: string;
  assetB: string;
  coefficient: number | null;
  points: number;
  status: "computed" | "insufficient";
  strength: "strong" | "moderate" | "weak" | "none" | "unavailable";
  interpretation: string;
}

export interface CorrelationMatrix {
  assets: string[];
  cells: CorrelationCell[];
  methodology: string;
  generatedAt: string;
}

export interface ExposureItem {
  assetId: string;
  assetName: string;
  assetClass: AssetClass;
  exposurePercent: number;
  signalScore: number;
  direction: PositionDirection;
  confidence: number;
  weight: number;
}

export interface ExposureResult {
  totalExposure: number;
  netExposure: number;
  grossExposure: number;
  concentration: number;
  concentrationLabel: string;
  items: ExposureItem[];
}

export interface DiversificationResult {
  score: number;
  effectiveAssetCount: number;
  averageCorrelation: number | null;
  highestCorrelation: CorrelationCell | null;
  lowestCorrelation: CorrelationCell | null;
  assessment: string;
  warnings: string[];
}

export interface AssetRiskItem {
  assetId: string;
  assetName: string;
  assetClass: AssetClass;
  overallRisk: RiskLevel;
  overallScore: number;
  contribution: number;
}

export interface RiskCluster {
  assetA: string;
  assetB: string;
  reason: string;
}

export interface PortfolioRiskResult {
  overallRisk: RiskLevel;
  overallScore: number;
  perAsset: AssetRiskItem[];
  correlationImpact: "diversifying" | "neutral" | "concentrating";
  riskClusters: RiskCluster[];
  assessment: string;
}

export type AllocationAction = "Increase" | "Reduce" | "Wait" | "Rotate" | "Scale In" | "Scale Out";

export interface AllocationSuggestion {
  assetId: string;
  assetName: string;
  action: AllocationAction;
  currentWeight: number;
  suggestedWeight: number;
  delta: number;
  conviction: number;
  reason: string;
}

export interface CapitalAllocationResult {
  suggestions: AllocationSuggestion[];
  targetAllocation: { assetId: string; weight: number }[];
  cashReservePercent: number;
  methodology: string;
}

export type HedgeType = "concentration" | "risk-cluster" | "conflict" | "macro" | "institutional" | "volatility";

export interface HedgeSuggestion {
  id: string;
  type: HedgeType;
  severity: "Low" | "Medium" | "High";
  instrument: string;
  rationale: string;
  assets: string[];
  effectiveness: number;
}

export interface HedgingResult {
  suggestions: HedgeSuggestion[];
  netExposureDirection: PositionDirection;
  concentrationExposure: number;
  summary: string;
}

export interface PortfolioConflict {
  assetA: string;
  assetB: string;
  severity: string;
  description: string;
}

export interface PortfolioOpportunity {
  assetId: string;
  assetName: string;
  type: string;
  conviction: number;
  description: string;
}

export interface PortfolioWarning {
  severity: "Low" | "Medium" | "High";
  category: string;
  message: string;
  assets: string[];
}

export interface InstitutionalFlowItem {
  assetId: string;
  assetName: string;
  sources: string[];
  cotNetCommercial: number | null;
  etfFlowDirection: string | null;
  openInterestTrend: string | null;
  breadthScore: number | null;
  volatilityRating: string | null;
  vix: number | null;
  gvz: number | null;
  macroSummary: string;
  flowBias: DriverBias;
  flowScore: number;
  timestamp: string;
}

export interface PortfolioBias {
  overallBias: DriverBias;
  overallScore: number;
  confidence: number;
  alignmentScore: number;
  conflictScore: number;
}

export type PortfolioAction = "ACCUMULATE" | "HEDGE" | "REDUCE" | "WAIT" | "REBALANCE";

export interface PortfolioDecision {
  bias: DriverBias;
  action: PortfolioAction;
  score: number;
  confidence: number;
  risk: RiskLevel;
  reasoning: string[];
}

export interface PortfolioSummary {
  headline: string;
  overview: string;
  keyPoints: string[];
  tags: string[];
}

export interface PortfolioTimelineEntry {
  timestamp: string;
  engine: string;
  result: string;
  confidence: number;
  durationMs: number;
}

export interface PortfolioHistoryEntry {
  id: string;
  timestamp: string;
  bias: DriverBias;
  score: number;
  confidence: number;
  risk: RiskLevel;
  positionCount: number;
  summary: string;
}

export interface PortfolioDataQuality {
  assetsTracked: number;
  assetsWithData: number;
  missingAssets: string[];
  snapshotCount: number;
  providerCacheHits: number;
  usedFallback: boolean;
}

export interface PortfolioIntelligenceResult {
  generatedAt: string;
  assets: PortfolioAssetConfig[];
  positions: PortfolioPosition[];
  correlation: CorrelationMatrix;
  exposure: ExposureResult;
  diversification: DiversificationResult;
  risk: PortfolioRiskResult;
  allocation: CapitalAllocationResult;
  hedging: HedgingResult;
  conflicts: PortfolioConflict[];
  opportunities: PortfolioOpportunity[];
  warnings: PortfolioWarning[];
  institutionalFlows: InstitutionalFlowItem[];
  decision: PortfolioDecision;
  summary: PortfolioSummary;
  timeline: PortfolioTimelineEntry[];
  history: PortfolioHistoryEntry[];
  dataQuality: PortfolioDataQuality;
}
