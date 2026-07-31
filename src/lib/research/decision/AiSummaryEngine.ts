import type { DecisionIntelligenceResult, DecisionHistoryEntry } from "./types";

export function generateAiSummary(result: DecisionIntelligenceResult, history?: DecisionHistoryEntry[]): string {
  const parts: string[] = [];
  const latestHistory = (history ?? []).length > 1 ? history?.[1] : null;

  /* Overview */
  const actionLabel = result.decision.action === "STRONG BUY" ? "STRONG BUY"
    : result.decision.action === "BUY" ? "BUY"
    : result.decision.action === "SELL" ? "SELL"
    : result.decision.action === "STRONG SELL" ? "STRONG SELL"
    : "HOLD / WAIT";

  parts.push("## " + result.asset + " - " + actionLabel);
  parts.push("Confidence: " + result.confidence.score + "% (" + result.confidence.level + ")");
  parts.push("Risk: " + result.risk.overallRisk + " (" + result.risk.overallScore + "/100)");
  parts.push("Conflict: " + result.conflicts.severity + " (" + result.conflicts.score + "/100)");
  parts.push("Most Likely Scenario: " + result.scenario.mostLikely);
  parts.push("");

  /* What changed vs last decision */
  if (latestHistory) {
    const prevAction = latestHistory.decision.action;
    if (prevAction !== result.decision.action) {
      parts.push("**OUTLOOK CHANGE:** Previous " + prevAction + " -> " + result.decision.action);
    }

    const confDiff = result.confidence.score - latestHistory.confidence.score;
    if (confDiff > 10) parts.push("Confidence increased by " + confDiff + " points");
    else if (confDiff < -10) parts.push("Confidence decreased by " + Math.abs(confDiff) + " points");
  }

  /* Supporting evidence */
  parts.push("");
  parts.push("### Supporting Evidence");
  for (const reason of result.decision.reasonsFor.slice(0, 5)) {
    parts.push("- " + reason);
  }

  /* Conflicting evidence */
  if (result.decision.reasonsAgainst.length > 0) {
    parts.push("");
    parts.push("### Conflicting Evidence");
    for (const reason of result.decision.reasonsAgainst.slice(0, 3)) {
      parts.push("- " + reason);
    }
  }

  /* Conflicts */
  if (result.conflicts.conflictingPairs.length > 0) {
    parts.push("");
    parts.push("### Key Conflicts");
    for (const pair of result.conflicts.conflictingPairs.slice(0, 3)) {
      parts.push("- " + pair.explanation);
    }
  }

  /* Scenario Probabilities */
  parts.push("");
  parts.push("### Scenario Probabilities");
  parts.push("- Bull: " + result.scenario.bull.probability + "% - " + (result.scenario.bull.probability >= 40 ? "favored" : "less likely"));
  parts.push("- Base: " + result.scenario.base.probability + "% - baseline case");
  parts.push("- Bear: " + result.scenario.bear.probability + "% - " + (result.scenario.bear.probability >= 40 ? "tail risk elevated" : "tail risk contained"));

  /* Risk Breakdown */
  const highRisks = result.risk.breakdown.filter((b) => b.level === "Extreme" || b.level === "High");
  if (highRisks.length > 0) {
    parts.push("");
    parts.push("### Elevated Risks");
    for (const risk of highRisks) {
      parts.push("- " + risk.category + ": " + risk.level + " (" + risk.score + "/100) - " + risk.driver);
    }
  }

  /* Invalidation conditions */
  parts.push("");
  parts.push("### Invalidation Conditions");
  for (const cond of result.decision.invalidationConditions) {
    parts.push("- " + cond);
  }

  /* Catalysts */
  parts.push("");
  parts.push("### Catalysts to Watch");
  for (const cat of result.decision.catalysts) {
    parts.push("- " + cat);
  }

  /* Pipeline timing */
  const totalDuration = result.timeline.reduce((s, t) => s + t.durationMs, 0);
  parts.push("");
  parts.push("### Pipeline Performance");
  parts.push("Total: " + totalDuration + "ms across " + result.timeline.length + " stages");
  for (const entry of result.timeline) {
    parts.push("- " + entry.engine + ": " + entry.durationMs + "ms (conf: " + entry.confidence + ")");
  }

  return parts.join("\n");
}
