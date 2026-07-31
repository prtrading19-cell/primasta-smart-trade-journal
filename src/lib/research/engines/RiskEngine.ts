import type { DecisionContext, RiskResult } from "./types";
import { riskClass } from "./types";

export function calculateRisk(context: DecisionContext): RiskResult {
  const gvzRisk = computeGVZRisk(context);
  const vixRisk = computeVIXRisk(context);
  const macroRisk = computeMacroRisk(context);
  const breadthRisk = computeBreadthRisk(context);
  const cotRisk = computeCOTRisk(context);
  const oiRisk = computeOIRisk(context);

  const rawScore =
    gvzRisk * 0.15 +
    vixRisk * 0.25 +
    macroRisk * 0.25 +
    breadthRisk * 0.15 +
    cotRisk * 0.10 +
    oiRisk * 0.10;

  const score = Math.round(Math.max(0, Math.min(100, rawScore)));
  const risk = riskClass(score);

  const breakdown = buildRiskBreakdown(
    gvzRisk,
    vixRisk,
    macroRisk,
    breadthRisk,
    cotRisk,
    oiRisk,
    score,
    risk
  );

  return {
    score,
    class: risk,
    components: {
      gvzRisk,
      vixRisk,
      macroRisk,
      breadthRisk,
      cotRisk,
      openInterestRisk: oiRisk,
    },
    breakdown,
  };
}

function computeGVZRisk(context: DecisionContext): number {
  const gvz = context.technicalRisk.gvzLevel;
  if (gvz === undefined || gvz === null) return 30;
  if (gvz > 35) return 90;
  if (gvz > 28) return 75;
  if (gvz > 22) return 55;
  if (gvz > 16) return 35;
  return 15;
}

function computeVIXRisk(context: DecisionContext): number {
  const vix = context.technicalRisk.vixLevel;
  if (vix > 35) return 90;
  if (vix > 28) return 75;
  if (vix > 22) return 55;
  if (vix > 16) return 40;
  if (vix > 12) return 25;
  return 15;
}

function computeMacroRisk(context: DecisionContext): number {
  const { macroBias } = context;
  if (macroBias.economicHealth === "Deteriorating" && macroBias.fedPolicyImpact === "Restrictive") return 85;
  if (macroBias.economicHealth === "Deteriorating") return 70;
  if (macroBias.fedPolicyImpact === "Restrictive") return 60;
  if (macroBias.fedPolicyImpact === "Moderately Restrictive") return 45;
  if (macroBias.economicHealth === "Improving" && macroBias.fedPolicyImpact === "Accommodative") return 15;
  if (macroBias.economicHealth === "Improving") return 25;
  return 40;
}

function computeBreadthRisk(context: DecisionContext): number {
  const { marketParticipation } = context;
  const ratio = marketParticipation.breadthRatio;
  if (ratio === 0) return 50;
  if (ratio > 2.5) return 10;
  if (ratio > 1.5) return 20;
  if (ratio > 1.0) return 30;
  if (ratio > 0.7) return 50;
  if (ratio > 0.4) return 70;
  return 85;
}

function computeCOTRisk(context: DecisionContext): number {
  const { institutionalPositioning } = context;
  const level = institutionalPositioning.crowdingLevel;
  if (level === "Extreme") return 85;
  if (level === "High") return 65;
  if (level === "Moderate") return 40;
  return 20;
}

function computeOIRisk(context: DecisionContext): number {
  const { liquidity } = context;
  if (liquidity.openInterestTrend === "Unknown") return 50;
  if (liquidity.openInterestTrend === "Falling" && Math.abs(liquidity.openInterestChange) > 1000) return 70;
  if (liquidity.openInterestTrend === "Falling") return 55;
  if (liquidity.openInterestTrend === "Rising" && Math.abs(liquidity.openInterestChange) > 1000) return 20;
  if (liquidity.openInterestTrend === "Rising") return 30;
  return 40;
}

function buildRiskBreakdown(
  gvz: number,
  vix: number,
  macro: number,
  breadth: number,
  cot: number,
  oi: number,
  finalScore: number,
  riskClass: string
): string[] {
  const lines: string[] = [];

  lines.push(`GVZ risk contribution: ${gvz}/100`);
  lines.push(`VIX risk contribution: ${vix}/100`);
  lines.push(`Macro risk contribution: ${macro}/100`);
  lines.push(`Breadth risk contribution: ${breadth}/100`);
  lines.push(`COT crowding risk: ${cot}/100`);
  lines.push(`Open interest risk: ${oi}/100`);

  lines.push(`Overall risk score: ${finalScore}/100 — ${riskClass}`);

  return lines;
}
