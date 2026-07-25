import type {
  GoldResearchServiceRequest,
  GoldResearchServiceResponse,
  ServiceValidationResult,
  ServiceResearchSummary,
  ServiceHealthResult,
  ServiceMetadata,
  ServiceError
} from "@/types/goldResearchService";
import { GOLD_RESEARCH_SERVICE_SCHEMA_VERSION } from "@/types/goldResearchService";
import type { GoldResearchAnalysisInput } from "@/types/goldResearchAnalysis";
import type { DriverBias } from "@/types/goldResearchConfig";
import { orchestrateGoldResearch } from "./goldResearchOrchestrator";
import { validateServiceRequest } from "./goldResearchServiceValidators";
import {
  createServiceMetadata,
  createHealthResult,
  determineServiceStatus,
  createServiceError,
  collectPipelineWarnings,
  formatExecutionTime
} from "./goldResearchServiceDiagnostics";

export function analyzeResearch(
  request: GoldResearchServiceRequest
): GoldResearchServiceResponse {
  const startTime = performance.now();
  const errors: ServiceError[] = [];
  const warnings: string[] = [];

  const validation = validateServiceRequest(request);

  if (!validation.isValid) {
    const executionTimeMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      status: "error",
      validation,
      errors: validation.errors.map(e => createServiceError(e.code, e.message, e.field, false)),
      warnings: validation.warnings.map(w => w.message),
      metadata: createServiceMetadata("analyzeResearch", executionTimeMs)
    };
  }

  warnings.push(...validation.warnings.map(w => w.message));

  try {
    const orchestratorInput: GoldResearchAnalysisInput = {
      driverAnalyses: request.driverAnalyses,
      technicalInput: request.technicalInput,
      institutionalInput: request.institutionalInput,
      weightConfiguration: request.weightConfiguration,
      currentPrice: request.currentPrice,
      timestamp: request.timestamp,
      notes: request.notes,
      options: request.options,
      researchBias: request.researchBias
    };

    const analysis = orchestrateGoldResearch(orchestratorInput);

    warnings.push(...collectPipelineWarnings(analysis.diagnostics));

    const status = determineServiceStatus(analysis.pipelineStatus, false);
    const executionTimeMs = Math.round(performance.now() - startTime);

    return {
      success: analysis.pipelineStatus !== "failed",
      status,
      analysis,
      validation,
      errors,
      warnings,
      metadata: createServiceMetadata("analyzeResearch", executionTimeMs)
    };
  } catch (err) {
    const executionTimeMs = Math.round(performance.now() - startTime);
    const error = createServiceError(
      "ORCHESTRATOR_FAILURE",
      err instanceof Error ? err.message : "Unknown orchestrator error",
      "orchestrator",
      false
    );

    return {
      success: false,
      status: "error",
      validation,
      errors: [error],
      warnings,
      metadata: createServiceMetadata("analyzeResearch", executionTimeMs)
    };
  }
}

export function validateResearch(
  request: GoldResearchServiceRequest
): GoldResearchServiceResponse {
  const startTime = performance.now();

  const validation = validateServiceRequest(request);
  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    success: validation.isValid,
    status: validation.isValid ? "ok" : "error",
    validation,
    errors: validation.isValid
      ? []
      : validation.errors.map(e => createServiceError(e.code, e.message, e.field, true)),
    warnings: validation.warnings.map(w => w.message),
    metadata: createServiceMetadata("validateResearch", executionTimeMs)
  };
}

export function previewResearch(
  request: GoldResearchServiceRequest
): GoldResearchServiceResponse {
  const startTime = performance.now();
  const errors: ServiceError[] = [];
  const warnings: string[] = [];

  const validation = validateServiceRequest(request);
  warnings.push(...validation.warnings.map(w => w.message));

  if (!validation.isValid) {
    const executionTimeMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      status: "error",
      validation,
      errors: validation.errors.map(e => createServiceError(e.code, e.message, e.field, false)),
      warnings,
      metadata: createServiceMetadata("previewResearch", executionTimeMs)
    };
  }

  try {
    const previewOptions = {
      ...request.options,
      skipInstitutionalFlow: true,
      continueOnEngineFailure: true
    };

    const orchestratorInput: GoldResearchAnalysisInput = {
      driverAnalyses: request.driverAnalyses,
      technicalInput: request.technicalInput,
      weightConfiguration: request.weightConfiguration,
      currentPrice: request.currentPrice,
      timestamp: request.timestamp,
      options: previewOptions
    };

    const analysis = orchestrateGoldResearch(orchestratorInput);
    warnings.push(...collectPipelineWarnings(analysis.diagnostics));

    const status = determineServiceStatus(analysis.pipelineStatus, false);
    const executionTimeMs = Math.round(performance.now() - startTime);

    return {
      success: true,
      status,
      analysis,
      validation,
      errors,
      warnings,
      metadata: createServiceMetadata("previewResearch", executionTimeMs)
    };
  } catch (err) {
    const executionTimeMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      status: "error",
      validation,
      errors: [createServiceError("PREVIEW_FAILURE", err instanceof Error ? err.message : "Unknown error", "preview", true)],
      warnings,
      metadata: createServiceMetadata("previewResearch", executionTimeMs)
    };
  }
}

