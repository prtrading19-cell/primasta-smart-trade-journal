import type {
  GoldResearchAnalysisInput,
  GoldResearchAnalysis,
  PipelineDiagnostics
} from "@/types/goldResearchAnalysis";
import type { TechnicalInput } from "@/types/technicalBias";
import type { InstitutionalFlowInput } from "@/types/institutionalFlow";

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
}

export function validateGoldResearchAnalysisInput(input: GoldResearchAnalysisInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!input.driverAnalyses) {
    errors.push({
      code: "MISSING_DRIVER_ANALYSES",
      message: "Driver analyses array is required.",
      field: "driverAnalyses"
    });
  } else if (!Array.isArray(input.driverAnalyses)) {
    errors.push({
      code: "INVALID_DRIVER_ANALYSES",
      message: "Driver analyses must be an array.",
      field: "driverAnalyses",
      value: typeof input.driverAnalyses
    });
  } else if (input.driverAnalyses.length === 0) {
    warnings.push({
      code: "EMPTY_DRIVER_ANALYSES",
      message: "Driver analyses array is empty. Category scoring will produce empty results.",
      field: "driverAnalyses"
    });
  }

  if (input.technicalInput) {
    const result = validateTechnicalInput(input.technicalInput);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  if (input.institutionalInput) {
    const result = validateInstitutionalInput(input.institutionalInput);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  if (!input.technicalInput && !input.institutionalInput) {
    warnings.push({
      code: "NO_SECONDARY_INPUTS",
      message: "Neither technical nor institutional input provided. Only category scores will be used."
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateTechnicalInput(input: TechnicalInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (input.trend) {
    const validDirections = ["Bullish", "Bearish", "Sideways", "Unknown"];
    if (!validDirections.includes(input.trend.direction)) {
      errors.push({
        code: "INVALID_TREND_DIRECTION",
        message: `Invalid trend direction: "${input.trend.direction}".`,
        field: "technicalInput.trend.direction",
        value: input.trend.direction
      });
    }
  }

  if (input.momentum?.rsi !== undefined) {
    if (input.momentum.rsi < 0 || input.momentum.rsi > 100) {
      errors.push({
        code: "INVALID_RSI",
        message: `RSI must be 0-100, got ${input.momentum.rsi}.`,
        field: "technicalInput.momentum.rsi",
        value: input.momentum.rsi
      });
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateInstitutionalInput(input: InstitutionalFlowInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const hasAnyData = Boolean(
    input.etfFlows || input.centralBank || input.cotPositioning ||
    input.openInterest || input.crowdPositioning || input.positionRisk
  );

  if (!hasAnyData) {
    warnings.push({
      code: "EMPTY_INSTITUTIONAL_INPUT",
      message: "Institutional input provided but all fields are empty."
    });
  }

  if (input.positionRisk) {
    const validLevels = ["Extreme", "High", "Moderate", "Low", "Unknown"];
    if (!validLevels.includes(input.positionRisk.level)) {
      errors.push({
        code: "INVALID_RISK_LEVEL",
        message: `Invalid position risk level: "${input.positionRisk.level}".`,
        field: "institutionalInput.positionRisk.level",
        value: input.positionRisk.level
      });
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateGoldResearchAnalysis(analysis: GoldResearchAnalysis): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!analysis.rawInputs) {
    errors.push({
      code: "MISSING_RAW_INPUTS",
      message: "Raw inputs are missing from analysis."
    });
  }

  if (!analysis.categoryScores) {
    errors.push({
      code: "MISSING_CATEGORY_SCORES",
      message: "Category scores are missing from analysis."
    });
  }

  if (!analysis.technicalBias) {
    warnings.push({
      code: "MISSING_TECHNICAL_BIAS",
      message: "Technical bias is missing from analysis."
    });
  }

  if (!analysis.institutionalFlow) {
    warnings.push({
      code: "MISSING_INSTITUTIONAL_FLOW",
      message: "Institutional flow is missing from analysis."
    });
  }

  if (!analysis.decision) {
    warnings.push({
      code: "MISSING_DECISION",
      message: "Decision engine result is missing from analysis."
    });
  }

  if (!analysis.diagnostics) {
    warnings.push({
      code: "MISSING_DIAGNOSTICS",
      message: "Diagnostics are missing from analysis."
    });
  }

  if (!analysis.schemaVersion) {
    warnings.push({
      code: "MISSING_SCHEMA_VERSION",
      message: "Schema version is missing from analysis."
    });
  }

  if (analysis.executionTimeMs < 0) {
    errors.push({
      code: "INVALID_EXECUTION_TIME",
      message: `Execution time cannot be negative: ${analysis.executionTimeMs}.`,
      field: "executionTimeMs",
      value: analysis.executionTimeMs
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateDiagnostics(diagnostics: PipelineDiagnostics): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!diagnostics.stageTimings) {
    errors.push({
      code: "MISSING_STAGE_TIMINGS",
      message: "Stage timings are missing from diagnostics."
    });
  }

  if (!diagnostics.engines || diagnostics.engines.length === 0) {
    warnings.push({
      code: "NO_ENGINE_DIAGNOSTICS",
      message: "No engine diagnostics recorded."
    });
  }

  const validStatuses = ["success", "partial", "failed"];
  if (!validStatuses.includes(diagnostics.overallStatus)) {
    errors.push({
      code: "INVALID_PIPELINE_STATUS",
      message: `Invalid pipeline status: "${diagnostics.overallStatus}".`,
      field: "overallStatus",
      value: diagnostics.overallStatus
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}
