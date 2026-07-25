import type { DriverAnalysisObject, WeightConfiguration } from "@/types/goldResearchConfig";
import type { TechnicalInput, TechnicalBiasResult } from "@/types/technicalBias";
import type { InstitutionalFlowInput, InstitutionalFlowResult } from "@/types/institutionalFlow";
import type { CategoryScoreBatchResult } from "@/lib/categoryScoreEngine";
import type { DecisionEngineResult, DecisionEngineInput } from "@/types/decisionEngine";
import type {
  PipelineDiagnostics,
  EngineDiagnostic,
  OrchestratorOptions
} from "@/types/goldResearchAnalysis";
import { calculateCategoryScoresBatch } from "./categoryScoreEngine";
import { calculateTechnicalBias } from "./technicalBiasEngine";
import { calculateInstitutionalFlow } from "./institutionalFlowEngine";
import { calculateDecision } from "./decisionEngine";
import {
  createEngineDiagnostic,
  startStageTiming,
  addEngineDiagnostic
} from "./goldResearchDiagnostics";

export interface PipelineContext {
  driverAnalyses: DriverAnalysisObject[];
  technicalInput?: TechnicalInput;
  institutionalInput?: InstitutionalFlowInput;
  weightConfiguration?: WeightConfiguration;
  currentPrice?: number;
  options: OrchestratorOptions;
  diagnostics: PipelineDiagnostics;
  researchBias?: string;
}

export interface PipelineResult {
  categoryScores?: CategoryScoreBatchResult;
  technicalBias?: TechnicalBiasResult;
  institutionalFlow?: InstitutionalFlowResult;
  decision?: DecisionEngineResult;
  warnings: string[];
}

export function executeCategoryStage(
  ctx: PipelineContext,
  result: PipelineResult
): void {
  if (ctx.options.skipCategoryScoring) {
    addEngineDiagnostic(ctx.diagnostics, createEngineDiagnostic(
      "CategoryScoreEngine", "skipped", 0,
      ctx.driverAnalyses.length, 1,
      undefined, ["Category scoring skipped by option."]
    ));
    return;
  }

  const stopTiming = startStageTiming(ctx.diagnostics, "category-scoring");
  const startTime = performance.now();

  try {
    const categoryResult = calculateCategoryScoresBatch({
      driverAnalyses: ctx.driverAnalyses,
      config: ctx.weightConfiguration,
      categoryIds: ctx.options.categoryIds
    });

    result.categoryScores = categoryResult;
    const elapsed = Math.round(performance.now() - startTime);
    stopTiming();

    const warnings: string[] = [];
    if (categoryResult.overallConfidence < 30) {
      warnings.push("Low overall category confidence.");
    }
    if (categoryResult.hasConflict) {
      warnings.push("Conflict detected across category scores.");
    }

    addEngineDiagnostic(ctx.diagnostics, createEngineDiagnostic(
      "CategoryScoreEngine", "success", elapsed,
      ctx.driverAnalyses.length, 1,
      undefined, warnings
    ));
  } catch (err) {
    const elapsed = Math.round(performance.now() - startTime);
    stopTiming();
    addEngineDiagnostic(ctx.diagnostics, createEngineDiagnostic(
      "CategoryScoreEngine", "failed", elapsed,
      ctx.driverAnalyses.length, 1,
      err instanceof Error ? err.message : "Unknown error"
    ));
  }
}

export function executeTechnicalStage(
  ctx: PipelineContext,
  result: PipelineResult
): void {
  if (ctx.options.skipTechnicalBias || !ctx.technicalInput) {
    const status = ctx.options.skipTechnicalBias ? "skipped" : "not-provided";
    addEngineDiagnostic(ctx.diagnostics, createEngineDiagnostic(
      "TechnicalBiasEngine", status, 0,
      0, 1,
      undefined,
      ctx.options.skipTechnicalBias
        ? ["Technical bias skipped by option."]
        : ["No technical input provided."]
    ));
    return;
  }

  const stopTiming = startStageTiming(ctx.diagnostics, "technical-bias");
  const startTime = performance.now();

  try {
    const technicalResult = calculateTechnicalBias(ctx.technicalInput);

    result.technicalBias = technicalResult;
    const elapsed = Math.round(performance.now() - startTime);
    stopTiming();

    const warnings: string[] = [];
    if (technicalResult.confidence < 30) {
      warnings.push("Low technical analysis confidence.");
    }
    if (technicalResult.conflictingFactors.length > 2) {
      warnings.push(`${technicalResult.conflictingFactors.length} conflicting technical factors.`);
    }

    addEngineDiagnostic(ctx.diagnostics, createEngineDiagnostic(
      "TechnicalBiasEngine", "success", elapsed,
      1, 1,
      undefined, warnings
    ));
  } catch (err) {
    const elapsed = Math.round(performance.now() - startTime);
    stopTiming();
    addEngineDiagnostic(ctx.diagnostics, createEngineDiagnostic(
      "TechnicalBiasEngine", "failed", elapsed,
      1, 1,
      err instanceof Error ? err.message : "Unknown error"
    ));
  }
}

