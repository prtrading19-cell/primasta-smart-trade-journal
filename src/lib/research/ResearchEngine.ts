import type {
  ResearchAsset,
  ResearchProfile,
  ResearchEngineInput,
  ResearchEngineResult,
  ResearchFillResponse,
  ResearchSummary,
  ResearchSection,
} from "./ResearchTypes";
import type { DriverAnalysisObject, DriverBias, WeightConfiguration } from "@/types/goldResearchConfig";
import type { TechnicalInput, TechnicalBiasResult } from "@/types/technicalBias";
import type { InstitutionalFlowInput, InstitutionalFlowResult } from "@/types/institutionalFlow";
import type { CategoryScoreBatchResult } from "@/lib/categoryScoreEngine";
import type { DecisionEngineResult } from "@/types/decisionEngine";
import type { InstitutionalDecisionResult } from "./InstitutionalDecisionTypes";
import type { OrchestratorOptions } from "@/types/goldResearchAnalysis";
import { getProfile } from "./ResearchRegistry";
import { calculateCategoryScoresBatch } from "@/lib/categoryScoreEngine";
import { calculateTechnicalBias } from "@/lib/technicalBiasEngine";
import { calculateInstitutionalFlow } from "@/lib/institutionalFlowEngine";
import { calculateResearchDecision } from "./ResearchDecisionEngine";
import { calculateInstitutionalDecision } from "./InstitutionalDecisionEngine";
import {
  createEngineDiagnostic,
  startStageTiming,
  addEngineDiagnostic,
  finalizeDiagnostics,
  createEmptyDiagnostics,
} from "@/lib/goldResearchDiagnostics";

