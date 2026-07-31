import type { EvidenceRecord, ConfidenceBreakdown } from "./types";

export function calculateDecisionConfidence(
  evidence: EvidenceRecord[],
  providerHealth?: { successRate: number; averageLatency: number } | null
): ConfidenceBreakdown {
  if (evidence.length === 0) {
    return {
      score: 0,
      level: "Very Low",
      components: { freshness: 0, providerHealth: 0, evidenceCount: 0, agreement: 0, completeness: 0 },
    };
  }

  const now = Date.now();

  /* Freshness: how recent is the evidence (max 30 min considered fresh) */
  const freshnessScores = evidence.map((e) => {
    const age = now - new Date(e.timestamp).getTime();
    if (age < 5 * 60 * 1000) return 100;
    if (age < 15 * 60 * 1000) return 85;
    if (age < 30 * 60 * 1000) return 70;
    if (age < 60 * 60 * 1000) return 50;
    if (age < 4 * 60 * 60 * 1000) return 30;
    return 10;
  });
  const freshness = Math.round(freshnessScores.reduce((a, b) => a + b, 0) / freshnessScores.length);

  /* Provider health */
  const healthScore = providerHealth
    ? Math.round(providerHealth.successRate * (1 - Math.min(providerHealth.averageLatency / 5000, 1)))
    : 70;
  const providerHealthScore = Math.max(0, Math.min(100, healthScore));

  /* Evidence count (diminishing returns after 15) */
  const countNorm = Math.min(evidence.length / 15, 1);
  const evidenceCount = Math.round(countNorm * 100);

  /* Agreement: how many evidence items agree on bias */
  const biasCounts: Record<string, number> = {};
  for (const e of evidence) {
    biasCounts[e.bias] = (biasCounts[e.bias] ?? 0) + 1;
  }
  const maxAgreement = Math.max(...Object.values(biasCounts));
  const agreement = Math.round((maxAgreement / evidence.length) * 100);

  /* Completeness: how many categories are covered */
  const coveredCategories = new Set(evidence.map((e) => e.category));
  const expectedCategories = ["macro", "institutional", "sentiment", "technical", "breadth", "volatility", "etf", "cot"];
  const covered = expectedCategories.filter((c) => coveredCategories.has(c)).length;
  const completeness = Math.round((covered / expectedCategories.length) * 100);

  /* Weighted score */
  const score = Math.round(
    freshness * 0.15 +
    providerHealthScore * 0.20 +
    evidenceCount * 0.20 +
    agreement * 0.30 +
    completeness * 0.15
  );

  const clamped = Math.max(0, Math.min(100, score));

  let level: ConfidenceBreakdown["level"];
  if (clamped >= 85) level = "Very High";
  else if (clamped >= 70) level = "High";
  else if (clamped >= 50) level = "Moderate";
  else if (clamped >= 30) level = "Low";
  else level = "Very Low";

  return {
    score: clamped,
    level,
    components: { freshness, providerHealth: providerHealthScore, evidenceCount, agreement, completeness },
  };
}
