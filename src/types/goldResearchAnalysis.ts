import type { DriverAnalysisObject, DriverBias, DriverStrength, WeightConfiguration } from "@/types/goldResearchConfig";
import type { CategoryScoreBatchResult } from "@/lib/categoryScoreEngine";
import type { TechnicalInput, TechnicalBiasResult } from "@/types/technicalBias";
import type { InstitutionalFlowInput, InstitutionalFlowResult } from "@/types/institutionalFlow";
import type { DecisionEngineResult } from "@/types/decisionEngine";

export type PipelineStage =
  | "validation"
  | "category-scoring"
  | "technical-bias"
  | "institutional-flow"
  | "decision-engine"
  | "diagnostics"
  | "complete";

export type PipelineStatus = "success" | "partial" | "failed";

export type EngineStatus = "success" | "skipped" | "failed" | "not-provided";

export interface GoldResearchAnalysisInput {
  driverAnalyses: DriverAnalysisObject[];
  technicalInput?: TechnicalInput;
  institutionalInput?: InstitutionalFlowInput;
  weightConfiguration?: WeightConfiguration;
  currentPrice?: number;
  timestamp?: string;
  notes?: string;
  options?: OrchestratorOptions;
}

export interface OrchestratorOptions {
  skipCategoryScoring?: boolean;
  skipTechnicalBias?: boolean;
  skipInstitutionalFlow?: boolean;
  skipDecisionEngine?: boolean;
  continueOnEngineFailure?: boolean;
  categoryIds?: string[];
}

export interface EngineDiagnostic {
  engine: string;
  status: EngineStatus;
  executionTimeMs: number;
  error?: string;
  warnings: string[];
  inputFieldsAvailable: number;
  inputFieldsRequired: number;
}

export interface PipelineDiagnostics {
  totalExecutionTimeMs: number;
  stageTimings: Record<PipelineStage, number>;
  engines: EngineDiagnostic[];
  overallStatus: PipelineStatus;
  warnings: string[];
  errors: string[];
}

export interface GoldResearchAnalysis {
  rawInputs: {
    driverAnalyses: DriverAnalysisObject[];
    technicalInput?: TechnicalInput;
    institutionalInput?: InstitutionalFlowInput;
    weightConfiguration?: WeightConfiguration;
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

export const GOLD_RESEARCH_ANALYSIS_SCHEMA_VERSION = "1.0.0";
