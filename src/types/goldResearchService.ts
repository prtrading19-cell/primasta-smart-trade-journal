import type { DriverAnalysisObject, DriverBias, WeightConfiguration } from "@/types/goldResearchConfig";
import type { TechnicalInput, TechnicalBiasResult } from "@/types/technicalBias";
import type { InstitutionalFlowInput, InstitutionalFlowResult } from "@/types/institutionalFlow";
import type { CategoryScoreBatchResult } from "@/lib/categoryScoreEngine";
import type { DecisionEngineResult, DecisionAction, RiskRating, DecisionQuality } from "@/types/decisionEngine";
import type { GoldResearchAnalysis, PipelineDiagnostics, OrchestratorOptions } from "@/types/goldResearchAnalysis";

export type ServiceStatus = "ok" | "degraded" | "error";

export type RequestMethod =
  | "analyzeResearch"
  | "validateResearch"
  | "previewResearch"
  | "recalculateResearch"
  | "summarizeResearch"
  | "healthCheck";

export interface GoldResearchServiceRequest {
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

export interface GoldResearchServiceResponse {
  success: boolean;
  status: ServiceStatus;
  analysis?: GoldResearchAnalysis;
  validation?: ServiceValidationResult;
  summary?: ServiceResearchSummary;
  health?: ServiceHealthResult;
  errors: ServiceError[];
  warnings: string[];
  metadata: ServiceMetadata;
}

export interface ServiceValidationResult {
  isValid: boolean;
  errors: ServiceValidationError[];
  warnings: ServiceValidationWarning[];
  driverCount: number;
  categoryCoverage: string[];
  dataQualityScore: number;
}

export interface ServiceValidationError {
  code: string;
  message: string;
  field?: string;
  severity: "error" | "warning";
}

export interface ServiceValidationWarning {
  code: string;
  message: string;
  field?: string;
}

export interface ServiceResearchSummary {
  overallBias: DriverBias;
  decision: DecisionAction;
  goldScore: number;
  confidence: number;
  riskRating: RiskRating;
  decisionQuality: DecisionQuality;
  topDrivers: string[];
  riskFactors: string[];
  keyInsight: string;
}

export interface ServiceHealthResult {
  status: ServiceStatus;
  enginesAvailable: string[];
  enginesMissing: string[];
  schemaVersion: string;
  uptime: boolean;
}

export interface ServiceError {
  code: string;
  message: string;
  stage?: string;
  recoverable: boolean;
}

export interface ServiceMetadata {
  requestId: string;
  method: RequestMethod;
  executionTimeMs: number;
  timestamp: string;
  schemaVersion: string;
  engineVersions: Record<string, string>;
}

export const GOLD_RESEARCH_SERVICE_SCHEMA_VERSION = "1.0.0";

export const ENGINE_VERSIONS: Record<string, string> = {
  "CategoryScoreEngine": "1.0.0",
  "TechnicalBiasEngine": "1.0.0",
  "InstitutionalFlowEngine": "1.0.0",
  "DecisionEngine": "1.0.0",
  "GoldResearchOrchestrator": "1.0.0",
  "GoldResearchService": "1.0.0"
};
