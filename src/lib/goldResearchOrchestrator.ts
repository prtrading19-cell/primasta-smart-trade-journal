import type {
  GoldResearchAnalysisInput,
  GoldResearchAnalysis,
  OrchestratorOptions,
  PipelineDiagnostics
} from "@/types/goldResearchAnalysis";
import { GOLD_RESEARCH_ANALYSIS_SCHEMA_VERSION } from "@/types/goldResearchAnalysis";
import type { PipelineContext } from "./goldResearchPipeline";
import { runPipeline } from "./goldResearchPipeline";
import {
  createEmptyDiagnostics,
  finalizeDiagnostics,
  startStageTiming,
  summarizeDiagnostics
} from "./goldResearchDiagnostics";
import { validateGoldResearchAnalysisInput } from "./goldResearchOrchestratorValidators";
import { hasProfile } from "./research/ResearchRegistry";
import { executeResearchEngine } from "./research/ResearchEngine";
import "./research/initialize";

const DEFAULT_OPTIONS: OrchestratorOptions = {
  continueOnEngineFailure: true
};

export function orchestrateGoldResearch(
  input: GoldResearchAnalysisInput
): GoldResearchAnalysis {
  const pipelineStartTime = performance.now();
  const timestamp = input.timestamp ?? new Date().toISOString();
  const diagnostics = createEmptyDiagnostics();

  const options: OrchestratorOptions = {
    ...DEFAULT_OPTIONS,
    ...input.options
  };

  const validationStop = startStageTiming(diagnostics, "validation");
  const validation = validateGoldResearchAnalysisInput(input);
  validationStop();

  if (!validation.isValid) {
    for (const error of validation.errors) {
      diagnostics.errors.push(`${error.code}: ${error.message}`);
    }
    diagnostics.overallStatus = "failed";
    const finalized = finalizeDiagnostics(diagnostics, pipelineStartTime);

    return buildFailedAnalysis(input, finalized, timestamp);
  }

  for (const warning of validation.warnings) {
    diagnostics.warnings.push(warning.message);
  }

  if (hasProfile("gold")) {
    try {
      const engineResult = executeResearchEngine(
        {
          asset: "gold",
          driverAnalyses: input.driverAnalyses,
          currentPrice: input.currentPrice,
          timestamp,
          options,
          researchBias: input.researchBias,
        },
        input.technicalInput,
        input.institutionalInput,
        input.weightConfiguration,
      );

      const warnings: string[] = [...engineResult.warnings];
      if (engineResult.categoryScores) {
        warnings.push(...collectCategoryWarnings(engineResult.categoryScores));
      }

      return {
        rawInputs: {
          driverAnalyses: input.driverAnalyses,
          technicalInput: input.technicalInput,
          institutionalInput: input.institutionalInput,
          weightConfiguration: input.weightConfiguration,
          currentPrice: input.currentPrice
        },
        driverAnalyses: engineResult.driverAnalyses,
        categoryScores: engineResult.categoryScores,
        technicalBias: engineResult.technicalBias,
        institutionalFlow: engineResult.institutionalFlow,
        decision: engineResult.decision,
        diagnostics: engineResult.diagnostics,
        warnings,
        executionTimeMs: engineResult.executionTimeMs,
        pipelineStatus: engineResult.pipelineStatus,
        schemaVersion: GOLD_RESEARCH_ANALYSIS_SCHEMA_VERSION,
        timestamp
      };
    } catch (err) {
      diagnostics.warnings.push(
        `New research engine failed, falling back to legacy pipeline: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  const ctx: PipelineContext = {
    driverAnalyses: input.driverAnalyses,
    technicalInput: input.technicalInput,
    institutionalInput: input.institutionalInput,
    weightConfiguration: input.weightConfiguration,
    currentPrice: input.currentPrice,
    options,
    diagnostics,
    researchBias: input.researchBias
  };

  const pipelineResult = runPipeline(ctx);

  const diagStop = startStageTiming(diagnostics, "diagnostics");
  finalizeDiagnostics(diagnostics, pipelineStartTime);
  diagStop();

  const warnings: string[] = [...diagnostics.warnings];

  if (pipelineResult.categoryScores) {
    warnings.push(...collectCategoryWarnings(pipelineResult.categoryScores));
  }

  const executionTimeMs = Math.round(performance.now() - pipelineStartTime);

  return {
    rawInputs: {
      driverAnalyses: input.driverAnalyses,
      technicalInput: input.technicalInput,
      institutionalInput: input.institutionalInput,
      weightConfiguration: input.weightConfiguration,
      currentPrice: input.currentPrice
    },
    driverAnalyses: input.driverAnalyses,
    categoryScores: pipelineResult.categoryScores ?? createEmptyCategoryBatchResult(),
    technicalBias: pipelineResult.technicalBias ?? createEmptyTechnicalBiasResult(),
    institutionalFlow: pipelineResult.institutionalFlow ?? createEmptyInstitutionalFlowResult(),
    decision: pipelineResult.decision ?? createEmptyDecisionResult(),
    diagnostics,
    warnings,
    executionTimeMs,
    pipelineStatus: diagnostics.overallStatus,
    schemaVersion: GOLD_RESEARCH_ANALYSIS_SCHEMA_VERSION,
    timestamp
  };
}

function buildFailedAnalysis(
  input: GoldResearchAnalysisInput,
  diagnostics: PipelineDiagnostics,
  timestamp: string
): GoldResearchAnalysis {
  return {
    rawInputs: {
      driverAnalyses: input.driverAnalyses,
      technicalInput: input.technicalInput,
      institutionalInput: input.institutionalInput,
      weightConfiguration: input.weightConfiguration,
      currentPrice: input.currentPrice
    },
    driverAnalyses: input.driverAnalyses,
    categoryScores: createEmptyCategoryBatchResult(),
    technicalBias: createEmptyTechnicalBiasResult(),
    institutionalFlow: createEmptyInstitutionalFlowResult(),
    decision: createEmptyDecisionResult(),
    diagnostics,
    warnings: diagnostics.errors,
    executionTimeMs: diagnostics.totalExecutionTimeMs,
    pipelineStatus: "failed",
    schemaVersion: GOLD_RESEARCH_ANALYSIS_SCHEMA_VERSION,
    timestamp
  };
}

function collectCategoryWarnings(
  categoryScores: { overallConfidence: number; hasConflict: boolean; scores: Array<{ driverCount: number }> }
): string[] {
  const warnings: string[] = [];

  if (categoryScores.overallConfidence < 25) {
    warnings.push("Very low category confidence — results may be unreliable.");
  }

  if (categoryScores.scores.every(s => s.driverCount === 0)) {
    warnings.push("All categories have zero drivers scored.");
  }

  return warnings;
}

export function getAnalysisSummary(analysis: GoldResearchAnalysis): string {
  return [
    `Gold Research Analysis — ${analysis.pipelineStatus}.`,
    `Decision: ${analysis.decision.decision} (${analysis.decision.overallBias}).`,
    `Score: ${analysis.decision.overallGoldScore}%. Confidence: ${analysis.decision.overallConfidence}%.`,
    `Risk: ${analysis.decision.riskRating}. Quality: ${analysis.decision.decisionQuality}.`,
    summarizeDiagnostics(analysis.diagnostics),
    `Execution time: ${analysis.executionTimeMs}ms.`
  ].join(" ");
}

function createEmptyCategoryBatchResult() {
  return {
    scores: [],
    totalScore: 0,
    overallBias: "Neutral" as const,
    overallConfidence: 0,
    driverAlignment: 0,
    alignmentStrength: "None" as const,
    hasConflict: false,
    timestamp: new Date().toISOString()
  };
}

function createEmptyTechnicalBiasResult() {
  return {
    technicalBias: "Neutral" as const,
    technicalScore: 0,
    confidence: 0,
    strength: "None" as const,
    supportingFactors: [],
    conflictingFactors: [],
    summary: "No technical data provided.",
    timestamp: new Date().toISOString(),
    dataQuality: {
      score: 0,
      completeness: 0,
      hasTrend: false,
      hasMomentum: false,
      hasStructure: false,
      hasVolatility: false,
      hasMovingAverages: false,
      missingFields: ["all"]
    },
    factors: [],
    timeframe: "D1" as const,
    marketStructure: "Unknown" as const,
    setupPresent: false,
    setupType: "None" as const,
    riskLevel: "Unknown" as const
  };
}

function createEmptyInstitutionalFlowResult() {
  return {
    institutionalBias: "Neutral" as const,
    institutionalScore: 0,
    confidence: 0,
    strength: "None" as const,
    supportingFactors: [],
    conflictingFactors: [],
    concentrationRisks: [],
    summary: "No institutional data provided.",
    timestamp: new Date().toISOString(),
    dataQuality: {
      score: 0,
      completeness: 0,
      hasEtfFlows: false,
      hasCentralBank: false,
      hasCotPositioning: false,
      hasOpenInterest: false,
      hasCrowdPositioning: false,
      hasPositionRisk: false,
      availableDrivers: [],
      missingDrivers: ["ETF Flows", "Central Bank", "COT Positioning", "Open Interest", "Crowd Positioning", "Position Risk"],
      freshness: "Unknown" as const
    },
    factors: []
  };
}

function createEmptyDecisionResult() {
  return {
    overallGoldScore: 0,
    overallBias: "Neutral" as const,
    decision: "Wait" as const,
    overallConfidence: 0,
    riskRating: "Extreme" as const,
    alignmentScore: 0,
    conflictScore: 0,
    decisionQuality: "Low" as const,
    supportingDrivers: [],
    conflictingDrivers: [],
    topContributors: [],
    weakestContributors: [],
    summary: "No data available for decision.",
    institutionalExplanation: {
      primaryReason: "Insufficient data.",
      supportingReasons: [],
      conflictingReasons: [],
      riskFactors: ["No data provided."],
      confidenceFactors: [],
      sourceSummary: {
        category: "No data",
        technical: "No data",
        institutional: "No data"
      }
    },
    alignmentBreakdown: {
      categoryAlignment: 0,
      technicalAlignment: 0,
      institutionalAlignment: 0,
      crossSourceAlignment: 0,
      overallAlignment: 0
    },
    conflictBreakdown: {
      categoryConflict: 0,
      technicalConflict: 0,
      institutionalConflict: 0,
      crossSourceConflict: 0,
      overallConflict: 0,
      conflictDrivers: []
    },
    concentrationRisks: [],
    timestamp: new Date().toISOString(),
    schemaVersion: "1.0.0"
  };
}