export function executeInstitutionalStage(
  ctx: PipelineContext,
  result: PipelineResult
): void {
  if (ctx.options.skipInstitutionalFlow || !ctx.institutionalInput) {
    const status = ctx.options.skipInstitutionalFlow ? "skipped" : "not-provided";
    addEngineDiagnostic(ctx.diagnostics, createEngineDiagnostic(
      "InstitutionalFlowEngine", status, 0,
      0, 1,
      undefined,
      ctx.options.skipInstitutionalFlow
        ? ["Institutional flow skipped by option."]
        : ["No institutional input provided."]
    ));
    return;
  }

  const stopTiming = startStageTiming(ctx.diagnostics, "institutional-flow");
  const startTime = performance.now();

  try {
    const institutionalResult = calculateInstitutionalFlow(ctx.institutionalInput);

    result.institutionalFlow = institutionalResult;
    const elapsed = Math.round(performance.now() - startTime);
    stopTiming();

    const warnings: string[] = [];
    if (institutionalResult.confidence < 30) {
      warnings.push("Low institutional flow confidence.");
    }
    if (institutionalResult.concentrationRisks.length > 0) {
      const extreme = institutionalResult.concentrationRisks.filter(r => r.severity === "Extreme").length;
      if (extreme > 0) {
        warnings.push(`${extreme} extreme concentration risk(s) detected.`);
      }
    }

    addEngineDiagnostic(ctx.diagnostics, createEngineDiagnostic(
      "InstitutionalFlowEngine", "success", elapsed,
      1, 1,
      undefined, warnings
    ));
  } catch (err) {
    const elapsed = Math.round(performance.now() - startTime);
    stopTiming();
    addEngineDiagnostic(ctx.diagnostics, createEngineDiagnostic(
      "InstitutionalFlowEngine", "failed", elapsed,
      1, 1,
      err instanceof Error ? err.message : "Unknown error"
    ));
  }
}

export function executeDecisionStage(
  ctx: PipelineContext,
  result: PipelineResult
): void {
  if (ctx.options.skipDecisionEngine) {
    addEngineDiagnostic(ctx.diagnostics, createEngineDiagnostic(
      "DecisionEngine", "skipped", 0,
      0, 3,
      undefined, ["Decision engine skipped by option."]
    ));
    return;
  }

  if (!result.categoryScores || !result.technicalBias || !result.institutionalFlow) {
    const missing: string[] = [];
    if (!result.categoryScores) missing.push("Category Scores");
    if (!result.technicalBias) missing.push("Technical Bias");
    if (!result.institutionalFlow) missing.push("Institutional Flow");

    addEngineDiagnostic(ctx.diagnostics, createEngineDiagnostic(
      "DecisionEngine", "not-provided", 0,
      0, 3,
      undefined, [`Cannot run decision engine. Missing: ${missing.join(", ")}.`]
    ));
    return;
  }

  const stopTiming = startStageTiming(ctx.diagnostics, "decision-engine");
  const startTime = performance.now();

  try {
    const decisionInput: DecisionEngineInput = {
      categoryScores: result.categoryScores,
      technicalBias: result.technicalBias,
      institutionalFlow: result.institutionalFlow,
      currentPrice: ctx.currentPrice,
      timestamp: new Date().toISOString(),
      researchBias: ctx.researchBias
    };

    const decisionResult = calculateDecision(decisionInput);

    result.decision = decisionResult;
    const elapsed = Math.round(performance.now() - startTime);
    stopTiming();

    const warnings: string[] = [];
    if (decisionResult.decisionQuality === "Low") {
      warnings.push("Decision quality is Low due to conflicting signals or low confidence.");
    }
    if (decisionResult.riskRating === "Extreme") {
      warnings.push("Extreme risk rating detected.");
    }

    addEngineDiagnostic(ctx.diagnostics, createEngineDiagnostic(
      "DecisionEngine", "success", elapsed,
      3, 3,
      undefined, warnings
    ));
  } catch (err) {
    const elapsed = Math.round(performance.now() - startTime);
    stopTiming();
    addEngineDiagnostic(ctx.diagnostics, createEngineDiagnostic(
      "DecisionEngine", "failed", elapsed,
      3, 3,
      err instanceof Error ? err.message : "Unknown error"
    ));
  }
}

export function runPipeline(ctx: PipelineContext): PipelineResult {
  const result: PipelineResult = { warnings: [] };

  executeCategoryStage(ctx, result);

  if (!ctx.options.continueOnEngineFailure && hasEngineFailed(ctx.diagnostics)) {
    return result;
  }

  executeTechnicalStage(ctx, result);

  if (!ctx.options.continueOnEngineFailure && hasEngineFailed(ctx.diagnostics)) {
    return result;
  }

  executeInstitutionalStage(ctx, result);

  if (!ctx.options.continueOnEngineFailure && hasEngineFailed(ctx.diagnostics)) {
    return result;
  }

  executeDecisionStage(ctx, result);

  return result;
}

function hasEngineFailed(diagnostics: PipelineDiagnostics): boolean {
  return diagnostics.engines.some(e => e.status === "failed");
}
