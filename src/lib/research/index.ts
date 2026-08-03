import "./initialize";

export type {
  ResearchAsset,
  ResearchProfile,
  ResearchSection,
  ResearchFillResponse,
  ResearchSummary,
  ResearchEngineInput,
  ResearchEngineResult,
  ResearchServiceRequest,
  ResearchServiceResponse,
  ResearchAIRequest,
  ResearchAIResult,
  ResearchAISectionResult,
  ResearchAISummaryResult,
  ResearchDecisionInput,
  PipelineDiagnostics,
  EngineDiagnostic,
  PipelineStatus,
  EngineStatus,
  OrchestratorOptions,
  DriverBias,
  DriverStrength,
  DriverAnalysisObject,
  WeightConfiguration,
  CategoryScoreBatchResult,
  TechnicalInput,
  TechnicalBiasResult,
  InstitutionalFlowInput,
  InstitutionalFlowResult,
  DecisionEngineResult,
  DecisionAction,
  RiskRating,
  DecisionQuality,
  Contributor,
  AlignmentBreakdown,
  ConflictBreakdown,
  DecisionExplanation,
} from "./ResearchTypes";

export {
  registerProfile,
  getProfile,
  listProfiles,
  hasProfile,
  getRegisteredAssets,
} from "./ResearchRegistry";

export {
  executeResearchEngine,
  buildAutoSummary,
} from "./ResearchEngine";

export {
  analyzeResearchAsset,
  validateResearchRequest,
  buildAutoFillSummary,
  getResearchProfile,
  healthCheck,
} from "./ResearchService";

export {
  calculateResearchDecision,
} from "./ResearchDecisionEngine";

export {
  calculateInstitutionalDecision,
} from "./InstitutionalDecisionEngine";

export {
  buildAssetAnalystInstruction,
  buildAssetAnalystPrompt,
  buildAssetDataContext,
  requestAssetAIAnalysis,
} from "./ResearchAI";

export { GOLD_PROFILE } from "./profiles/GoldProfile";
export { US100_PROFILE } from "./profiles/US100Profile";

export {
  buildDecisionContext,
  calculateConfidence,
  calculateAlignment,
  calculateRisk,
  calculateDecisionV2,
  buildExplainability,
  buildEvidence,
  buildAIPrompt,
  buildDecisionReport,
  confidenceLevel,
  riskClass,
  alignmentStrength,
  alignmentDirection,
} from "./engines";

export type {
  DecisionContextRaw,
  DecisionContext,
  MarketStructure,
  Liquidity,
  InstitutionalPositioning,
  MacroBias,
  TechnicalRisk,
  MarketParticipation,
  ConfidenceInputs,
  ConfidenceResult,
  ConfidenceLevel,
  AlignmentResult,
  AlignmentDirection,
  AlignmentStrength,
  RiskResult,
  RiskClass,
  DecisionV2Result,
  DecisionV2Action,
  ProviderAgreement,
  ProviderDisagreement,
  ExplainabilityResult,
  EvidenceRecord,
  DecisionReport,
  DecisionReportSection,
  AIPromptInput,
  DecisionV2Input,
  ExplainabilityInput,
  DecisionReportInput,
} from "./engines";

export { run } from "./engine/ResearchPipeline";
export type { PipelineResult } from "./engine/ResearchPipeline";

export {
  executeDriverEngine,
  executeCategoryEngine,
  executeInstitutionalEngine,
  executeTechnicalEngine,
  executeBiasEngine,
  executeDecisionEngine,
  executeResearchSummaryEngine,
  buildSummarySections,
  identifyMissingData,
  buildAIResearchPrompt,
} from "./engine";

export type {
  ResearchDataset,
  ResearchDriver,
  ResearchCategory,
  ResearchInstitutional,
  ResearchTechnical,
  ResearchBias,
  ResearchDecision,
  ResearchSummarySection,
  ResearchSummaryInput,
  InstitutionalEngineInput,
  TechnicalEngineInput,
  BiasEngineInput,
  ResearchSummary as EngineResearchSummary,
} from "./models";

export { createEmptyDataset } from "./models";

