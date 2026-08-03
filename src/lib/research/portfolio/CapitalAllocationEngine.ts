import type { AllocationSuggestion, CapitalAllocationResult, ExposureResult, PortfolioPosition } from "./types";
import { ALLOCATION_ACTION_THRESHOLD, ALLOCATION_CASH_RESERVE_LEVELS, ALLOCATION_SCALE_IN_SCORE, ALLOCATION_SCALE_OUT_SCORE } from "./config";

export interface AllocationEngineInput {
  positions: PortfolioPosition[];
  exposure: ExposureResult;
}

export class CapitalAllocationEngine {
  compute(input: AllocationEngineInput): CapitalAllocationResult {
    const { positions, exposure } = input;

    const totalScore = positions.reduce((s, p) => s + Math.abs(p.score) * (p.confidence / 100), 0);
    const suggestions: AllocationSuggestion[] = [];

    const weightedScores = positions.map((pos) => ({
      pos,
      weighted: Math.abs(pos.score) * (pos.confidence / 100),
    }));

    for (const { pos, weighted } of weightedScores) {
      const currentWeight = exposure.items.find((e) => e.assetId === pos.assetId)?.exposurePercent ?? 0;
      const suggestedWeight = totalScore > 0 ? Math.round((weighted / totalScore) * 1000) / 10 : 0;
      const delta = Math.round((suggestedWeight - currentWeight) * 10) / 10;

      const action = determineAction(pos, delta, suggestedWeight);
      suggestions.push({
        assetId: pos.assetId,
        assetName: pos.assetName,
        action,
        currentWeight,
        suggestedWeight,
        delta,
        conviction: Math.round(pos.confidence),
        reason: buildReason(pos, action, delta),
      });
    }

    const riskLevel = positions.reduce((acc, p) => {
      return orderFor(p.riskLevel) > orderFor(acc) ? p.riskLevel : acc;
    }, "Low" as "Low" | "Medium" | "High" | "Extreme");

    return {
      suggestions,
      targetAllocation: suggestions.map((s) => ({ assetId: s.assetId, weight: s.suggestedWeight })),
      cashReservePercent: ALLOCATION_CASH_RESERVE_LEVELS[riskLevel],
      methodology: "Risk-adjusted conviction weighting scaled by decision confidence and signal strength",
    };
  }
}

function orderFor(level: string): number {
  return { Low: 0, Medium: 1, High: 2, Extreme: 3 }[level] ?? 0;
}

function determineAction(pos: PortfolioPosition, delta: number, suggestedWeight: number): AllocationSuggestion["action"] {
  if (Math.abs(delta) < ALLOCATION_ACTION_THRESHOLD) return "Wait";
  if (pos.score >= ALLOCATION_SCALE_IN_SCORE && pos.state === "Active") return "Scale In";
  if (pos.score <= ALLOCATION_SCALE_OUT_SCORE || pos.state === "Reduced" || pos.state === "Closed") return "Scale Out";
  if (pos.direction === "flat" || pos.state === "Waiting") return "Wait";
  return delta > 0 ? "Increase" : "Reduce";
}

function buildReason(pos: PortfolioPosition, action: AllocationSuggestion["action"], delta: number): string {
  switch (action) {
    case "Scale In":
      return `${pos.assetName} is strongly supported (${pos.action}, confidence ${pos.confidence}) — scale into conviction.`;
    case "Scale Out":
      return `${pos.assetName} signal weakened or reversed (${pos.action}, state ${pos.state}) — scale out.`;
    case "Increase":
      return `Raise weight by ${Math.abs(delta)}% reflecting improving signal.`;
    case "Reduce":
      return `Trim weight by ${Math.abs(delta)}% to control risk exposure.`;
    case "Rotate":
      return `Rotate capital away from ${pos.assetName} toward higher-conviction signals.`;
    default:
      return `Maintain current allocation for ${pos.assetName}.`;
  }
}

export function computeCapitalAllocation(input: AllocationEngineInput): CapitalAllocationResult {
  return new CapitalAllocationEngine().compute(input);
}
