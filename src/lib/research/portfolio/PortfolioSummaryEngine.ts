import type {
  CapitalAllocationResult,
  CorrelationMatrix,
  DiversificationResult,
  ExposureResult,
  HedgingResult,
  PortfolioDecision,
  PortfolioRiskResult,
  PortfolioSummary,
} from "./types";

export interface SummaryEngineInput {
  decision: PortfolioDecision;
  exposure: ExposureResult;
  diversification: DiversificationResult;
  risk: PortfolioRiskResult;
  allocation: CapitalAllocationResult;
  hedging: HedgingResult;
  correlation: CorrelationMatrix;
}

export class PortfolioSummaryEngine {
  compute(input: SummaryEngineInput): PortfolioSummary {
    const { decision, exposure, diversification, risk, allocation, hedging } = input;

    const headline = buildHeadline(decision, risk.overallScore);
    const overview = buildOverview(decision, risk.overallRisk, exposure.concentrationLabel, diversification.score);
    const keyPoints: string[] = [];
    const tags: string[] = [];

    if (decision.score > 20) tags.push("Accumulate");
    else if (decision.score < -20) tags.push("Defensive");
    else tags.push("Neutral");

    tags.push(risk.overallRisk);
    tags.push(diversification.score >= 60 ? "Diversified" : "Concentrated");

    keyPoints.push(`Overall portfolio signal ${decision.score} (${decision.bias}) with ${decision.confidence}% confidence.`);
    keyPoints.push(`Risk rated ${risk.overallRisk} (${risk.overallScore}/100); correlation impact is ${risk.correlationImpact}.`);

    const increases = allocation.suggestions.filter((s) => s.action === "Increase" || s.action === "Scale In");
    const decreases = allocation.suggestions.filter((s) => s.action === "Reduce" || s.action === "Scale Out");
    if (increases.length > 0) keyPoints.push(`Allocation view favors scaling into: ${increases.map((s) => s.assetName).join(", ")}.`);
    if (decreases.length > 0) keyPoints.push(`Allocation view favors trimming: ${decreases.map((s) => s.assetName).join(", ")}.`);
    if (hedging.suggestions.length > 0) keyPoints.push(`Hedging: ${hedging.suggestions.length} opportunity/opportunities flagged (${hedging.suggestions.map((s) => s.type).join(", ")}).`);
    keyPoints.push(`Suggested cash reserve ${allocation.cashReservePercent}%.`);

    return {
      headline,
      overview,
      keyPoints,
      tags,
    };
  }
}

function buildHeadline(decision: PortfolioDecision, riskScore: number): string {
  if (riskScore >= 80) return `High-risk posture — prioritize capital preservation (${decision.action})`;
  if (decision.action === "ACCUMULATE") return `Accumulate — portfolio signal ${decision.score} (${decision.bias})`;
  if (decision.action === "REDUCE") return `Defensive stance — reduce exposure (signal ${decision.score})`;
  if (decision.action === "HEDGE") return `Hedge and reduce — elevated portfolio risk (${riskScore}/100)`;
  return `Wait — monitor signals; current posture is ${decision.bias}`;
}

function buildOverview(decision: PortfolioDecision, risk: string, concentration: string, diversificationScore: number): string {
  return `Portfolio intelligence rates the book ${decision.bias} with an overall score of ${decision.score} and ${decision.confidence}% confidence. Risk is ${risk}. The book is ${concentration.toLowerCase()} with a diversification score of ${diversificationScore}/100. ${decision.reasoning[1] ?? ""}`;
}

export function computePortfolioSummary(input: SummaryEngineInput): PortfolioSummary {
  return new PortfolioSummaryEngine().compute(input);
}
