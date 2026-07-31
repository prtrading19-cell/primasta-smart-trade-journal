import type { ResearchDriver, ResearchCategory } from "../models";
import type { DriverAnalysisObject, DriverBias, WeightConfiguration } from "@/types/goldResearchConfig";
import { calculateCategoryScoresBatch } from "@/lib/categoryScoreEngine";

export { calculateCategoryScoresBatch } from "@/lib/categoryScoreEngine";

export function executeCategoryEngine(
  drivers: ResearchDriver[],
  weightConfig?: WeightConfiguration,
  categoryIds?: string[]
): { categories: ResearchCategory[]; overallConfidence: number; hasConflict: boolean } {
  const driverAnalyses = mapToDriverAnalyses(drivers);

  if (driverAnalyses.length === 0) {
    return { categories: [], overallConfidence: 0, hasConflict: false };
  }

  const result = calculateCategoryScoresBatch({
    driverAnalyses,
    config: weightConfig,
    categoryIds,
  });

  const categories: ResearchCategory[] = result.scores.map((s) => {
    const catDrivers = drivers.filter((d) => d.categoryId === s.categoryId);
    return {
      categoryId: s.categoryId,
      categoryTitle: s.categoryTitle,
      score: s.score,
      bias: s.bias as DriverBias,
      confidence: s.confidence,
      weight: s.weight,
      weightedScore: s.weightedScore,
      driverCount: s.driverCount,
      hasConflict: s.hasConflict,
      drivers: catDrivers,
      reason: s.reason,
    };
  });

  return {
    categories,
    overallConfidence: result.overallConfidence,
    hasConflict: result.hasConflict,
  };
}

function mapToDriverAnalyses(drivers: ResearchDriver[]): DriverAnalysisObject[] {
  return drivers.map((d) => {
    const analysis: DriverAnalysisObject = {
      driverId: d.driverId,
      driverTitle: d.driverTitle,
      categoryId: d.categoryId,
      bias: d.bias,
      biasReason: d.reason,
      strength: d.strength,
      strengthFactors: [],
      confidence: d.confidence,
      confidenceReason: "",
      technicalObservation: "",
      supportingDrivers: [],
      conflictingDrivers: [],
      reason: d.reason,
      aiExplanation: "",
      source: "",
      sourceUrl: "",
      timestamp: new Date().toISOString(),
      weight: d.weight,
      contribution: 0,
      dataFields: {},
    };
    return analysis;
  });
}
