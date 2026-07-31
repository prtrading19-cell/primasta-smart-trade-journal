import type { DecisionContext, ConfidenceResult, AlignmentResult, RiskResult, DecisionV2Result, DecisionV2Action } from "./types";
import type { DriverBias } from "@/types/goldResearchConfig";

export interface DecisionV2Input {
  context: DecisionContext;
  confidence: ConfidenceResult;
  alignment: AlignmentResult;
  risk: RiskResult;
}

export function calculateDecisionV2(input: DecisionV2Input): DecisionV2Result {
  const { context, confidence, alignment, risk } = input;

  const alignmentScore = alignment.score;
  const alignmentDirection = alignment.direction;
  const confidenceScore = confidence.score;
  const riskScore = risk.score;

  const baseScore = computeBaseScore(context);
  const alignmentContribution = computeAlignmentContribution(alignmentScore, alignmentDirection);
  const confidenceContribution = computeConfidenceContribution(confidenceScore);
  const riskContribution = computeRiskContribution(riskScore);

  const adjustedScore = Math.round(
    baseScore * 0.30 +
    alignmentContribution * 0.30 +
    confidenceContribution * 0.20 +
    (100 - riskContribution) * 0.20
  );

  const bias = scoreToBias(adjustedScore);
  const action = deriveAction(adjustedScore, confidenceScore, alignmentScore, riskScore);
  const reasoning = buildReasoningChain(context, confidence, alignment, risk, adjustedScore, action);

  return {
    action,
    score: adjustedScore,
    bias,
    confidence: confidenceScore,
    reasoning,
    alignmentContribution,
    confidenceContribution,
    riskContribution,
  };
}

function computeBaseScore(context: DecisionContext): number {
  const structScore = context.marketStructure.strength;
  const positioningScore = (context.institutionalPositioning.positioningScore + 100) / 2;
  const macroScore = context.macroBias.score;
  const participationScore = context.marketParticipation.participationScore;

  return Math.round(structScore * 0.25 + positioningScore * 0.30 + macroScore * 0.25 + participationScore * 0.20);
}

function computeAlignmentContribution(score: number, direction: string): number {
  const base = direction === "Bullish" ? score : direction === "Bearish" ? 100 - score : 50;
  return Math.round(base);
}

function computeConfidenceContribution(score: number): number {
  return score;
}

function computeRiskContribution(score: number): number {
  return score;
}

function scoreToBias(score: number): DriverBias {
  if (score >= 70) return "Strong Bullish";
  if (score >= 58) return "Bullish";
  if (score <= 30) return "Strong Bearish";
  if (score <= 42) return "Bearish";
  return "Neutral";
}

function deriveAction(
  score: number,
  confidence: number,
  alignment: number,
  risk: number
): DecisionV2Action {
  if (score >= 70 && confidence >= 65 && alignment >= 60 && risk < 60) return "Strong Buy";
  if (score >= 58 && confidence >= 50 && alignment >= 45 && risk < 70) return "Buy";
  if (score <= 30 && confidence >= 65 && alignment >= 60 && risk < 60) return "Strong Sell";
  if (score <= 42 && confidence >= 50 && alignment >= 45 && risk < 70) return "Sell";
  if (risk >= 60 && (score >= 58 || score <= 42)) return "Wait";
  if (confidence < 40) return "Wait";
  if (alignment < 35) return "Wait";
  return "Wait";
}

function buildReasoningChain(
  context: DecisionContext,
  confidence: ConfidenceResult,
  alignment: AlignmentResult,
  risk: RiskResult,
  finalScore: number,
  action: DecisionV2Action
): string[] {
  const chain: string[] = [];

  chain.push(`Market structure: ${context.marketStructure.trend} with strength ${context.marketStructure.strength}/100`);
  chain.push(`Institutional positioning score: ${context.institutionalPositioning.positioningScore}/100`);

  if (context.institutionalPositioning.etfDirection !== "Unknown") {
    chain.push(`ETF flows: ${context.institutionalPositioning.etfDirection}`);
  }
  if (context.institutionalPositioning.commercialPositioning !== "Unknown") {
    chain.push(`Commercials: ${context.institutionalPositioning.commercialPositioning}`);
  }

  chain.push(`Macro bias: ${context.macroBias.bias} (${context.macroBias.score}/100)`);
  chain.push(`Volatility regime: ${context.technicalRisk.volatilityRegime} (VIX: ${context.technicalRisk.vixLevel.toFixed(1)})`);

  chain.push(`Alignment: ${alignment.score}/100 — ${alignment.strength} ${alignment.direction}`);
  chain.push(`Confidence: ${confidence.score}/100 — ${confidence.level}`);
  chain.push(`Risk: ${risk.score}/100 — ${risk.class}`);
  chain.push(`Decision score: ${finalScore}/100 → ${action}`);

  return chain;
}