export function executeResearchEngine(
  input: ResearchEngineInput,
  technicalInput?: TechnicalInput,
  institutionalInput?: InstitutionalFlowInput,
  weightConfiguration?: WeightConfiguration,
): ResearchEngineResult {
  const profile = getProfile(input.asset);
  if (!profile) {
    return buildEmptyResult(input.asset, `No profile registered for asset: ${input.asset}`);
  }

  const pipelineStartTime = performance.now();
  const diagnostics = createEmptyDiagnostics();
  const timestamp = input.timestamp ?? new Date().toISOString();
  const options = input.options ?? {};

  const driverAnalyses = input.driverAnalyses ?? [];

  console.log("[RUNTIME-AUDIT:Engine] executeResearchEngine called. asset:", input.asset);
  console.log("[RUNTIME-AUDIT:Engine] technicalInput provided:", !!technicalInput, technicalInput ? Object.keys(technicalInput) : "null");
  console.log("[RUNTIME-AUDIT:Engine] institutionalInput provided:", !!institutionalInput, institutionalInput ? Object.keys(institutionalInput) : "null");
  console.log("[RUNTIME-AUDIT:Engine] driverAnalyses count:", driverAnalyses.length);
  console.log("[RUNTIME-AUDIT:Engine] options.skipTechnicalBias:", options.skipTechnicalBias);
  console.log("[RUNTIME-AUDIT:Engine] options.skipInstitutionalFlow:", options.skipInstitutionalFlow);
  console.log("[RUNTIME-AUDIT:Engine] options.skipDecisionEngine:", options.skipDecisionEngine);

  let categoryScores = createEmptyCategoryScores(timestamp);
  let technicalBias = createEmptyTechnicalBias(timestamp);
  let institutionalFlow = createEmptyInstitutionalFlow(timestamp);

  // Stage 1: Category Scoring
  if (!options.skipCategoryScoring) {
    const stopTiming = startStageTiming(diagnostics, "category-scoring");
    const startTime = performance.now();
    try {
      categoryScores = calculateCategoryScoresBatch({
        driverAnalyses,
        config: weightConfiguration ?? profile.categoryWeights,
        categoryIds: options.categoryIds,
      });
      const elapsed = Math.round(performance.now() - startTime);
      stopTiming();
      const warnings: string[] = [];
      if (categoryScores.overallConfidence < 30) warnings.push("Low overall category confidence.");
      if (categoryScores.hasConflict) warnings.push("Conflict detected across category scores.");
      addEngineDiagnostic(diagnostics, createEngineDiagnostic(
        "CategoryScoreEngine", "success", elapsed,
        driverAnalyses.length, 1, undefined, warnings
      ));
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      stopTiming();
      addEngineDiagnostic(diagnostics, createEngineDiagnostic(
        "CategoryScoreEngine", "failed", elapsed,
        driverAnalyses.length, 1,
        err instanceof Error ? err.message : "Unknown error"
      ));
    }
  } else {
    addEngineDiagnostic(diagnostics, createEngineDiagnostic(
      "CategoryScoreEngine", "skipped", 0, driverAnalyses.length, 1,
      undefined, ["Category scoring skipped by option."]
    ));
  }

  console.log("[RUNTIME-AUDIT:Engine] After Stage 1 - categoryScores.overallConfidence:", categoryScores.overallConfidence);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 1 - categoryScores.scores.length:", categoryScores.scores.length);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 1 - categoryScores:", JSON.stringify(categoryScores, null, 2));

  // Stage 2: Technical Bias
  if (!options.skipTechnicalBias && technicalInput) {
    const stopTiming = startStageTiming(diagnostics, "technical-bias");
    const startTime = performance.now();
    try {
      technicalBias = calculateTechnicalBias(technicalInput);
      const elapsed = Math.round(performance.now() - startTime);
      stopTiming();
      const warnings: string[] = [];
      if (technicalBias.confidence < 30) warnings.push("Low technical analysis confidence.");
      if (technicalBias.conflictingFactors.length > 2) warnings.push(`${technicalBias.conflictingFactors.length} conflicting technical factors.`);
      addEngineDiagnostic(diagnostics, createEngineDiagnostic(
        "TechnicalBiasEngine", "success", elapsed, 1, 1, undefined, warnings
      ));
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      stopTiming();
      addEngineDiagnostic(diagnostics, createEngineDiagnostic(
        "TechnicalBiasEngine", "failed", elapsed, 1, 1,
        err instanceof Error ? err.message : "Unknown error"
      ));
    }
  } else {
    addEngineDiagnostic(diagnostics, createEngineDiagnostic(
      "TechnicalBiasEngine", "skipped", 0, 0, 1,
      undefined, options.skipTechnicalBias ? ["Technical bias skipped by option."] : ["No technical input provided."]
    ));
  }

  console.log("[RUNTIME-AUDIT:Engine] After Stage 2 - technicalBias.technicalBias:", technicalBias.technicalBias);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 2 - technicalBias.confidence:", technicalBias.confidence);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 2 - technicalBias.strength:", technicalBias.strength);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 2 - technicalBias.technicalScore:", technicalBias.technicalScore);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 2 - technicalBias.factors.length:", technicalBias.factors?.length);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 2 - technicalBias.supportingFactors:", technicalBias.supportingFactors);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 2 - technicalBias:", JSON.stringify(technicalBias, null, 2));

  // Stage 3: Institutional Flow
  if (!options.skipInstitutionalFlow && institutionalInput) {
    const stopTiming = startStageTiming(diagnostics, "institutional-flow");
    const startTime = performance.now();
    try {
      institutionalFlow = calculateInstitutionalFlow(institutionalInput);
      const elapsed = Math.round(performance.now() - startTime);
      stopTiming();
      const warnings: string[] = [];
      if (institutionalFlow.confidence < 30) warnings.push("Low institutional flow confidence.");
      const extreme = institutionalFlow.concentrationRisks.filter(r => r.severity === "Extreme").length;
      if (extreme > 0) warnings.push(`${extreme} extreme concentration risk(s) detected.`);
      addEngineDiagnostic(diagnostics, createEngineDiagnostic(
        "InstitutionalFlowEngine", "success", elapsed, 1, 1, undefined, warnings
      ));
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      stopTiming();
      addEngineDiagnostic(diagnostics, createEngineDiagnostic(
        "InstitutionalFlowEngine", "failed", elapsed, 1, 1,
        err instanceof Error ? err.message : "Unknown error"
      ));
    }
  } else {
    addEngineDiagnostic(diagnostics, createEngineDiagnostic(
      "InstitutionalFlowEngine", "skipped", 0, 0, 1,
      undefined, options.skipInstitutionalFlow ? ["Institutional flow skipped by option."] : ["No institutional input provided."]
    ));
  }

  console.log("[RUNTIME-AUDIT:Engine] After Stage 3 - institutionalFlow.institutionalBias:", institutionalFlow.institutionalBias);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 3 - institutionalFlow.confidence:", institutionalFlow.confidence);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 3 - institutionalFlow.strength:", institutionalFlow.strength);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 3 - institutionalFlow.institutionalScore:", institutionalFlow.institutionalScore);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 3 - institutionalFlow.factors.length:", institutionalFlow.factors?.length);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 3 - institutionalFlow:", JSON.stringify(institutionalFlow, null, 2));

  // Stage 4: Decision Engine
  let decision = createEmptyDecision(timestamp);
  if (!options.skipDecisionEngine) {
    if (categoryScores.scores.length > 0 || technicalBias.technicalScore > 0 || institutionalFlow.institutionalScore > 0) {
      const stopTiming = startStageTiming(diagnostics, "decision-engine");
      const startTime = performance.now();
      try {
        decision = calculateResearchDecision({
          asset: input.asset,
          profile,
          driverAnalyses,
          categoryScores,
          technicalBias,
          institutionalFlow,
          researchBias: input.researchBias,
          currentPrice: input.currentPrice,
        });
        const elapsed = Math.round(performance.now() - startTime);
        stopTiming();
        const warnings: string[] = [];
        if (decision.decisionQuality === "Low") warnings.push("Decision quality is Low due to conflicting signals or low confidence.");
        if (decision.riskRating === "Extreme") warnings.push("Extreme risk rating detected.");
        addEngineDiagnostic(diagnostics, createEngineDiagnostic(
          "DecisionEngine", "success", elapsed, 3, 3, undefined, warnings
        ));
      } catch (err) {
        const elapsed = Math.round(performance.now() - startTime);
        stopTiming();
        addEngineDiagnostic(diagnostics, createEngineDiagnostic(
          "DecisionEngine", "failed", elapsed, 3, 3,
          err instanceof Error ? err.message : "Unknown error"
        ));
      }
    } else {
      addEngineDiagnostic(diagnostics, createEngineDiagnostic(
        "DecisionEngine", "not-provided", 0, 0, 3,
        undefined, ["Cannot run decision engine. No scoring data available."]
      ));
    }
  } else {
    addEngineDiagnostic(diagnostics, createEngineDiagnostic(
      "DecisionEngine", "skipped", 0, 0, 3,
      undefined, ["Decision engine skipped by option."]
    ));
  }

  console.log("[RUNTIME-AUDIT:Engine] After Stage 4 - decision.decision:", decision.decision);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 4 - decision.overallGoldScore:", decision.overallGoldScore);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 4 - decision.overallConfidence:", decision.overallConfidence);
  console.log("[RUNTIME-AUDIT:Engine] After Stage 4 - decision:", JSON.stringify(decision, null, 2));

  // Stage 5: Institutional Decision (enhanced)
  let institutionalDecision: InstitutionalDecisionResult | undefined;
  if (!options.skipDecisionEngine && profile) {
    if (categoryScores.scores.length > 0 || technicalBias.technicalScore > 0 || institutionalFlow.institutionalScore > 0) {
      const stopTiming = startStageTiming(diagnostics, "institutional-decision");
      const startTime = performance.now();
      try {
        institutionalDecision = calculateInstitutionalDecision({
          asset: input.asset,
          profile,
          driverAnalyses,
          categoryScores,
          technicalBias,
          institutionalFlow,
          researchBias: input.researchBias,
          currentPrice: input.currentPrice,
        });
        const elapsed = Math.round(performance.now() - startTime);
        stopTiming();
        addEngineDiagnostic(diagnostics, createEngineDiagnostic(
          "InstitutionalDecisionEngine", "success", elapsed, 3, 3, undefined, []
        ));
      } catch (err) {
        const elapsed = Math.round(performance.now() - startTime);
        stopTiming();
        addEngineDiagnostic(diagnostics, createEngineDiagnostic(
          "InstitutionalDecisionEngine", "failed", elapsed, 3, 3,
          err instanceof Error ? err.message : "Unknown error"
        ));
      }
    }
  }

  console.log("[RUNTIME-AUDIT:Engine] After Stage 5 - institutionalDecision:", institutionalDecision ? JSON.stringify(institutionalDecision, null, 2) : "undefined");

  finalizeDiagnostics(diagnostics, pipelineStartTime);

  const executionTimeMs = Math.round(performance.now() - pipelineStartTime);
  const hasFailure = diagnostics.engines.some(e => e.status === "failed");
  const pipelineStatus = hasFailure ? "partial" : "success";

  console.log("[RUNTIME-AUDIT:Engine] FINAL RETURN - pipelineStatus:", pipelineStatus);
  console.log("[RUNTIME-AUDIT:Engine] FINAL RETURN - technicalBias.confidence:", technicalBias.confidence, "strength:", technicalBias.strength);
  console.log("[RUNTIME-AUDIT:Engine] FINAL RETURN - institutionalFlow.confidence:", institutionalFlow.confidence, "strength:", institutionalFlow.strength);
  console.log("[RUNTIME-AUDIT:Engine] FINAL RETURN - decision.overallGoldScore:", decision.overallGoldScore);

  return {
    asset: input.asset,
    rawInputs: { driverAnalyses, currentPrice: input.currentPrice },
    driverAnalyses,
    categoryScores,
    technicalBias,
    institutionalFlow,
    decision,
    institutionalDecision,
    diagnostics,
    warnings: diagnostics.warnings,
    executionTimeMs,
    pipelineStatus,
    schemaVersion: "1.0.0",
    timestamp,
  };
}

