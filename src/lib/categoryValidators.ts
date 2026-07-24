import type {
  DriverAnalysisObject,
  CategoryScoreObject,
  DriverContribution,
  DriverBias,
  DriverStrength,
  WeightConfiguration
} from "@/types/goldResearchConfig";
import { BIAS_NUMERIC_MAP, STRENGTH_MULTIPLIER_MAP } from "@/types/goldResearchConfig";
import { CATEGORY_DEFINITIONS } from "@/config/categoryConfig";
import { DRIVER_REGISTRY } from "@/config/driverRegistry";

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: unknown;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  value?: unknown;
}

export function validateDriverAnalysis(analysis: DriverAnalysisObject): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!analysis.driverId) {
    errors.push({ code: "MISSING_DRIVER_ID", message: "Driver ID is required.", field: "driverId" });
  }

  if (!analysis.driverTitle) {
    errors.push({ code: "MISSING_DRIVER_TITLE", message: "Driver title is required.", field: "driverTitle" });
  }

  if (!analysis.categoryId) {
    errors.push({ code: "MISSING_CATEGORY_ID", message: "Category ID is required.", field: "categoryId" });
  } else {
    const categoryDef = CATEGORY_DEFINITIONS.find((c) => c.id === analysis.categoryId);
    if (!categoryDef) {
      errors.push({ code: "INVALID_CATEGORY_ID", message: `Category "${analysis.categoryId}" not found.`, field: "categoryId", value: analysis.categoryId });
    } else {
      const driverInCategory = DRIVER_REGISTRY.find(
        (d) => d.id === analysis.driverId && d.category === analysis.categoryId
      );
      if (!driverInCategory) {
        warnings.push({ code: "DRIVER_NOT_IN_CATEGORY", message: `Driver "${analysis.driverId}" is not registered in category "${analysis.categoryId}".`, field: "categoryId" });
      }
    }
  }

  if (!(analysis.bias in BIAS_NUMERIC_MAP)) {
    errors.push({ code: "INVALID_BIAS", message: `Invalid bias value: "${analysis.bias}".`, field: "bias", value: analysis.bias });
  }

  if (!(analysis.strength in STRENGTH_MULTIPLIER_MAP)) {
    errors.push({ code: "INVALID_STRENGTH", message: `Invalid strength value: "${analysis.strength}".`, field: "strength", value: analysis.strength });
  }

  if (typeof analysis.confidence !== "number" || analysis.confidence < 0 || analysis.confidence > 100) {
    errors.push({ code: "INVALID_CONFIDENCE", message: `Confidence must be 0-100, got ${analysis.confidence}.`, field: "confidence", value: analysis.confidence });
  }

  if (!analysis.reason) {
    warnings.push({ code: "MISSING_REASON", message: "Reason field is empty.", field: "reason" });
  }

  if (!analysis.timestamp) {
    warnings.push({ code: "MISSING_TIMESTAMP", message: "Timestamp field is empty.", field: "timestamp" });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateDriverAnalyses(analyses: DriverAnalysisObject[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  for (let i = 0; i < analyses.length; i++) {
    const result = validateDriverAnalysis(analyses[i]);
    allErrors.push(...result.errors.map((e) => ({
      ...e,
      message: `[Driver ${i}] ${e.message}`
    })));
    allWarnings.push(...result.warnings.map((w) => ({
      ...w,
      message: `[Driver ${i}] ${w.message}`
    })));
  }

  const driverIds = analyses.map((a) => a.driverId);
  const duplicateIds = driverIds.filter((id, index) => driverIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    allWarnings.push({
      code: "DUPLICATE_DRIVERS",
      message: `Duplicate driver IDs detected: ${[...new Set(duplicateIds)].join(", ")}.`
    });
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

export function validateCategoryScore(score: CategoryScoreObject): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!score.categoryId) {
    errors.push({ code: "MISSING_CATEGORY_ID", message: "Category ID is required.", field: "categoryId" });
  }

  if (typeof score.score !== "number" || isNaN(score.score)) {
    errors.push({ code: "INVALID_SCORE", message: `Score must be a number, got ${score.score}.`, field: "score", value: score.score });
  }

  if (Math.abs(score.score) > 10) {
    warnings.push({ code: "EXTREME_SCORE", message: `Score ${score.score} is unusually extreme.`, field: "score", value: score.score });
  }

  if (typeof score.confidence !== "number" || score.confidence < 0 || score.confidence > 100) {
    errors.push({ code: "INVALID_CONFIDENCE", message: `Confidence must be 0-100, got ${score.confidence}.`, field: "confidence", value: score.confidence });
  }

  if (score.driverContributions.length === 0 && score.driverCount > 0) {
    warnings.push({ code: "MISSING_CONTRIBUTIONS", message: "Driver count > 0 but no contributions provided.", field: "driverContributions" });
  }

  if (score.alignmentScore < 0 || score.alignmentScore > 1) {
    errors.push({ code: "INVALID_ALIGNMENT", message: `Alignment score must be 0-1, got ${score.alignmentScore}.`, field: "alignmentScore", value: score.alignmentScore });
  }

  if (!score.timestamp) {
    warnings.push({ code: "MISSING_TIMESTAMP", message: "Timestamp field is empty.", field: "timestamp" });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateCategoryScores(scores: CategoryScoreObject[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  for (const score of scores) {
    const result = validateCategoryScore(score);
    allErrors.push(...result.errors.map((e) => ({
      ...e,
      message: `[Category "${score.categoryId}"] ${e.message}`
    })));
    allWarnings.push(...result.warnings.map((w) => ({
      ...w,
      message: `[Category "${score.categoryId}"] ${w.message}`
    })));
  }

  const categoryIds = scores.map((s) => s.categoryId);
  const duplicateIds = categoryIds.filter((id, index) => categoryIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    allWarnings.push({
      code: "DUPLICATE_CATEGORIES",
      message: `Duplicate category IDs detected: ${[...new Set(duplicateIds)].join(", ")}.`
    });
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

export function validateWeightConfiguration(config: WeightConfiguration): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!config.categoryWeights || config.categoryWeights.length === 0) {
    errors.push({ code: "EMPTY_CATEGORY_WEIGHTS", message: "No category weights defined." });
    return { isValid: false, errors, warnings };
  }

  const totalWeight = config.categoryWeights.reduce(
    (sum, cw) => sum + cw.weight,
    0
  );

  if (Math.abs(totalWeight - 1.0) > 0.01) {
    warnings.push({
      code: "CATEGORY_WEIGHT_SUM",
      message: `Category weights sum to ${totalWeight.toFixed(4)}, expected ~1.0.`
    });
  }

  for (const cw of config.categoryWeights) {
    if (cw.weight < 0) {
      errors.push({
        code: "NEGATIVE_CATEGORY_WEIGHT",
        message: `Category "${cw.categoryId}" has negative weight: ${cw.weight}.`,
        field: cw.categoryId,
        value: cw.weight
      });
    }

    if (cw.driverWeights && cw.driverWeights.length > 0) {
      const driverSum = cw.driverWeights.reduce((sum, dw) => sum + dw.weight, 0);
      if (Math.abs(driverSum - 1.0) > 0.01) {
        warnings.push({
          code: "DRIVER_WEIGHT_SUM",
          message: `Category "${cw.categoryId}" driver weights sum to ${driverSum.toFixed(4)}, expected ~1.0.`
        });
      }

      for (const dw of cw.driverWeights) {
        if (dw.weight < 0) {
          errors.push({
            code: "NEGATIVE_DRIVER_WEIGHT",
            message: `Driver "${dw.driverId}" in category "${cw.categoryId}" has negative weight: ${dw.weight}.`,
            field: dw.driverId,
            value: dw.weight
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateDriverContribution(contribution: DriverContribution): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!contribution.driverId) {
    errors.push({ code: "MISSING_DRIVER_ID", message: "Driver ID is required.", field: "driverId" });
  }

  if (typeof contribution.contribution !== "number" || isNaN(contribution.contribution)) {
    errors.push({ code: "INVALID_CONTRIBUTION", message: `Contribution must be a number, got ${contribution.contribution}.`, field: "contribution" });
  }

  if (contribution.weight < 0) {
    warnings.push({ code: "NEGATIVE_WEIGHT", message: `Driver weight is negative: ${contribution.weight}.`, field: "weight" });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function hasMinimumDataForScoring(analyses: DriverAnalysisObject[], categoryId: string): boolean {
  const relevantAnalyses = analyses.filter(
    (a) => a.categoryId === categoryId
  );

  if (relevantAnalyses.length === 0) return false;

  const validAnalyses = relevantAnalyses.filter(
    (a) => a.bias in BIAS_NUMERIC_MAP && a.strength in STRENGTH_MULTIPLIER_MAP && a.confidence > 0
  );

  return validAnalyses.length > 0;
}

export function getDataQualityScore(analyses: DriverAnalysisObject[], categoryId: string): number {
  const categoryDef = CATEGORY_DEFINITIONS.find((c) => c.id === categoryId);
  if (!categoryDef) return 0;

  const expectedDriverCount = categoryDef.driverIds.length;
  if (expectedDriverCount === 0) return 0;

  const relevantAnalyses = analyses.filter(
    (a) => a.categoryId === categoryId
  );

  const completeness = relevantAnalyses.length / expectedDriverCount;
  const avgConfidence = relevantAnalyses.length > 0
    ? relevantAnalyses.reduce((sum, a) => sum + a.confidence, 0) / relevantAnalyses.length / 100
    : 0;

  return Math.round(completeness * avgConfidence * 100);
}
