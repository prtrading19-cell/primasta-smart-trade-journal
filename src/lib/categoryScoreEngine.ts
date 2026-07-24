import type {
  CategoryScoreObject,
  DriverAnalysisObject,
  DriverBias,
  DriverContribution,
  DriverStrength,
  WeightConfiguration
} from "@/types/goldResearchConfig";
import { BIAS_NUMERIC_MAP, STRENGTH_MULTIPLIER_MAP } from "@/types/goldResearchConfig";
import { CATEGORY_DEFINITIONS } from "@/config/categoryConfig";
import type { CategoryDefinition } from "@/types/goldResearchConfig";
import { DRIVER_REGISTRY } from "@/config/driverRegistry";
import {
  getCategoryWeight,
  DEFAULT_WEIGHT_CONFIGURATION
} from "@/config/defaultWeights";
import {
  resolveWeights,
  resolveCategoryWeight,
  getEffectiveDriverWeight,
  type ResolvedCategoryWeight
} from "./weightResolver";
import {
  validateDriverAnalysis,
  validateDriverAnalyses,
  validateCategoryScore,
  hasMinimumDataForScoring,
  getDataQualityScore
} from "./categoryValidators";

export interface CategoryScoreInput {
  categoryId: string;
  driverAnalyses: DriverAnalysisObject[];
  config?: WeightConfiguration;
}

export interface CategoryScoreBatchInput {
  driverAnalyses: DriverAnalysisObject[];
  config?: WeightConfiguration;
  categoryIds?: string[];
}

export interface CategoryScoreBatchResult {
  scores: CategoryScoreObject[];
  totalScore: number;
  overallBias: DriverBias | "Neutral";
  overallConfidence: number;
  driverAlignment: number;
  alignmentStrength: "Strong" | "Moderate" | "Weak" | "None";
  hasConflict: boolean;
  timestamp: string;
}

export interface CategoryScoreDiagnostics {
  dataQuality: number;
  driverCoverage: number;
  validationErrors: number;
  validationWarnings: number;
  missingDrivers: string[];
  disabledDrivers: string[];
}

export function calculateCategoryScore(input: CategoryScoreInput): CategoryScoreObject {
  const { categoryId, driverAnalyses, config } = input;
  const categoryDef = CATEGORY_DEFINITIONS.find((c) => c.id === categoryId);

  if (!categoryDef) {
    return createEmptyCategoryScore(categoryId, "Unknown Category");
  }

  if (categoryDef.defaultWeight <= 0) {
    return createEmptyCategoryScore(categoryId, categoryDef.title);
  }

  const categoryWeight = getCategoryWeight(categoryId, config);

  const enabledDriverIds = new Set(
    DRIVER_REGISTRY
      .filter((d) => d.enabled)
      .map((d) => d.id)
  );

  const relevantAnalyses = driverAnalyses.filter(
    (analysis) =>
      analysis.categoryId === categoryId &&
      enabledDriverIds.has(analysis.driverId)
  );

  if (relevantAnalyses.length === 0) {
    return {
      categoryId,
      categoryTitle: categoryDef.title,
      score: 0,
      bias: "Neutral",
      confidence: 0,
      driverCount: 0,
      reason: generateEmptyReason(categoryDef, driverAnalyses, categoryId),
      drivers: [],
      timestamp: new Date().toISOString(),
      weight: categoryWeight,
      weightedScore: 0,
      driverContributions: [],
      alignmentScore: 0,
      alignmentStrength: "None",
      hasConflict: false
    };
  }

  const contributions = relevantAnalyses
    .map((analysis) => calculateDriverContribution(analysis, categoryId, config))
    .filter((c) => c.weight > 0);

  if (contributions.length === 0) {
    return {
      categoryId,
      categoryTitle: categoryDef.title,
      score: 0,
      bias: "Neutral",
      confidence: 0,
      driverCount: 0,
      reason: "All drivers in this category have zero weight or are disabled.",
      drivers: relevantAnalyses.map((a) => a.driverTitle),
      timestamp: new Date().toISOString(),
      weight: categoryWeight,
      weightedScore: 0,
      driverContributions: [],
      alignmentScore: 0,
      alignmentStrength: "None",
      hasConflict: false
    };
  }

  const totalWeightedScore = contributions.reduce(
    (sum, c) => sum + c.contribution,
    0
  );

  const totalWeight = contributions.reduce(
    (sum, c) => sum + c.weight,
    0
  );

  const score = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  const bias = scoreToBias(score);
  const confidence = calculateWeightedConfidence(relevantAnalyses, contributions);
  const alignmentScore = calculateAlignmentScore(contributions);
  const alignmentStrength = scoreToAlignmentStrength(alignmentScore);
  const hasConflict = detectConflict(contributions);

  const supportingDrivers = contributions
    .filter((c) => c.contribution > 0.1)
    .sort((a, b) => b.contribution - a.contribution)
    .map((c) => c.driverTitle);

  const conflictingDrivers = contributions
    .filter((c) => c.contribution < -0.1)
    .sort((a, b) => a.contribution - b.contribution)
    .map((c) => c.driverTitle);

  return {
    categoryId,
    categoryTitle: categoryDef.title,
    score,
    bias,
    confidence,
    driverCount: contributions.length,
    reason: generateCategoryReason(bias, confidence, contributions, alignmentStrength, hasConflict),
    drivers: contributions.map((c) => c.driverTitle),
    timestamp: new Date().toISOString(),
    weight: categoryWeight,
    weightedScore: totalWeightedScore,
    driverContributions: contributions,
    alignmentScore,
    alignmentStrength,
    hasConflict
  };
}