export function buildAutoSummary(
  asset: ResearchAsset,
  sections: ResearchSection[],
  profile: ResearchProfile,
  engineDecision?: { overallBias: string; overallConfidence: number; decision: string; overallGoldScore: number; alignmentBreakdown?: { overallAlignment: number } } | null
): ResearchSummary {
  const bullishSections = sections.filter(s => s.impact === profile.impactLabels.bullish);
  const bearishSections = sections.filter(s => s.impact === profile.impactLabels.bearish);
  const mixedSections = sections.filter(s => s.impact === profile.impactLabels.mixed);
  const neutralSections = sections.filter(s => s.impact === profile.impactLabels.neutral);

  const totalDrivers = sections.length;
  const bullishCount = bullishSections.length;
  const bearishCount = bearishSections.length;
  const mixedCount = mixedSections.length;
  const neutralCount = neutralSections.length;

  const hasEngineDecision = engineDecision && typeof engineDecision.overallBias === "string";
  let overallBias: string;
  let confidence: number;
  let alignment: string;
  let institutionalScore: number;

  if (hasEngineDecision) {
    const bias = engineDecision!.overallBias;
    if (/strong bullish|bullish/i.test(bias)) overallBias = profile.overallBiasLabels.bullish;
    else if (/strong bearish|bearish/i.test(bias)) overallBias = profile.overallBiasLabels.bearish;
    else if (/neutral/i.test(bias)) overallBias = profile.overallBiasLabels.neutral;
    else overallBias = computeOverallBias(bullishCount, bearishCount, mixedCount, neutralCount, profile);
    confidence = engineDecision!.overallConfidence;
    alignment = engineDecision!.alignmentBreakdown
      ? `${engineDecision!.alignmentBreakdown.overallAlignment}%`
      : `${computeHeuristicAlignment(bullishCount, bearishCount, mixedCount, neutralCount, totalDrivers)}%`;
    institutionalScore = engineDecision!.overallGoldScore;
  } else {
    overallBias = computeOverallBias(bullishCount, bearishCount, mixedCount, neutralCount, profile);
    confidence = computeHeuristicConfidence(bullishCount, bearishCount, mixedCount, neutralCount, totalDrivers);
    alignment = `${computeHeuristicAlignment(bullishCount, bearishCount, mixedCount, neutralCount, totalDrivers)}%`;
    institutionalScore = computeInstitutionalScore(bullishCount, bearishCount, mixedCount, neutralCount, totalDrivers);
  }

  const preTradeVerdict = computePreTradeVerdict(overallBias, mixedCount, profile);
  const strongestBullishDriver = strongestDriver(bullishSections);
  const strongestBearishDriver = strongestDriver(bearishSections);

  const engineTradeAction = engineDecision ? mapEngineDecisionToTradeAction(engineDecision.decision) : null;
  const tradeAction = engineTradeAction ?? deriveTradeAction(overallBias, preTradeVerdict, mixedCount, totalDrivers, profile);

  return {
    overallBias,
    bullishDrivers: bullishSections.map(s => s.driver),
    bearishDrivers: bearishSections.map(s => s.driver),
    mixedDrivers: mixedSections.map(s => s.driver),
    neutralDrivers: neutralSections.map(s => s.driver),
    strongestBullishDriver,
    strongestBearishDriver,
    mainRiskToday: getMainRisk(sections, mixedSections, bearishSections),
    bestSessionToTrade: "After technical confirmation",
    preTradeVerdict,
    finalGuidance: `Wait for technical confirmation. Do not enter without alignment between drivers and structure.`,
    personalRule: profile.personalRule,
    statistics: {
      bullishCount,
      bearishCount,
      mixedCount,
      neutralCount,
      totalDrivers,
      overallBias,
      confidence,
      alignment,
      institutionalScore,
    },
    tradeRecommendation: {
      action: tradeAction,
      reason: `Bias: ${overallBias}. ${totalDrivers} drivers analyzed.`,
      confidence,
    },
    engineDecisionUsed: Boolean(hasEngineDecision),
  };
}