export function recalculateResearch(
  request: GoldResearchServiceRequest,
  overrideOptions?: {
    weightConfiguration?: GoldResearchServiceRequest["weightConfiguration"];
    options?: GoldResearchServiceRequest["options"];
  }
): GoldResearchServiceResponse {
  const mergedRequest: GoldResearchServiceRequest = {
    ...request,
    weightConfiguration: overrideOptions?.weightConfiguration ?? request.weightConfiguration,
    options: {
      ...request.options,
      ...overrideOptions?.options
    }
  };

  return analyzeResearch(mergedRequest);
}

export function summarizeResearch(
  analysis: import("@/types/goldResearchAnalysis").GoldResearchAnalysis
): ServiceResearchSummary {
  const decision = analysis.decision;

  const topDrivers = decision.topContributors
    .slice(0, 5)
    .map(c => `${c.name} (${c.source}): ${c.bias}`);

  const riskFactors: string[] = [];
  if (decision.riskRating === "Extreme" || decision.riskRating === "High") {
    riskFactors.push(`Risk rating: ${decision.riskRating}.`);
  }
  if (decision.concentrationRisks.length > 0) {
    riskFactors.push(`${decision.concentrationRisks.length} concentration risk(s).`);
  }
  if (decision.conflictScore > 50) {
    riskFactors.push(`High conflict score: ${decision.conflictScore}%.`);
  }

  const keyInsight = buildKeyInsight(analysis);

  return {
    overallBias: decision.overallBias,
    decision: decision.decision,
    goldScore: decision.overallGoldScore,
    confidence: decision.overallConfidence,
    riskRating: decision.riskRating,
    decisionQuality: decision.decisionQuality,
    topDrivers,
    riskFactors,
    keyInsight
  };
}

export function healthCheck(): GoldResearchServiceResponse {
  const startTime = performance.now();

  const health = createHealthResult();
  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    success: health.status !== "error",
    status: health.status,
    health,
    errors: health.status === "error"
      ? [createServiceError("HEALTH_CHECK_FAILED", "One or more engines unavailable.", "health", true)]
      : [],
    warnings: health.status === "degraded"
      ? ["Some engines are unavailable. Analysis will be degraded."]
      : [],
    metadata: createServiceMetadata("healthCheck", executionTimeMs)
  };
}

function buildKeyInsight(
  analysis: import("@/types/goldResearchAnalysis").GoldResearchAnalysis
): string {
  const d = analysis.decision;
  const parts: string[] = [];

  parts.push(`${d.decision} with ${d.overallBias.toLowerCase()} bias.`);

  if (d.overallConfidence >= 65) {
    parts.push(`High confidence (${d.overallConfidence}%)`);
  } else if (d.overallConfidence < 40) {
    parts.push(`Low confidence (${d.overallConfidence}%) — exercise caution.`);
  }

  if (d.supportingDrivers.length > 0) {
    parts.push(`Key bullish: ${d.supportingDrivers.slice(0, 2).join(", ")}.`);
  }

  if (d.conflictingDrivers.length > 0) {
    parts.push(`Key bearish: ${d.conflictingDrivers.slice(0, 2).join(", ")}.`);
  }

  return parts.join(" ");
}

export function getServiceSummary(response: GoldResearchServiceResponse): string {
  const parts: string[] = [];

  parts.push(`Status: ${response.status}.`);
  parts.push(`Success: ${response.success}.`);
  parts.push(`Method: ${response.metadata.method}.`);
  parts.push(`Execution: ${formatExecutionTime(response.metadata.executionTimeMs)}.`);

  if (response.analysis) {
    parts.push(`Decision: ${response.analysis.decision.decision}.`);
    parts.push(`Score: ${response.analysis.decision.overallGoldScore}%.`);
  }

  if (response.errors.length > 0) {
    parts.push(`Errors: ${response.errors.length}.`);
  }

  if (response.warnings.length > 0) {
    parts.push(`Warnings: ${response.warnings.length}.`);
  }

  return parts.join(" ");
}
