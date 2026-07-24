import type {
  GoldResearchServiceRequest,
  ServiceValidationResult,
  ServiceValidationError,
  ServiceValidationWarning
} from "@/types/goldResearchService";
import type { DriverAnalysisObject } from "@/types/goldResearchConfig";
import { CATEGORY_DEFINITIONS } from "@/config/categoryConfig";

const VALID_BIASES = ["Strong Bullish", "Bullish", "Neutral", "Bearish", "Strong Bearish"];
const VALID_STRENGTHS = ["Strong", "Moderate", "Weak", "None"];

export function validateServiceRequest(request: GoldResearchServiceRequest): ServiceValidationResult {
  const errors: ServiceValidationError[] = [];
  const warnings: ServiceValidationWarning[] = [];

  if (!request.driverAnalyses) {
    errors.push({
      code: "MISSING_DRIVER_ANALYSES",
      message: "Driver analyses array is required.",
      field: "driverAnalyses",
      severity: "error"
    });
    return buildResult(false, errors, warnings, 0, [], 0);
  }

  if (!Array.isArray(request.driverAnalyses)) {
    errors.push({
      code: "INVALID_DRIVER_ANALYSES",
      message: "Driver analyses must be an array.",
      field: "driverAnalyses",
      severity: "error"
    });
    return buildResult(false, errors, warnings, 0, [], 0);
  }

  const driverCount = request.driverAnalyses.length;

  if (driverCount === 0) {
    warnings.push({
      code: "EMPTY_DRIVER_ANALYSES",
      message: "No driver analyses provided. Analysis will produce empty results.",
      field: "driverAnalyses"
    });
  }

  const categoryCoverage = validateDriverAnalyses(request.driverAnalyses, errors, warnings);
  const dataQualityScore = calculateDataQualityScore(request, categoryCoverage);

  validateTechnicalInput(request, errors, warnings);
  validateInstitutionalInput(request, errors, warnings);

  if (!request.technicalInput && !request.institutionalInput) {
    warnings.push({
      code: "NO_SECONDARY_INPUTS",
      message: "Only category scores will be used. No technical or institutional data provided."
    });
  }

  return {
    isValid: errors.filter(e => e.severity === "error").length === 0,
    errors,
    warnings,
    driverCount,
    categoryCoverage,
    dataQualityScore
  };
}

function validateDriverAnalyses(
  analyses: DriverAnalysisObject[],
  errors: ServiceValidationError[],
  warnings: ServiceValidationWarning[]
): string[] {
  const coveredCategories = new Set<string>();
  const seenDrivers = new Set<string>();
  let duplicateCount = 0;
  let invalidBiasCount = 0;
  let lowConfidenceCount = 0;

  for (const analysis of analyses) {
    if (!analysis.driverId) {
      errors.push({
        code: "MISSING_DRIVER_ID",
        message: "Driver analysis missing driverId.",
        severity: "error"
      });
      continue;
    }

    if (!analysis.categoryId) {
      errors.push({
        code: "MISSING_CATEGORY_ID",
        message: `Driver "${analysis.driverId}" missing categoryId.`,
        field: `driverAnalyses.${analysis.driverId}.categoryId`,
        severity: "error"
      });
      continue;
    }

    coveredCategories.add(analysis.categoryId);

    const key = `${analysis.driverId}:${analysis.categoryId}`;
    if (seenDrivers.has(key)) {
      duplicateCount++;
    }
    seenDrivers.add(key);

    if (!VALID_BIASES.includes(analysis.bias)) {
      invalidBiasCount++;
    }

    if (analysis.confidence < 20) {
      lowConfidenceCount++;
    }
  }

  if (duplicateCount > 0) {
    warnings.push({
      code: "DUPLICATE_DRIVERS",
      message: `${duplicateCount} duplicate driver(s) detected. Last occurrence will overwrite.`
    });
  }

  if (invalidBiasCount > 0) {
    warnings.push({
      code: "INVALID_BIASES",
      message: `${invalidBiasCount} driver(s) have invalid bias values.`
    });
  }

  if (lowConfidenceCount > 0) {
    warnings.push({
      code: "LOW_CONFIDENCE_DRIVERS",
      message: `${lowConfidenceCount} driver(s) have confidence below 20%.`
    });
  }

  const expectedCategories = CATEGORY_DEFINITIONS
    .filter(c => c.defaultWeight > 0)
    .map(c => c.id);

  const missingCategories = expectedCategories.filter(c => !coveredCategories.has(c));
  if (missingCategories.length > 0 && analyses.length > 0) {
    warnings.push({
      code: "INCOMPLETE_CATEGORY_COVERAGE",
      message: `Missing categories: ${missingCategories.join(", ")}.`
    });
  }

  return Array.from(coveredCategories);
}