/* ── Phase 17: Multi-Asset Framework ── */
export {
  registerAsset,
  getAssetConfig as getAssetConfigFromRegistry,
  getRegisteredAssets as getRegisteredAssetConfigs,
  getEnabledAssets as getEnabledAssetConfigs,
  getAssetClass,
  getAssetCategories,
  getAssetPrompts,
  getAssetDashboard,
  getAssetTrackedSymbols,
} from "./asset/AssetRegistry";
export type {
  AssetClass,
  AssetConfiguration,
  ProviderConfig,
  CategoryConfig,
  PromptConfig,
  DashboardConfig,
} from "./asset/types";

export { GOLD_ASSET_CONFIG, US100_ASSET_CONFIG } from "./assets";

export {
  ensureAssetRegistryLoaded,
  getConfig as loadAssetConfig,
  runAssetPipeline,
  runFullAssetPipeline,
  collectAssetData,
  registerDatasetConverter,
} from "./config";
export type { AssetPipelineInput, AssetPipelineOutput } from "./config";

/* ── Phase 19: Decision Intelligence ── */
export {
  runDecisionIntelligence,
  globalTimeline,
  globalDecisionHistory,
  buildEvidenceRecords,
  getEvidenceByCategory,
  countEvidenceByCategory,
  calculateDecisionConfidence,
  detectConflicts,
  generateScenarios,
  assessRisk,
  buildDecisionExplanation,
  generateAiSummary,
  ResearchTimeline,
  DecisionHistory,
} from "./decision";

export type {
  EvidenceRecord as DecisionIntelligenceEvidenceRecord,
  ConfidenceBreakdown,
  ConflictResult,
  ScenarioResult,
  ScenarioCase,
  RiskAssessment,
  RiskLevel,
  DecisionExplanation as DecisionExplanationV2,
  TimelineEntry,
  DecisionHistoryEntry,
  DecisionIntelligenceResult,
  ScenarioType,
} from "./decision";

/* ── Phase 20: Research Repository & Analytics ── */
export {
  ResearchRepository,
  computeHistoricalAnalytics,
  computeProviderAnalytics,
  computeDecisionAnalytics,
  computeEvidenceAnalytics,
  AssetHistory,
  globalAssetHistory,
} from "./repository";

export type {
  ResearchSnapshot,
  SnapshotFilter,
  RepositoryStatistics,
  SnapshotOrigin,
  AssetOverview,
  HistoricalAnalyticsResult,
  ConfidenceTimePoint,
  RiskTimePoint,
  ConflictTimePoint,
  ProviderAnalyticsRecord,
  DecisionAnalyticsResult,
  EvidenceAnalyticsResult,
  CategoryBiasBreakdown,
  BiasAggregation,
} from "./repository";

/* ── Phase 21: Portfolio Intelligence ── */
export {
  PortfolioIntelligenceEngine,
  buildPortfolioIntelligence,
  globalPortfolioTimeline,
  globalPortfolioHistory,
  PortfolioPositionEngine,
  evaluatePortfolioPosition,
  actionScore,
  riskScoreToLevel,
  biasToScore,
  CrossAssetCorrelationEngine,
  computeCrossAssetCorrelation,
  ExposureEngine,
  computeExposure,
  DiversificationEngine,
  computeDiversification,
  PortfolioRiskEngine,
  computePortfolioRisk,
  riskLevelScore,
  CapitalAllocationEngine,
  computeCapitalAllocation,
  HedgingEngine,
  computeHedging,
  PortfolioDecisionEngine,
  computePortfolioDecision,
  PortfolioSummaryEngine,
  computePortfolioSummary,
  PortfolioTimeline,
  PortfolioHistory,
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
} from "./portfolio";

export type {
  PortfolioIntelligenceOptions,
  PositionEngineInput,
  PositionEngineOutput,
  CorrelationSeries,
  ExposureEngineInput,
  DiversificationEngineInput,
  RiskEngineInput,
  AllocationEngineInput,
  HedgingEngineInput,
  DecisionEngineInput,
  SummaryEngineInput,
  ReferenceAssetSeries,
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
} from "./portfolio";
