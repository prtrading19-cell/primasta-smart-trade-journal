import type { CorrelationMatrix, DiversificationResult, ExposureResult } from "./types";

export interface DiversificationEngineInput {
  correlation: CorrelationMatrix;
  exposure: ExposureResult;
}

export class DiversificationEngine {
  compute(input: DiversificationEngineInput): DiversificationResult {
    const { correlation, exposure } = input;

    const computed = correlation.cells.filter((c) => c.status === "computed" && c.coefficient !== null);
    const avg = computed.length > 0
      ? Math.round((computed.reduce((s, c) => s + (c.coefficient ?? 0), 0) / computed.length) * 1000) / 1000
      : null;

    const effectiveAssetCount = exposure.concentration > 0
      ? Math.round((1 / exposure.concentration) * 10) / 10
      : 1;

    const highest = computed.length > 0
      ? computed.reduce((best, c) => (c.coefficient! > best.coefficient! ? c : best))
      : null;
    const lowest = computed.length > 0
      ? computed.reduce((best, c) => (c.coefficient! < best.coefficient! ? c : best))
      : null;

    const warnings: string[] = [];
    if (avg !== null && avg > 0.6) warnings.push("High average correlation reduces diversification benefit");
    if (exposure.concentration >= 0.6) warnings.push("Portfolio is concentrated in a small number of signals");
    if (computed.length === 0) warnings.push("Insufficient overlapping history to estimate correlation");

    let score = 50;
    score += Math.min(30, (effectiveAssetCount - 1) * 12);
    if (avg !== null) {
      score -= Math.round(Math.max(0, (avg - 0.3)) * 40);
    }
    if (exposure.concentration >= 0.6) score -= 15;
    score = Math.max(0, Math.min(100, Math.round(score)));

    return {
      score,
      effectiveAssetCount,
      averageCorrelation: avg,
      highestCorrelation: highest,
      lowestCorrelation: lowest,
      assessment: buildAssessment(score, avg, exposure.concentration),
      warnings,
    };
  }
}

function buildAssessment(score: number, avg: number | null, concentration: number): string {
  if (avg === null) {
    return "Diversification estimate is limited by available correlation history; concentration remains the primary risk.";
  }
  if (score >= 70) {
    return `Well-diversified book (avg correlation ${avg.toFixed(2)}) with balanced exposure across signals.`;
  }
  if (score >= 45) {
    return `Moderately diversified; average correlation ${avg.toFixed(2)} and concentration ${concentration.toFixed(2)} warrant monitoring.`;
  }
  return `Concentrated book with elevated correlation (${avg.toFixed(2)}); diversification benefit is low.`;
}

export function computeDiversification(input: DiversificationEngineInput): DiversificationResult {
  return new DiversificationEngine().compute(input);
}
