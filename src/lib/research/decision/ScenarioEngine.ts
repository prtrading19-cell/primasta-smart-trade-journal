import type { EvidenceRecord, ConflictResult, ConfidenceBreakdown, ScenarioResult, ScenarioCase } from "./types";
import type { DriverBias } from "@/types/goldResearchConfig";

export function generateScenarios(
  evidence: EvidenceRecord[],
  conflicts: ConflictResult,
  confidence: ConfidenceBreakdown
): ScenarioResult {
  const bullEvidence = evidence.filter((e) => e.bias === "Bullish" || e.bias === "Strong Bullish");
  const bearEvidence = evidence.filter((e) => e.bias === "Bearish" || e.bias === "Strong Bearish");
  const neutralEvidence = evidence.filter((e) => e.bias === "Neutral");

  const totalWeight = evidence.reduce((s, e) => s + e.weight, 0) || 1;
  const bullWeight = bullEvidence.reduce((s, e) => s + e.weight, 0) / totalWeight;
  const bearWeight = bearEvidence.reduce((s, e) => s + e.weight, 0) / totalWeight;

  const baseProbability = 50 + (bullWeight - bearWeight) * 30;
  const baseProbabilityClamped = Math.max(20, Math.min(80, Math.round(baseProbability)));

  const bull: ScenarioCase = {
    type: "bull",
    title: "Bull Case",
    probability: bullWeight > bearWeight ? baseProbabilityClamped + 15 : 30,
    supportingEvidence: bullEvidence.map((e) => `${e.driverTitle}: ${e.interpretation}`),
    invalidationConditions: [
      ...bearEvidence.map((e) => `${e.driverTitle} turns negative`),
      "Key technical support breaks",
    ],
    catalysts: [
      "Improving macro data",
      "Central bank policy shift",
      "Institutional accumulation",
    ],
    risks: [
      "Unexpected hawkish Fed",
      "Geopolitical shock",
      "Liquidity crisis",
    ],
  };

  const base: ScenarioCase = {
    type: "base",
    title: "Base Case",
    probability: baseProbabilityClamped,
    supportingEvidence: evidence.slice(0, 5).map((e) => `${e.driverTitle}: ${e.interpretation}`),
    invalidationConditions: [
      "Major change in macro outlook",
      "Black swan event",
    ],
    catalysts: [
      "Continuation of current trends",
      "Seasonal patterns",
    ],
    risks: [
      "Unexpected volatility spike",
      "Positioning unwind",
    ],
  };

  const bear: ScenarioCase = {
    type: "bear",
    title: "Bear Case",
    probability: bearWeight > bullWeight ? baseProbabilityClamped + 15 : 30,
    supportingEvidence: bearEvidence.map((e) => `${e.driverTitle}: ${e.interpretation}`),
    invalidationConditions: [
      ...bullEvidence.map((e) => `${e.driverTitle} strengthens further`),
      "Key technical resistance breaks",
    ],
    catalysts: [
      "Deteriorating macro conditions",
      "Earnings recession",
      "Institutional distribution",
    ],
    risks: [
      "Recession fears",
      "Credit event",
      "Policy error",
    ],
  };

  const mostLikely: ScenarioResult["mostLikely"] =
    bull.probability > bear.probability && bull.probability > base.probability ? "bull"
    : bear.probability > bull.probability && bear.probability > base.probability ? "bear"
    : "base";

  const totalProb = bull.probability + base.probability + bear.probability;
  bull.probability = Math.round((bull.probability / totalProb) * 100);
  base.probability = Math.round((base.probability / totalProb) * 100);
  bear.probability = Math.round((bear.probability / totalProb) * 100);

  return { bull, base, bear, mostLikely };
}