export function calculateAllCategoryScores(
  driverAnalyses: DriverAnalysisObject[],
  config?: WeightConfiguration
): CategoryScoreObject[] {
  const activeCategories = CATEGORY_DEFINITIONS.filter(
    (c) => c.defaultWeight > 0
  );

  return activeCategories.map((category) =>
    calculateCategoryScore({
      categoryId: category.id,
      driverAnalyses,
      config
    })
  );
}

export function calculateCategoryScoresBatch(
  input: CategoryScoreBatchInput
): CategoryScoreBatchResult {
  const { driverAnalyses, config, categoryIds } = input;

  const targetCategoryIds = categoryIds ??
    CATEGORY_DEFINITIONS
      .filter((c) => c.defaultWeight > 0)
      .map((c) => c.id);

  const scores = targetCategoryIds.map((categoryId) =>
    calculateCategoryScore({ categoryId, driverAnalyses, config })
  );

  const nonEmptyScores = scores.filter((s) => s.driverCount > 0);

  const totalScore = calculateTotalScore(scores, config);
  const overallBias = scoreToBias(totalScore);
  const overallConfidence = calculateOverallConfidence(nonEmptyScores);
  const driverAlignment = calculateOverallAlignment(nonEmptyScores);
  const alignmentStrength = scoreToAlignmentStrength(driverAlignment);
  const hasConflict = nonEmptyScores.some((s) => s.hasConflict);

  return {
    scores,
    totalScore,
    overallBias,
    overallConfidence,
    driverAlignment,
    alignmentStrength,
    hasConflict,
    timestamp: new Date().toISOString()
  };
}

export function calculateDriverContribution(
  analysis: DriverAnalysisObject,
  categoryId: string,
  config?: WeightConfiguration
): DriverContribution {
  const weight = getEffectiveDriverWeight(categoryId, analysis.driverId, config);
  const biasValue = BIAS_NUMERIC_MAP[analysis.bias] ?? 0;
  const strengthMultiplier = STRENGTH_MULTIPLIER_MAP[analysis.strength] ?? 0.5;
  const confidenceMultiplier = analysis.confidence / 100;
  const contribution = biasValue * strengthMultiplier * confidenceMultiplier * weight;

  return {
    driverId: analysis.driverId,
    driverTitle: analysis.driverTitle,
    bias: analysis.bias,
    strength: analysis.strength,
    confidence: analysis.confidence,
    weight,
    contribution,
    reason: analysis.reason
  };
}

