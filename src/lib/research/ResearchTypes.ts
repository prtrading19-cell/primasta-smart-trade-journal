import type { DriverBias, DriverStrength, DriverAnalysisObject, WeightConfiguration, DriverRegistryEntry, CategoryDefinition } from "@/types/goldResearchConfig";
import type { CategoryScoreBatchResult } from "@/lib/categoryScoreEngine";
import type { TechnicalInput, TechnicalBiasResult } from "@/types/technicalBias";
import type { InstitutionalFlowInput, InstitutionalFlowResult } from "@/types/institutionalFlow";
import type { DecisionEngineResult, DecisionAction, RiskRating, DecisionQuality, Contributor, AlignmentBreakdown, ConflictBreakdown, DecisionExplanation } from "@/types/decisionEngine";
import type { PipelineDiagnostics, EngineDiagnostic, PipelineStatus, EngineStatus, OrchestratorOptions } from "@/types/goldResearchAnalysis";

export type ResearchAsset = "gold" | "us100" | "spx500" | "btc" | "forex";

export interface ResearchProfile {
  asset: ResearchAsset;
  name: string;
  description: string;
  driverRegistry: DriverRegistryEntry[];
  categoryDefinitions: CategoryDefinition[];
  categoryWeights?: WeightConfiguration;
  aiSystemPrompt: string;
  aiAnalystInstruction: string;
  impactLabels: {
    bullish: string;
    bearish: string;
    neutral: string;
    mixed: string;
  };
  overallBiasLabels: {
    bullish: string;
    bearish: string;
    neutral: string;
    mixed: string;
  };
  preTradeVerdictLabels: {
    tradeAllowed: string;
    wait: string;
    avoidBeforeNews: string;
    manageExisting: string;
  };
  personalRule: string;
  supportedSections: string[];
  defaultDriverFields: Record<string, string>;
}

export interface ResearchSection {
  driver: string;
  currentDataValue: string;
  direction: string;
  newsHeadline: string;
  newsSummary: string;
  chartObservation: string;
  sourceLink: string;
  impact: string;
  reason: string;
  [key: string]: string;
}

export interface ResearchSummary {
  overallBias: string;
  bullishDrivers: string[];
  bearishDrivers: string[];
  mixedDrivers: string[];
  neutralDrivers: string[];
  strongestBullishDriver: string;
  strongestBearishDriver: string;
  mainRiskToday: string;
  bestSessionToTrade: string;
  preTradeVerdict: string;
  finalGuidance: string;
  personalRule: string;
  statistics: {
    bullishCount: number;
    bearishCount: number;
    mixedCount: number;
    neutralCount: number;
    totalDrivers: number;
    overallBias: string;
    confidence: number;
    alignment: string;
    institutionalScore: number;
  };
  tradeRecommendation: {
    action: "BUY" | "SELL" | "WAIT";
    reason: string;
    confidence: number;
  };
  engineDecisionUsed: boolean;
}

export interface ResearchFillResponse {
  date: string;
  currentPrice: string;
  sections: ResearchSection[];
  fullSummary: ResearchSummary;
  warning?: string;
}

export interface ResearchEngineInput {
  asset: ResearchAsset;
  driverAnalyses: DriverAnalysisObject[];
  currentPrice?: number;
  timestamp?: string;
  options?: OrchestratorOptions;
  researchBias?: string;
}

export interface ResearchEngineResult {
  asset: ResearchAsset;
  rawInputs: {
    driverAnalyses: DriverAnalysisObject[];
    currentPrice?: number;
  };
  driverAnalyses: DriverAnalysisObject[];
  categoryScores: CategoryScoreBatchResult;
  technicalBias: TechnicalBiasResult;
  institutionalFlow: InstitutionalFlowResult;
  decision: DecisionEngineResult;
  diagnostics: PipelineDiagnostics;
  warnings: string[];
  executionTimeMs: number;
  pipelineStatus: PipelineStatus;
  schemaVersion: string;
  timestamp: string;
}

export interface ResearchServiceRequest {
  asset: ResearchAsset;
  driverAnalyses: DriverAnalysisObject[];
  technicalInput?: TechnicalInput;
  institutionalInput?: InstitutionalFlowInput;
  weightConfiguration?: WeightConfiguration;
  currentPrice?: number;
  timestamp?: string;
  notes?: string;
  options?: OrchestratorOptions;
  researchBias?: string;
}

export interface ResearchServiceResponse {
  success: boolean;
  analysis?: ResearchEngineResult;
  error?: string;
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface ResearchAIRequest {
  asset: ResearchAsset;
  profile: ResearchProfile;
  dataContext: string;
  reportDate: string;
  sectionNames: string[];
}

export interface ResearchAISectionResult {
  driver: string;
  impact: string;
  reason: string;
  newsHeadline: string;
  newsSummary: string;
  chartObservation: string;
  sourceLink: string;
}

export interface ResearchAISummaryResult {
  overallBias: string;
  preTradeVerdict: string;
  finalGuidance: string;
}

export interface ResearchAIResult {
  sections: ResearchAISectionResult[];
  fullSummary: ResearchAISummaryResult;
}

export interface ResearchDecisionInput {
  asset: ResearchAsset;
  profile: ResearchProfile;
  driverAnalyses: DriverAnalysisObject[];
  categoryScores: CategoryScoreBatchResult;
  technicalBias: TechnicalBiasResult;
  institutionalFlow: InstitutionalFlowResult;
  researchBias?: string;
  currentPrice?: number;
}

export { PipelineDiagnostics, EngineDiagnostic, PipelineStatus, EngineStatus, OrchestratorOptions };
export { DriverBias, DriverStrength, DriverAnalysisObject, WeightConfiguration };
export { CategoryScoreBatchResult };
export { TechnicalInput, TechnicalBiasResult };
export { InstitutionalFlowInput, InstitutionalFlowResult };
export { DecisionEngineResult, DecisionAction, RiskRating, DecisionQuality, Contributor, AlignmentBreakdown, ConflictBreakdown, DecisionExplanation };