function computeOverallBias(bullish: number, bearish: number, mixed: number, neutral: number, profile: ResearchProfile): string {
  const total = bullish + bearish + mixed + neutral;
  if (total === 0) return profile.overallBiasLabels.mixed;
  const netScore = (bullish - bearish) / total;
  if (netScore >= 0.3 && bullish >= 4) return profile.overallBiasLabels.bullish;
  if (netScore <= -0.3 && bearish >= 4) return profile.overallBiasLabels.bearish;
  if (Math.abs(netScore) < 0.1 && mixed <= 2) return profile.overallBiasLabels.neutral;
  return profile.overallBiasLabels.mixed;
}

function computePreTradeVerdict(overallBias: string, mixedCount: number, profile: ResearchProfile): string {
  if (mixedCount >= 3 || overallBias === profile.overallBiasLabels.mixed) return profile.preTradeVerdictLabels.wait;
  if (overallBias === profile.overallBiasLabels.neutral) return profile.preTradeVerdictLabels.manageExisting;
  return profile.preTradeVerdictLabels.tradeAllowed;
}

function computeHeuristicConfidence(bullish: number, bearish: number, mixed: number, _neutral: number, total: number): number {
  if (total === 0) return 0;
  const dominant = Math.max(bullish, bearish, mixed);
  const base = (dominant / total) * 100;
  return Math.max(10, Math.min(95, Math.round(base - mixed * 3)));
}

