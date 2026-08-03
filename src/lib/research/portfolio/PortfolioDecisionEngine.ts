import type { PortfolioDecision, PortfolioPosition, PortfolioRiskResult } from "./types";
import type { DriverBias } from "@/types/goldResearchConfig";

export interface DecisionEngineInput {
  positions: PortfolioPosition[];
  risk: PortfolioRiskResult;
}

export class PortfolioDecisionEngine {
  compute(input: DecisionEngineInput): PortfolioDecision {
    const { positions, risk } = input;

    const active = positions.filter((p) => p.state !== "Invalidated");
    const weightedScore = active.reduce((sum, p) => sum + p.score * (p.confidence / 100), 0);
    const totalWeight = active.reduce((sum, p) => sum + (p.confidence / 100), 0);
    const score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    const confidence = active.length > 0
      ? Math.round(active.reduce((s, p) => s + p.confidence, 0) / active.length)
      : 0;

    const bias = biasFromScore(score);

    const reasoning: string[] = [];
    reasoning.push(`Composite signal score ${score} across ${active.length} active research signal(s).`);
    reasoning.push(`Portfolio risk rated ${risk.overallRisk} (score ${risk.overallScore}/100).`);

    const reasoningFor = active.filter((p) => p.score > 0).map((p) => p.assetName);
    const reasoningAgainst = active.filter((p) => p.score < 0).map((p) => p.assetName);
    if (reasoningFor.length > 0) reasoning.push(`Supporting: ${reasoningFor.join(", ")}.`);
    if (reasoningAgainst.length > 0) reasoning.push(`Constraining: ${reasoningAgainst.join(", ")}.`);

    const action = determineAction(score, confidence, risk);

    return {
      bias,
      action,
      score,
      confidence,
      risk: risk.overallRisk,
      reasoning,
    };
  }
}

function biasFromScore(score: number): DriverBias {
  if (score >= 60) return "Strong Bullish";
  if (score >= 25) return "Bullish";
  if (score <= -60) return "Strong Bearish";
  if (score <= -25) return "Bearish";
  return "Neutral";
}

function determineAction(score: number, confidence: number, risk: PortfolioRiskResult): PortfolioDecision["action"] {
  if (risk.overallRisk === "Extreme" || risk.overallRisk === "High") return "HEDGE";
  if (confidence < 40) return "WAIT";
  if (score >= 60) return "ACCUMULATE";
  if (score <= -60) return "REDUCE";
  if (risk.riskClusters.length > 0) return "REBALANCE";
  return "WAIT";
}

export function computePortfolioDecision(input: DecisionEngineInput): PortfolioDecision {
  return new PortfolioDecisionEngine().compute(input);
}
