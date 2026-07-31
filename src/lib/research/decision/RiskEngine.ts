import type { EvidenceRecord, ConflictResult, RiskAssessment, RiskLevel } from "./types";
import type { ResearchBias, ResearchDecision } from "../models";

const BIAS_RISK: Record<string, number> = {
  Bullish: 20,
  "Slightly Bullish": 30,
  Neutral: 50,
  "Slightly Bearish": 60,
  Bearish: 70,
};

export function assessRisk(
  evidence: EvidenceRecord[],
  conflicts: ConflictResult,
  bias: ResearchBias,
  decision: ResearchDecision
): RiskAssessment {
  const volatilityEvidence = evidence.filter((e) => e.category === "volatility");
  const macroEvidence = evidence.filter((e) => e.category === "macro");
  const institutionalEvidence = evidence.filter((e) => e.category === "institutional" || e.category === "etf" || e.category === "cot");

  const marketRisk = computeMarketRisk(bias, conflicts);
  const liquidityRisk = computeLiquidityRisk(evidence);
  const volatilityRisk = computeVolatilityRisk(volatilityEvidence);
  const macroRisk = computeMacroRisk(macroEvidence);
  const institutionalRisk = computeInstitutionalRisk(institutionalEvidence);
  const newsRisk = computeNewsRisk();
  const eventRisk = computeEventRisk(evidence);

  const breakdown = [
    { category: "Market Risk", score: marketRisk.score, level: marketRisk.level, driver: "Overall bias & conflict" },
    { category: "Liquidity Risk", score: liquidityRisk.score, level: liquidityRisk.level, driver: "Market participation" },
    { category: "Volatility Risk", score: volatilityRisk.score, level: volatilityRisk.level, driver: "Volatility indicators" },
    { category: "Macro Risk", score: macroRisk.score, level: macroRisk.level, driver: "Macro indicators" },
    { category: "Institutional Risk", score: institutionalRisk.score, level: institutionalRisk.level, driver: "Institutional flows" },
    { category: "News Risk", score: newsRisk.score, level: newsRisk.level, driver: "News sentiment" },
    { category: "Event Risk", score: eventRisk.score, level: eventRisk.level, driver: "Upcoming events" },
  ];

  const overallScore = Math.round(breakdown.reduce((s, b) => s + b.score, 0) / breakdown.length);
  const overallRisk = scoreToLevel(overallScore);

  return {
    marketRisk: marketRisk.level,
    liquidityRisk: liquidityRisk.level,
    volatilityRisk: volatilityRisk.level,
    macroRisk: macroRisk.level,
    institutionalRisk: institutionalRisk.level,
    newsRisk: newsRisk.level,
    eventRisk: eventRisk.level,
    overallRisk,
    overallScore,
    breakdown,
  };
}

function computeMarketRisk(bias: ResearchBias, conflicts: ConflictResult): { score: number; level: RiskLevel } {
  const biasRisk = BIAS_RISK[bias.overallBias] ?? 50;
  const conflictPenalty = conflicts.score * 0.4;
  const score = Math.round(Math.min(100, biasRisk + conflictPenalty));
  return { score, level: scoreToLevel(score) };
}

function computeLiquidityRisk(evidence: EvidenceRecord[]): { score: number; level: RiskLevel } {
  const breadthEvidence = evidence.find((e) => e.category === "breadth");
  if (!breadthEvidence) return { score: 50, level: "Medium" };

  const score = breadthEvidence.bias === "Bullish" ? 25 : breadthEvidence.bias === "Bearish" ? 60 : 50;
  return { score, level: scoreToLevel(score) };
}

function computeVolatilityRisk(volatilityEvidence: EvidenceRecord[]): { score: number; level: RiskLevel } {
  if (volatilityEvidence.length === 0) return { score: 50, level: "Medium" };

  const avgConfidence = volatilityEvidence.reduce((s, e) => s + e.confidence, 0) / volatilityEvidence.length;
  const bearishCount = volatilityEvidence.filter((e) => e.bias === "Bearish").length;

  const base = bearishCount > 0 ? 65 : 35;
  const score = Math.round(base + (100 - avgConfidence) * 0.3);
  return { score: Math.min(100, score), level: scoreToLevel(score) };
}

function computeMacroRisk(macroEvidence: EvidenceRecord[]): { score: number; level: RiskLevel } {
  if (macroEvidence.length === 0) return { score: 50, level: "Medium" };

  const bearishCount = macroEvidence.filter((e) => e.bias === "Bearish").length;
  const score = Math.round((bearishCount / macroEvidence.length) * 100);
  return { score, level: scoreToLevel(score) };
}

function computeInstitutionalRisk(institutionalEvidence: EvidenceRecord[]): { score: number; level: RiskLevel } {
  if (institutionalEvidence.length === 0) return { score: 50, level: "Medium" };

  const bearishWeight = institutionalEvidence
    .filter((e) => e.bias === "Bearish")
    .reduce((s, e) => s + e.weight, 0);
  const totalWeight = institutionalEvidence.reduce((s, e) => s + e.weight, 0) || 1;

  const score = Math.round((bearishWeight / totalWeight) * 100);
  return { score, level: scoreToLevel(score) };
}

function computeNewsRisk(): { score: number; level: RiskLevel } {
  return { score: 40, level: "Low" };
}

function computeEventRisk(evidence: EvidenceRecord[]): { score: number; level: RiskLevel } {
  const macroBias = evidence.filter((e) => e.category === "macro").map((e) => e.bias);
  const hasDeteriorating = macroBias.includes("Bearish");
  const score = hasDeteriorating ? 60 : 35;
  return { score, level: scoreToLevel(score) };
}

function scoreToLevel(score: number): RiskLevel {
  if (score >= 75) return "Extreme";
  if (score >= 55) return "High";
  if (score >= 35) return "Medium";
  return "Low";
}
