import type {
  DecisionEngineInput,
  DecisionEngineResult,
  DecisionAction,
  RiskRating,
  DecisionQuality,
  Contributor,
  AlignmentBreakdown,
  ConflictBreakdown,
  DecisionExplanation
} from "@/types/decisionEngine";
import { BIAS_TO_DIRECTION, DECISION_ENGINE_SCHEMA_VERSION } from "@/types/decisionEngine";
import type { DriverBias } from "@/types/goldResearchConfig";
import {
  DEFAULT_DECISION_THRESHOLDS,
  type DecisionThresholds
} from "@/config/decisionThresholds";
import {
  resolveWeights,
  calculateWeightedScore,
  adjustScoreForConfidence,
  adjustScoreForAlignment,
  adjustScoreForConflict,
  calculateAlignmentScore,
  calculateConflictScore,
  calculateCrossSourceAlignment,
  type SourceWeights
} from "./decisionWeightResolver";

export function calculateDecision(
  input: DecisionEngineInput,
  thresholds?: DecisionThresholds,
  sourceWeights?: SourceWeights
): DecisionEngineResult {
  const t = thresholds ?? DEFAULT_DECISION_THRESHOLDS;
  const weights = sourceWeights ? resolveWeights(sourceWeights) : resolveWeights();
  const ts = input.timestamp ?? new Date().toISOString();

  const catScore = input.categoryScores.totalScore;
  const techScore = input.technicalBias.technicalScore;
  const instScore = input.institutionalFlow.institutionalScore;

  const rawScore = calculateWeightedScore(catScore, techScore, instScore, weights.sources);

  const catBias = input.categoryScores.overallBias;
  const techBias = input.technicalBias.technicalBias;
  const instBias = input.institutionalFlow.institutionalBias;

  const crossSourceAlignment = calculateCrossSourceAlignment(catBias, techBias, instBias);
  const catAlign = input.categoryScores.driverAlignment;
  const techConf = input.technicalBias.confidence;
  const instConf = input.institutionalFlow.confidence;
  const catConflict = input.categoryScores.hasConflict;
  const techConflict = input.technicalBias.conflictingFactors.length > 0;
  const instConflict = input.institutionalFlow.conflictingFactors.length > 0;

  const categoryAlignment = Math.round(catAlign);
  const technicalAlignment = Math.round(techConf);
  const institutionalAlignment = Math.round(instConf);

  const overallAlignment = calculateAlignmentScore(
    (BIAS_TO_DIRECTION as Record<string, number>)[catBias] ?? 0,
    (BIAS_TO_DIRECTION as Record<string, number>)[techBias] ?? 0,
    (BIAS_TO_DIRECTION as Record<string, number>)[instBias] ?? 0
  );

  const conflictScore = calculateConflictScore(
    catConflict,
    techConflict,
    instConflict,
    crossSourceAlignment
  );

  const alignmentBreakdown: AlignmentBreakdown = {
    categoryAlignment,
    technicalAlignment,
    institutionalAlignment,
    crossSourceAlignment,
    overallAlignment
  };

  const conflictDrivers = [
    ...input.categoryScores.scores
      .filter(s => s.hasConflict)
      .map(s => s.categoryTitle),
    ...input.technicalBias.conflictingFactors,
    ...input.institutionalFlow.conflictingFactors
  ];

  const conflictBreakdown: ConflictBreakdown = {
    categoryConflict: catConflict ? Math.round(conflictScore * 0.4) : 0,
    technicalConflict: techConflict ? Math.round(conflictScore * 0.3) : 0,
    institutionalConflict: instConflict ? Math.round(conflictScore * 0.3) : 0,
    crossSourceConflict: Math.round((100 - crossSourceAlignment) * 0.5),
    overallConflict: conflictScore,
    conflictDrivers
  };

  const adjustedScore = applyAdjustments(rawScore, input, weights, t, overallAlignment, conflictScore);
  const clampedScore = Math.max(0, Math.min(100, Math.round(adjustedScore)));

  const computedBias = scoreToBias(clampedScore, t);

  const researchBiasBias = mapResearchBiasToDriverBias(input.researchBias);

  const overallBias = researchBiasBias ?? computedBias;

  const confidence = calculateOverallConfidence(input);
  const decision = deriveDecision(overallBias, confidence, conflictScore, t, input.researchBias);
  const riskRating = deriveRiskRating(conflictScore, confidence, input);
  const decisionQuality = deriveDecisionQuality(confidence, conflictScore, overallAlignment, t);

  const allContributors = gatherContributors(input);
  const sortedByContribution = [...allContributors].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const topContributors = sortedByContribution.slice(0, 5);
  const weakestContributors = sortedByContribution.slice(-5).reverse();

  const supportingDrivers = allContributors
    .filter(c => c.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .map(c => c.name);

  const conflictingDrivers = allContributors
    .filter(c => c.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution)
    .map(c => c.name);

  const concentrationRisks = gatherConcentrationRisks(input);

  const explanation = buildExplanation(
    overallBias,
    decision,
    confidence,
    riskRating,
    input,
    supportingDrivers,
    conflictingDrivers,
    concentrationRisks,
    input.researchBias
  );

  const summary = generateSummary(
    overallBias,
    decision,
    confidence,
    riskRating,
    decisionQuality,
    topContributors,
    concentrationRisks,
    input.researchBias
  );

  return {
    overallGoldScore: clampedScore,
    overallBias,
    decision,
    overallConfidence: confidence,
    riskRating,
    alignmentScore: overallAlignment,
    conflictScore,
    decisionQuality,
    supportingDrivers,
    conflictingDrivers,
    topContributors,
    weakestContributors,
    summary,
    institutionalExplanation: explanation,
    alignmentBreakdown,
    conflictBreakdown,
    concentrationRisks,
    timestamp: ts,
    schemaVersion: DECISION_ENGINE_SCHEMA_VERSION
  };
}

function applyAdjustments(
  rawScore: number,
  input: DecisionEngineInput,
  weights: ReturnType<typeof resolveWeights>,
  thresholds: DecisionThresholds,
  alignment: number,
  conflict: number
): number {
  let score = rawScore;

  score = adjustScoreForConfidence(score, input.categoryScores.overallConfidence, weights.confidenceMultiplier);
  score = adjustScoreForAlignment(score, alignment, weights.alignmentMultiplier);
  score = adjustScoreForConflict(score, conflict, weights.conflictPenalty);

  const techSetupBonus = input.technicalBias.setupPresent ? 2 : 0;
  const instCrowdingPenalty = getConcentrationPenalty(input);

  score += techSetupBonus - instCrowdingPenalty;

  return score;
}

function getConcentrationPenalty(input: DecisionEngineInput): number {
  const extremeRisks = input.institutionalFlow.concentrationRisks.filter(
    r => r.severity === "Extreme"
  );
  const highRisks = input.institutionalFlow.concentrationRisks.filter(
    r => r.severity === "High"
  );

  return extremeRisks.length * 5 + highRisks.length * 2;
}

function scoreToBias(score: number, thresholds: DecisionThresholds): DriverBias {
  if (score >= thresholds.scoreToBias.strongBullish) return "Strong Bullish";
  if (score >= thresholds.scoreToBias.bullish) return "Bullish";
  if (score <= thresholds.scoreToBias.strongBearish) return "Strong Bearish";
  if (score <= thresholds.scoreToBias.bearish) return "Bearish";
  return "Neutral";
}

function mapResearchBiasToDriverBias(researchBias?: string): DriverBias | null {
  if (!researchBias) return null;
  const lower = researchBias.toLowerCase();
  if (lower.includes("strong bullish")) return "Strong Bullish";
  if (lower.includes("bullish")) return "Bullish";
  if (lower.includes("strong bearish")) return "Strong Bearish";
  if (lower.includes("bearish")) return "Bearish";
  if (lower.includes("mixed") || lower.includes("wait")) return "Neutral";
  if (lower.includes("neutral")) return "Neutral";
  return null;
}

function deriveDecision(
  bias: DriverBias,
  confidence: number,
  conflict: number,
  thresholds: DecisionThresholds,
  researchBias?: string
): DecisionAction {
  const confLevel = confidence >= thresholds.confidence.highThreshold
    ? "highConfidence"
    : confidence >= thresholds.confidence.mediumThreshold
      ? "mediumConfidence"
      : "lowConfidence";

  const baseDecision = thresholds.biasToDecision[bias]?.[confLevel] ?? "Wait";

  if (conflict >= thresholds.conflict.extremeThreshold && baseDecision !== "Wait") {
    return "Wait";
  }

  if (conflict >= thresholds.conflict.highThreshold && confidence < thresholds.confidence.mediumThreshold) {
    return "Wait";
  }

  const researchLower = researchBias?.toLowerCase() ?? "";
  if (researchLower.includes("mixed") || researchLower.includes("wait")) {
    if (baseDecision === "Buy" || baseDecision === "Sell" || baseDecision === "Strong Buy" || baseDecision === "Strong Sell") {
      return "Wait";
    }
  }

  return baseDecision;
}

function deriveRiskRating(
  conflict: number,
  confidence: number,
  input: DecisionEngineInput
): RiskRating {
  const t = DEFAULT_DECISION_THRESHOLDS;
  const extremeRisks = input.institutionalFlow.concentrationRisks.filter(
    r => r.severity === "Extreme"
  ).length;

  const riskScore = conflict * 0.4 + (100 - confidence) * 0.3 + extremeRisks * 15;

  if (riskScore >= t.riskRating.extremeThreshold || extremeRisks >= 2) return "Extreme";
  if (riskScore >= t.riskRating.highThreshold || extremeRisks >= 1) return "High";
  if (riskScore >= t.riskRating.mediumThreshold) return "Medium";
  return "Low";
}

function deriveDecisionQuality(
  confidence: number,
  conflict: number,
  alignment: number,
  thresholds: DecisionThresholds
): DecisionQuality {
  const q = thresholds.decisionQuality;

  if (
    confidence >= q.highConfidenceThreshold &&
    conflict <= q.lowConflictThreshold &&
    alignment >= q.highAlignmentThreshold
  ) {
    return "High";
  }

  if (
    confidence < 30 ||
    conflict > 60 ||
    alignment < 30
  ) {
    return "Low";
  }

  return "Medium";
}

function calculateOverallConfidence(input: DecisionEngineInput): number {
  const catConf = input.categoryScores.overallConfidence;
  const techConf = input.technicalBias.confidence;
  const instConf = input.institutionalFlow.confidence;

  const confidences = [catConf, techConf, instConf];
  const valid = confidences.filter(c => c > 0);

  if (valid.length === 0) return 0;

  const avg = valid.reduce((s, c) => s + c, 0) / valid.length;

  const minConf = Math.min(...valid);
  const maxConf = Math.max(...valid);
  const spread = maxConf - minConf;
  const spreadPenalty = spread > 40 ? (spread - 40) * 0.2 : 0;

  return Math.round(Math.max(0, Math.min(100, avg - spreadPenalty)));
}

function gatherContributors(input: DecisionEngineInput): Contributor[] {
  const contributors: Contributor[] = [];

  for (const score of input.categoryScores.scores) {
    if (score.driverCount > 0) {
      contributors.push({
        name: score.categoryTitle,
        source: "Category",
        score: score.score,
        bias: score.bias as DriverBias,
        confidence: score.confidence,
        weight: score.weight,
        contribution: score.weightedScore * score.weight,
        reason: score.reason
      });
    }
  }

  contributors.push({
    name: "Technical Analysis",
    source: "Technical",
    score: input.technicalBias.technicalScore,
    bias: input.technicalBias.technicalBias as DriverBias,
    confidence: input.technicalBias.confidence,
    weight: 0.30,
    contribution: (input.technicalBias.technicalScore - 50) * 0.30,
    reason: input.technicalBias.summary
  });

  contributors.push({
    name: "Institutional Flow",
    source: "Institutional",
    score: input.institutionalFlow.institutionalScore,
    bias: input.institutionalFlow.institutionalBias as DriverBias,
    confidence: input.institutionalFlow.confidence,
    weight: 0.25,
    contribution: (input.institutionalFlow.institutionalScore - 50) * 0.25,
    reason: input.institutionalFlow.summary
  });

  return contributors;
}

function gatherConcentrationRisks(input: DecisionEngineInput): string[] {
  const risks: string[] = [];

  for (const risk of input.institutionalFlow.concentrationRisks) {
    if (risk.detected) {
      risks.push(`${risk.type}: ${risk.description} ${risk.recommendation}`);
    }
  }

  return risks;
}

function buildExplanation(
  bias: DriverBias,
  decision: DecisionAction,
  confidence: number,
  riskRating: RiskRating,
  input: DecisionEngineInput,
  supportingDrivers: string[],
  conflictingDrivers: string[],
  concentrationRisks: string[],
  researchBias?: string
): DecisionExplanation {
  const catBias = input.categoryScores.overallBias;
  const techBias = input.technicalBias.technicalBias;
  const instBias = input.institutionalFlow.institutionalBias;

  const researchSource = researchBias
    ? `Institutional research bias: ${researchBias}. `
    : "";

  const primaryReason = `${researchSource}Overall ${bias.toLowerCase()} bias with ${decision.toLowerCase()} decision based on ${confidence}% confidence.`;

  const supportingReasons: string[] = [];
  const conflictingReasons: string[] = [];

  if (catBias.includes("Bullish")) {
    supportingReasons.push(`Category analysis shows ${catBias.toLowerCase()} across research categories.`);
  } else if (catBias.includes("Bearish")) {
    conflictingReasons.push(`Category analysis shows ${catBias.toLowerCase()} across research categories.`);
  }

  if (techBias.includes("Bullish")) {
    supportingReasons.push(`Technical analysis confirms ${techBias.toLowerCase()} bias.`);
  } else if (techBias.includes("Bearish")) {
    conflictingReasons.push(`Technical analysis shows ${techBias.toLowerCase()} bias.`);
  }

  if (instBias.includes("Bullish")) {
    supportingReasons.push(`Institutional flow indicates ${instBias.toLowerCase()} positioning.`);
  } else if (instBias.includes("Bearish")) {
    conflictingReasons.push(`Institutional flow shows ${instBias.toLowerCase()} positioning.`);
  }

  const riskFactors: string[] = [];
  if (riskRating === "Extreme" || riskRating === "High") {
    riskFactors.push(`Risk rating: ${riskRating}.`);
  }
  if (concentrationRisks.length > 0) {
    riskFactors.push(`${concentrationRisks.length} concentration risk(s) detected.`);
  }
  if (conflictingDrivers.length > 3) {
    riskFactors.push(`${conflictingDrivers.length} conflicting drivers identified.`);
  }

  const confidenceFactors: string[] = [];
  if (confidence >= 65) {
    confidenceFactors.push("High confidence from aligned multi-source analysis.");
  } else if (confidence < 40) {
    confidenceFactors.push("Low confidence due to limited or conflicting data.");
  }

  return {
    primaryReason,
    supportingReasons,
    conflictingReasons,
    riskFactors,
    confidenceFactors,
    sourceSummary: {
      category: input.categoryScores.scores.map(s => `${s.categoryTitle}: ${s.bias}`).join("; "),
      technical: input.technicalBias.summary,
      institutional: input.institutionalFlow.summary
    }
  };
}

function generateSummary(
  bias: DriverBias,
  decision: DecisionAction,
  confidence: number,
  riskRating: RiskRating,
  quality: DecisionQuality,
  topContributors: Contributor[],
  concentrationRisks: string[],
  researchBias?: string
): string {
  const parts: string[] = [];

  if (researchBias) {
    parts.push(`Institutional research bias: ${researchBias}.`);
  }

  parts.push(`Gold decision: ${decision} with ${bias.toLowerCase()} bias.`);

  parts.push(`Confidence: ${confidence}%. Risk: ${riskRating}. Quality: ${quality}.`);

  if (topContributors.length > 0) {
    const topNames = topContributors.slice(0, 3).map(c => c.name).join(", ");
    parts.push(`Key drivers: ${topNames}.`);
  }

  if (concentrationRisks.length > 0) {
    parts.push(`Warning: ${concentrationRisks.length} concentration risk(s) detected.`);
  }

  return parts.join(" ");
}