function computeHeuristicAlignment(bullish: number, bearish: number, mixed: number, _neutral: number, total: number): number {
  if (total === 0) return 0;
  const dominant = Math.max(bullish, bearish);
  return Math.round((dominant / total) * 100);
}

function computeInstitutionalScore(bullish: number, bearish: number, mixed: number, _neutral: number, total: number): number {
  if (total === 0) return 0;
  const weighted = (bullish * 1.0 + bearish * -1.0 + mixed * 0.0) / total;
  return Math.round(weighted * 50 + 50);
}

function mapEngineDecisionToTradeAction(engineDecision: string): "BUY" | "SELL" | "WAIT" | null {
  const lower = engineDecision.toLowerCase();
  if (lower.includes("strong buy") || lower.includes("buy")) return "BUY";
  if (lower.includes("strong sell") || lower.includes("sell")) return "SELL";
  if (lower.includes("wait")) return "WAIT";
  return null;
}

function deriveTradeAction(bias: string, preTradeVerdict: string, mixedCount: number, totalDrivers: number, profile: ResearchProfile): "BUY" | "SELL" | "WAIT" {
  if (preTradeVerdict === profile.preTradeVerdictLabels.avoidBeforeNews || preTradeVerdict === profile.preTradeVerdictLabels.wait) return "WAIT";
  if (mixedCount >= 3) return "WAIT";
  if (totalDrivers < 5) return "WAIT";
  if (bias === profile.overallBiasLabels.bullish) return "BUY";
  if (bias === profile.overallBiasLabels.bearish) return "SELL";
  return "WAIT";
}

function strongestDriver(sections: ResearchSection[]): string {
  const highImpact = sections.find(s => /high/i.test(s.reason) || /high/i.test(s.currentDataValue));
  return highImpact?.driver ?? sections[0]?.driver ?? "None";
}

function getMainRisk(sections: ResearchSection[], mixedSections: ResearchSection[], bearishSections: ResearchSection[]): string {
  const sourcedRisk = sections.find(s => /not verified|not found|uncertain|conflict|risk/i.test(`${s.newsSummary} ${s.reason}`));
  if (sourcedRisk) return `${sourcedRisk.driver}: ${sourcedRisk.reason || sourcedRisk.newsSummary}`;
  if (mixedSections.length) return `Mixed driver alignment: ${mixedSections.map(s => s.driver).join(", ")}`;
  if (bearishSections.length) return `Bearish pressure from ${bearishSections.map(s => s.driver).join(", ")}`;
  return "No single dominant risk. Still wait for price structure and liquidity confirmation.";
}

