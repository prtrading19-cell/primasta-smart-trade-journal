import type { EvidenceRecord, ConflictResult, ConfidenceBreakdown, RiskAssessment, ScenarioResult, DecisionExplanation } from "./types";
import type { ResearchBias, ResearchDecision } from "../models";

export function buildDecisionExplanation(
  bias: ResearchBias,
  decision: ResearchDecision,
  evidence: EvidenceRecord[],
  conflicts: ConflictResult,
  confidence: ConfidenceBreakdown,
  risk: RiskAssessment,
  scenario: ScenarioResult
): DecisionExplanation {
  const supportingEvidence = evidence.filter((e) => {
    const isBullish = e.bias === "Bullish" || e.bias === "Strong Bullish";
    const isBuy = decision.action === "BUY" || decision.action === "STRONG BUY";
    return isBuy ? isBullish : !isBullish;
  });

  const conflictingEvidence = evidence.filter((e) => {
    const isBullish = e.bias === "Bullish" || e.bias === "Strong Bullish";
    const isBuy = decision.action === "BUY" || decision.action === "STRONG BUY";
    return isBuy ? !isBullish : isBullish;
  });

  const reasonsFor = decision.reasoning.length > 0
    ? decision.reasoning
    : supportingEvidence.map((e) => `${e.driverTitle}: ${e.interpretation}`);

  const reasonsAgainst = conflictingEvidence.length > 0
    ? conflictingEvidence.map((e) => `${e.driverTitle}: ${e.interpretation}`)
    : ["No significant conflicting evidence identified"];

  const keyDrivers = evidence.map((e) => {
    const isBuy = decision.action === "BUY" || decision.action === "STRONG BUY";
    const isBullish = e.bias === "Bullish" || e.bias === "Strong Bullish";
    const impact: "supporting" | "conflicting" | "neutral" =
      (isBuy && isBullish) || (!isBuy && !isBullish) ? "supporting"
      : e.bias === "Neutral" ? "neutral"
      : "conflicting";
    return { name: e.driverTitle, impact, contribution: Math.round(e.weight * 100) };
  });

  const invalidationConditions = scenario.bear.invalidationConditions.slice(0, 3);
  const catalysts = scenario.bull.catalysts.slice(0, 3);

  let summary: string;
  switch (decision.action) {
    case "STRONG BUY":
      summary = `Strong conviction buy signal. ${confidence.level.toLowerCase()} confidence (${confidence.score}%) with ${conflicts.severity.toLowerCase()} conflict (${conflicts.score}%). ${risk.overallRisk} overall risk. Most likely scenario: ${scenario.mostLikely}.`;
      break;
    case "BUY":
      summary = `Buy signal with ${confidence.level.toLowerCase()} confidence (${confidence.score}%). ${conflicts.conflictingPairs.length} conflicting pair(s). Risk: ${risk.overallRisk}.`;
      break;
    case "SELL":
      summary = `Sell signal with ${confidence.level.toLowerCase()} confidence (${confidence.score}%). ${conflicts.conflictingPairs.length} conflicting pair(s). Risk: ${risk.overallRisk}.`;
      break;
    case "STRONG SELL":
      summary = `Strong conviction sell signal. ${confidence.level.toLowerCase()} confidence (${confidence.score}%) with ${conflicts.severity.toLowerCase()} conflict (${conflicts.score}%). ${risk.overallRisk} overall risk.`;
      break;
    default:
      summary = `Wait mode. ${confidence.level.toLowerCase()} confidence (${confidence.score}%). ${conflicts.severity.toLowerCase()} conflict (${conflicts.score}%). Awaiting clearer alignment.`;
  }

  return {
    action: decision.action,
    confidence: confidence.score,
    summary,
    reasonsFor,
    reasonsAgainst,
    keyDrivers,
    invalidationConditions,
    catalysts,
    worstCase: scenario.bear.title,
    bestCase: scenario.bull.title,
  };
}
