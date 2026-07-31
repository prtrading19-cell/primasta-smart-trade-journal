import type { DecisionContext, ConfidenceResult, ConfidenceLevel, ConfidenceInputs } from "./types";
import { confidenceLevel } from "./types";

export function calculateConfidence(
  context: DecisionContext,
  overrides?: Partial<ConfidenceInputs>
): ConfidenceResult {
  const inputs: ConfidenceInputs = overrides
    ? { ...context.confidenceInputs, ...overrides }
    : context.confidenceInputs;

  const providerFreshness = inputs.providerFreshness;
  const providerAgreement = inputs.providerAgreement;
  const providerAvailability = inputs.providerAvailability;
  const signalQuality = inputs.signalQuality;
  const historicalConsistency = inputs.historicalConsistency;

  const conflictPenalty = computeConflictPenalty(context);

  const rawScore =
    providerFreshness * 0.15 +
    providerAgreement * 0.25 +
    providerAvailability * 0.20 +
    signalQuality * 0.15 +
    historicalConsistency * 0.10 -
    conflictPenalty * 0.15;

  const score = Math.round(Math.max(0, Math.min(100, rawScore)));
  const level = confidenceLevel(score);

  const breakdown = buildConfidenceBreakdown(
    providerFreshness,
    providerAgreement,
    providerAvailability,
    signalQuality,
    conflictPenalty,
    historicalConsistency,
    score,
    level
  );

  return {
    score,
    level,
    components: {
      providerFreshness,
      providerAgreement,
      providerAvailability,
      signalQuality,
      conflictPenalty: Math.round(conflictPenalty),
      historicalConsistency,
    },
    breakdown,
  };
}

function computeConflictPenalty(context: DecisionContext): number {
  let penalty = 0;

  const { institutionalPositioning, macroBias, marketStructure, technicalRisk } = context;

  const positioningScore = institutionalPositioning.positioningScore;
  const macroScore = macroBias.score;
  const structureScore = marketStructure.strength;

  const scores = [positioningScore, macroScore - 50, structureScore - 50];
  const positive = scores.filter((s) => s > 0).length;
  const negative = scores.filter((s) => s < 0).length;
  const total = scores.length;

  const agreementRatio = Math.max(positive, negative) / total;

  if (agreementRatio >= 0.8) penalty += 0;
  else if (agreementRatio >= 0.6) penalty += 10;
  else if (agreementRatio >= 0.4) penalty += 25;
  else penalty += 40;

  if (technicalRisk.volatilityRegime === "Extreme") penalty += 15;
  if (marketStructure.trend === "Mixed") penalty += 10;

  return Math.min(100, penalty);
}

function buildConfidenceBreakdown(
  freshness: number,
  agreement: number,
  availability: number,
  quality: number,
  conflictPenalty: number,
  history: number,
  finalScore: number,
  level: ConfidenceLevel
): string[] {
  const lines: string[] = [];

  lines.push(`Provider freshness contribution: ${freshness}/100`);
  lines.push(`Provider agreement contribution: ${agreement}/100`);
  lines.push(`Provider availability: ${availability}/100`);
  lines.push(`Signal quality: ${quality}/100`);
  lines.push(`Historical consistency: ${history}/100`);

  if (conflictPenalty > 20) {
    lines.push(`Conflict penalty: -${conflictPenalty} points (significant cross-signal conflict)`);
  } else if (conflictPenalty > 0) {
    lines.push(`Conflict penalty: -${conflictPenalty} points (minor signal conflict)`);
  }

  lines.push(`Final confidence: ${finalScore}/100 — ${level}`);

  return lines;
}