function validateTechnicalInput(
  request: GoldResearchServiceRequest,
  errors: ServiceValidationError[],
  warnings: ServiceValidationWarning[]
): void {
  if (!request.technicalInput) return;

  const tech = request.technicalInput;

  if (tech.trend) {
    const validDirections = ["Bullish", "Bearish", "Sideways", "Unknown"];
    if (!validDirections.includes(tech.trend.direction)) {
      errors.push({
        code: "INVALID_TREND_DIRECTION",
        message: `Invalid trend direction: "${tech.trend.direction}".`,
        field: "technicalInput.trend.direction",
        severity: "error"
      });
    }
  }

  if (tech.momentum?.rsi !== undefined) {
    if (tech.momentum.rsi < 0 || tech.momentum.rsi > 100) {
      errors.push({
        code: "INVALID_RSI",
        message: `RSI must be 0-100, got ${tech.momentum.rsi}.`,
        field: "technicalInput.momentum.rsi",
        severity: "error"
      });
    }
  }

  if (tech.currentPrice !== undefined && tech.currentPrice <= 0) {
    errors.push({
      code: "INVALID_PRICE",
      message: `Current price must be positive, got ${tech.currentPrice}.`,
      field: "technicalInput.currentPrice",
      severity: "error"
    });
  }
}

function validateInstitutionalInput(
  request: GoldResearchServiceRequest,
  errors: ServiceValidationError[],
  warnings: ServiceValidationWarning[]
): void {
  if (!request.institutionalInput) return;

  const inst = request.institutionalInput;
  const hasAnyData = Boolean(
    inst.etfFlows || inst.centralBank || inst.cotPositioning ||
    inst.openInterest || inst.crowdPositioning || inst.positionRisk
  );

  if (!hasAnyData) {
    warnings.push({
      code: "EMPTY_INSTITUTIONAL_INPUT",
      message: "Institutional input provided but all fields are empty."
    });
  }

  if (inst.positionRisk) {
    const validLevels = ["Extreme", "High", "Moderate", "Low", "Unknown"];
    if (!validLevels.includes(inst.positionRisk.level)) {
      errors.push({
        code: "INVALID_RISK_LEVEL",
        message: `Invalid position risk level: "${inst.positionRisk.level}".`,
        field: "institutionalInput.positionRisk.level",
        severity: "error"
      });
    }
  }
}

function calculateDataQualityScore(
  request: GoldResearchServiceRequest,
  categoryCoverage: string[]
): number {
  let score = 0;

  const driverScore = Math.min(request.driverAnalyses.length / 9, 1) * 40;
  score += driverScore;

  const categoryScore = (categoryCoverage.length / 5) * 30;
  score += categoryScore;

  if (request.technicalInput) score += 15;
  if (request.institutionalInput) score += 15;

  return Math.round(Math.min(100, score));
}

function buildResult(
  isValid: boolean,
  errors: ServiceValidationError[],
  warnings: ServiceValidationWarning[],
  driverCount: number,
  categoryCoverage: string[],
  dataQualityScore: number
): ServiceValidationResult {
  return {
    isValid,
    errors,
    warnings,
    driverCount,
    categoryCoverage,
    dataQualityScore
  };
}