export function getCategoryDiagnostics(
  driverAnalyses: DriverAnalysisObject[],
  categoryId: string
): CategoryScoreDiagnostics {
  const categoryDef = CATEGORY_DEFINITIONS.find((c) => c.id === categoryId);

  const expectedDriverIds = categoryDef?.driverIds ?? [];
  const enabledDriverIds = DRIVER_REGISTRY
    .filter((d) => expectedDriverIds.includes(d.id))
    .filter((d) => d.enabled)
    .map((d) => d.id);

  const relevantAnalyses = driverAnalyses.filter(
    (a) => a.categoryId === categoryId
  );

  const providedDriverIds = relevantAnalyses.map((a) => a.driverId);
  const missingDrivers = enabledDriverIds.filter(
    (id) => !providedDriverIds.includes(id)
  );

  const disabledDrivers = expectedDriverIds.filter((id) => {
    const driver = DRIVER_REGISTRY.find((d) => d.id === id);
    return driver && !driver.enabled;
  });

  const driverCoverage = enabledDriverIds.length > 0
    ? Math.round((providedDriverIds.filter((id) => enabledDriverIds.includes(id)).length / enabledDriverIds.length) * 100)
    : 0;

  const validation = validateDriverAnalyses(relevantAnalyses);

  const dataQuality = getDataQualityScore(driverAnalyses, categoryId);

  return {
    dataQuality,
    driverCoverage,
    validationErrors: validation.errors.length,
    validationWarnings: validation.warnings.length,
    missingDrivers,
    disabledDrivers
  };
}

function calculateTotalScore(
  scores: CategoryScoreObject[],
  config?: WeightConfiguration
): number {
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight <= 0) return 0;

  const weightedSum = scores.reduce(
    (sum, s) => sum + s.score * s.weight,
    0
  );

  return weightedSum / totalWeight;
}

function calculateWeightedConfidence(
  analyses: DriverAnalysisObject[],
  contributions: DriverContribution[]
): number {
  if (contributions.length === 0) return 0;

  let totalWeightedConfidence = 0;
  let totalWeight = 0;

  for (const contribution of contributions) {
    totalWeightedConfidence += contribution.confidence * contribution.weight;
    totalWeight += contribution.weight;
  }

  if (totalWeight <= 0) return 0;
  return Math.round(totalWeightedConfidence / totalWeight);
}

function calculateOverallConfidence(scores: CategoryScoreObject[]): number {
  if (scores.length === 0) return 0;

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight <= 0) return 0;

  const weightedConfidence = scores.reduce(
    (sum, s) => sum + s.confidence * s.weight,
    0
  );

  return Math.round(weightedConfidence / totalWeight);
}

function calculateOverallAlignment(scores: CategoryScoreObject[]): number {
  if (scores.length === 0) return 0;

  const nonEmptyScores = scores.filter((s) => s.driverCount > 0);
  if (nonEmptyScores.length === 0) return 0;

  const totalAlignment = nonEmptyScores.reduce(
    (sum, s) => sum + s.alignmentScore * s.weight,
    0
  );

  const totalWeight = nonEmptyScores.reduce(
    (sum, s) => sum + s.weight,
    0
  );

  return totalWeight > 0 ? totalAlignment / totalWeight : 0;
}

function calculateAlignmentScore(contributions: DriverContribution[]): number {
  if (contributions.length === 0) return 0;

  const biasValues = contributions.map((c) => BIAS_NUMERIC_MAP[c.bias] ?? 0);
  const nonZeroBiases = biasValues.filter((v) => v !== 0);

  if (nonZeroBiases.length === 0) return 0;

  const allPositive = nonZeroBiases.every((v) => v > 0);
  const allNegative = nonZeroBiases.every((v) => v < 0);

  if (allPositive || allNegative) return 1.0;

  const positiveCount = nonZeroBiases.filter((v) => v > 0).length;
  const negativeCount = nonZeroBiases.filter((v) => v < 0).length;
  const maxCount = Math.max(positiveCount, negativeCount);

  return maxCount / nonZeroBiases.length;
}

function scoreToAlignmentStrength(score: number): "Strong" | "Moderate" | "Weak" | "None" {
  if (score >= 0.8) return "Strong";
  if (score >= 0.6) return "Moderate";
  if (score >= 0.4) return "Weak";
  return "None";
}