function buildEmptyResult(asset: ResearchAsset, error: string): ResearchEngineResult {
  const timestamp = new Date().toISOString();
  return {
    asset,
    rawInputs: { driverAnalyses: [] },
    driverAnalyses: [],
    categoryScores: createEmptyCategoryScores(timestamp),
    technicalBias: createEmptyTechnicalBias(timestamp),
    institutionalFlow: createEmptyInstitutionalFlow(timestamp),
    decision: createEmptyDecision(timestamp),
    diagnostics: {
      totalExecutionTimeMs: 0,
      stageTimings: {
        validation: 0, "category-scoring": 0, "technical-bias": 0,
        "institutional-flow": 0, "decision-engine": 0, "institutional-decision": 0, diagnostics: 0, complete: 0,
      },
      engines: [],
      overallStatus: "failed",
      warnings: [error],
      errors: [error],
    },
    warnings: [error],
    executionTimeMs: 0,
    pipelineStatus: "failed",
    schemaVersion: "1.0.0",
    timestamp,
  };
}

function createEmptyCategoryScores(timestamp: string): CategoryScoreBatchResult {
  return {
    scores: [],
    totalScore: 0,
    overallBias: "Neutral" as DriverBias,
    overallConfidence: 0,
    driverAlignment: 0,
    alignmentStrength: "None",
    hasConflict: false,
    timestamp,
  };
}

function createEmptyTechnicalBias(timestamp: string): TechnicalBiasResult {
  return {
    technicalBias: "Neutral" as DriverBias,
    technicalScore: 0,
    confidence: 0,
    strength: "None",
    supportingFactors: [],
    conflictingFactors: [],
    summary: "No technical input",
    timestamp,
    dataQuality: { score: 0, completeness: 0, hasTrend: false, hasMomentum: false, hasStructure: false, hasVolatility: false, hasMovingAverages: false, missingFields: ["all"] },
    factors: [],
    timeframe: "D1",
    marketStructure: "Unknown",
    setupPresent: false,
    setupType: "None",
    riskLevel: "Unknown",
  };
}

function createEmptyInstitutionalFlow(timestamp: string): InstitutionalFlowResult {
  return {
    institutionalBias: "Neutral" as DriverBias,
    institutionalScore: 0,
    confidence: 0,
    strength: "None",
    supportingFactors: [],
    conflictingFactors: [],
    concentrationRisks: [],
    summary: "No institutional input",
    timestamp,
    dataQuality: {
      score: 0, completeness: 0, hasEtfFlows: false, hasCentralBank: false,
      hasCotPositioning: false, hasOpenInterest: false, hasCrowdPositioning: false,
      hasPositionRisk: false, availableDrivers: [], missingDrivers: ["all"], freshness: "Unknown",
    },
    factors: [],
  };
}

function createEmptyDecision(timestamp: string): DecisionEngineResult {
  return {
    overallGoldScore: 0,
    overallBias: "Neutral" as DriverBias,
    decision: "Wait",
    overallConfidence: 0,
    riskRating: "High",
    alignmentScore: 0,
    conflictScore: 1,
    decisionQuality: "Low",
    supportingDrivers: [],
    conflictingDrivers: [],
    topContributors: [],
    weakestContributors: [],
    summary: "No decision available",
    institutionalExplanation: {
      primaryReason: "No data",
      supportingReasons: [],
      conflictingReasons: [],
      riskFactors: [],
      confidenceFactors: [],
      sourceSummary: { category: "N/A", technical: "N/A", institutional: "N/A" },
    },
    alignmentBreakdown: {
      categoryAlignment: 0, technicalAlignment: 0, institutionalAlignment: 0,
      crossSourceAlignment: 0, overallAlignment: 0,
    },
    conflictBreakdown: {
      categoryConflict: 0, technicalConflict: 0, institutionalConflict: 0,
      crossSourceConflict: 0, overallConflict: 1, conflictDrivers: [],
    },
    concentrationRisks: [],
    timestamp,
    schemaVersion: "1.0.0",
  };
}
