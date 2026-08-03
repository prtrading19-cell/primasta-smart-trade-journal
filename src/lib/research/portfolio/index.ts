export {
  PortfolioIntelligenceEngine,
  buildPortfolioIntelligence,
  globalPortfolioTimeline,
  globalPortfolioHistory,
} from "./PortfolioIntelligenceEngine";
export type { PortfolioIntelligenceOptions } from "./PortfolioIntelligenceEngine";

export {
  PortfolioPositionEngine,
  evaluatePortfolioPosition,
  actionScore,
  riskScoreToLevel,
  biasToScore,
} from "./PortfolioPositionEngine";
export type { PositionEngineInput, PositionEngineOutput } from "./PortfolioPositionEngine";

export { CrossAssetCorrelationEngine, computeCrossAssetCorrelation } from "./CrossAssetCorrelationEngine";
export type { CorrelationSeries } from "./CrossAssetCorrelationEngine";

export { ExposureEngine, computeExposure } from "./ExposureEngine";
export type { ExposureEngineInput } from "./ExposureEngine";

export { DiversificationEngine, computeDiversification } from "./DiversificationEngine";
export type { DiversificationEngineInput } from "./DiversificationEngine";

export { PortfolioRiskEngine, computePortfolioRisk, riskLevelScore } from "./PortfolioRiskEngine";
export type { RiskEngineInput } from "./PortfolioRiskEngine";

export { CapitalAllocationEngine, computeCapitalAllocation } from "./CapitalAllocationEngine";
export type { AllocationEngineInput } from "./CapitalAllocationEngine";

export { HedgingEngine, computeHedging } from "./HedgingEngine";
export type { HedgingEngineInput } from "./HedgingEngine";

export { PortfolioDecisionEngine, computePortfolioDecision } from "./PortfolioDecisionEngine";
export type { DecisionEngineInput } from "./PortfolioDecisionEngine";

export { PortfolioSummaryEngine, computePortfolioSummary } from "./PortfolioSummaryEngine";
export type { SummaryEngineInput } from "./PortfolioSummaryEngine";

export { PortfolioTimeline } from "./PortfolioTimeline";
export { PortfolioHistory } from "./PortfolioHistory";

export type {
  PortfolioAssetConfig,
  PortfolioPosition,
  PositionState,
  PositionDirection,
  CorrelationCell,
  CorrelationMatrix,
  ExposureItem,
  ExposureResult,
  DiversificationResult,
  AssetRiskItem,
  RiskCluster,
  PortfolioRiskResult,
  AllocationSuggestion,
  AllocationAction,
  CapitalAllocationResult,
  HedgeSuggestion,
  HedgeType,
  HedgingResult,
  PortfolioConflict,
  PortfolioOpportunity,
  PortfolioWarning,
  InstitutionalFlowItem,
  PortfolioBias,
  PortfolioDecision,
  PortfolioAction,
  PortfolioSummary,
  PortfolioTimelineEntry,
  PortfolioHistoryEntry,
  PortfolioDataQuality,
  PortfolioIntelligenceResult,
} from "./types";

export {
  PORTFOLIO_MIN_SNAPSHOTS_FOR_CORRELATION,
  RISK_SCORE_BY_LEVEL,
  RISK_LEVEL_BY_SCORE,
  HEDGE_VEHICLES,
  MACRO_HEDGE_SUGGESTIONS,
  ALLOCATION_ACTION_THRESHOLD,
  ALLOCATION_SCALE_IN_SCORE,
  ALLOCATION_SCALE_OUT_SCORE,
  ALLOCATION_CASH_RESERVE_LEVELS,
  REFERENCE_ASSET_SERIES,
} from "./config";
export type { ReferenceAssetSeries } from "./config";