function detectConflict(contributions: DriverContribution[]): boolean {
  const positiveContributions = contributions.filter((c) => c.contribution > 0.1);
  const negativeContributions = contributions.filter((c) => c.contribution < -0.1);
  return positiveContributions.length > 0 && negativeContributions.length > 0;
}

function scoreToBias(score: number): DriverBias | "Neutral" {
  if (score >= 1.5) return "Strong Bullish";
  if (score >= 0.5) return "Bullish";
  if (score <= -1.5) return "Strong Bearish";
  if (score <= -0.5) return "Bearish";
  return "Neutral";
}

function generateEmptyReason(
  categoryDef: CategoryDefinition,
  allAnalyses: DriverAnalysisObject[],
  categoryId: string
): string {
  const totalAnalyses = allAnalyses.length;
  const relevantDrivers = categoryDef.driverIds;

  if (totalAnalyses === 0) {
    return `No driver analyses provided. Cannot score ${categoryDef.title} category.`;
  }

  const matchingAnalyses = allAnalyses.filter(
    (a) => relevantDrivers.includes(a.driverId)
  );

  if (matchingAnalyses.length === 0) {
    return `No analyses match the expected drivers for ${categoryDef.title}. Expected drivers: ${relevantDrivers.join(", ")}.`;
  }

  const disabledDrivers = DRIVER_REGISTRY.filter(
    (d) => relevantDrivers.includes(d.id) && !d.enabled
  );

  if (disabledDrivers.length > 0) {
    return `All drivers for ${categoryDef.title} are disabled: ${disabledDrivers.map((d) => d.title).join(", ")}.`;
  }

  return `No valid driver data available for ${categoryDef.title} scoring.`;
}

function generateCategoryReason(
  bias: DriverBias | "Neutral",
  confidence: number,
  contributions: DriverContribution[],
  alignmentStrength: "Strong" | "Moderate" | "Weak" | "None",
  hasConflict: boolean
): string {
  if (confidence < 30) {
    return `Low confidence analysis. Limited driver data available for scoring.`;
  }

  if (hasConflict) {
    const strongestBullish = contributions
      .filter((c) => c.contribution > 0.1)
      .sort((a, b) => b.contribution - a.contribution)[0];
    const strongestBearish = contributions
      .filter((c) => c.contribution < -0.1)
      .sort((a, b) => a.contribution - b.contribution)[0];

    const parts: string[] = ["Conflicting signals detected."];
    if (strongestBullish) {
      parts.push(`Bullish pressure from ${strongestBullish.driverTitle}`);
    }
    if (strongestBearish) {
      parts.push(`Bearish pressure from ${strongestBearish.driverTitle}`);
    }
    parts.push(`Confidence: ${confidence}%.`);
    return parts.join(" ");
  }

  const dominantDrivers = contributions
    .filter((c) => Math.abs(c.contribution) > 0.3)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 2);

  const dominantNames = dominantDrivers.map((c) => c.driverTitle).join(" and ");

  if (bias === "Neutral") {
    return `Mixed signals across ${contributions.length} drivers. No clear directional bias. Alignment: ${alignmentStrength}.`;
  }

  if (dominantNames) {
    return `${bias} bias driven primarily by ${dominantNames}. Alignment: ${alignmentStrength}. Confidence: ${confidence}%.`;
  }

  return `${bias} bias across ${contributions.length} drivers. Alignment: ${alignmentStrength}. Confidence: ${confidence}%.`;
}

function createEmptyCategoryScore(
  categoryId: string,
  categoryTitle: string
): CategoryScoreObject {
  return {
    categoryId,
    categoryTitle,
    score: 0,
    bias: "Neutral",
    confidence: 0,
    driverCount: 0,
    reason: "Category not found or inactive.",
    drivers: [],
    timestamp: new Date().toISOString(),
    weight: 0,
    weightedScore: 0,
    driverContributions: [],
    alignmentScore: 0,
    alignmentStrength: "None",
    hasConflict: false
  };
}
