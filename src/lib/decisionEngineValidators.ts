import type {
  DecisionEngineInput,
  DecisionEngineResult,
  DecisionAction,
  RiskRating,
  DecisionQuality
} from "@/types/decisionEngine";
import type { CategoryScoreBatchResult } from "@/lib/categoryScoreEngine";
import type { TechnicalBiasResult } from "@/types/technicalBias";
import type { InstitutionalFlowResult } from "@/types/institutionalFlow";

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

const VALID_DECISION_ACTIONS: DecisionAction[] = ["Strong Buy", "Buy", "Wait", "Sell", "Strong Sell"];
const VALID_RISK_RATINGS: RiskRating[] = ["Low", "Medium", "High", "Extreme"];
const VALID_DECISION_QUALITIES: DecisionQuality[] = ["High", "Medium", "Low"];

export function validateDecisionEngineInput(input: DecisionEngineInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!input.categoryScores) {
    errors.push({
      code: "MISSING_CATEGORY_SCORES",
      message: "Category scores result is required.",
      field: "categoryScores"
    });
  } else {
    const result = validateCategoryScoreBatchResult(input.categoryScores);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  if (!input.technicalBias) {
    errors.push({
      code: "MISSING_TECHNICAL_BIAS",
      message: "Technical bias result is required.",
      field: "technicalBias"
    });
  } else {
    const result = validateTechnicalBiasResult(input.technicalBias);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  if (!input.institutionalFlow) {
    errors.push({
      code: "MISSING_INSTITUTIONAL_FLOW",
      message: "Institutional flow result is required.",
      field: "institutionalFlow"
    });
  } else {
    const result = validateInstitutionalFlowResult(input.institutionalFlow);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  if (input.driverConfidence !== undefined) {
    if (typeof input.driverConfidence !== "number" || input.driverConfidence < 0 || input.driverConfidence > 100) {
      errors.push({
        code: "INVALID_DRIVER_CONFIDENCE",
        message: `Driver confidence must be 0-100, got ${input.driverConfidence}.`,
        field: "driverConfidence",
        value: input.driverConfidence
      });
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateCategoryScoreBatchResult(result: CategoryScoreBatchResult): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (typeof result.totalScore !== "number" || result.totalScore < 0 || result.totalScore > 100) {
    errors.push({
      code: "INVALID_TOTAL_SCORE",
      message: `Total score must be 0-100, got ${result.totalScore}.`,
      field: "categoryScores.totalScore",
      value: result.totalScore
    });
  }

  if (typeof result.overallConfidence !== "number" || result.overallConfidence < 0 || result.overallConfidence > 100) {
    errors.push({
      code: "INVALID_CATEGORY_CONFIDENCE",
      message: `Category confidence must be 0-100, got ${result.overallConfidence}.`,
      field: "categoryScores.overallConfidence",
      value: result.overallConfidence
    });
  }

  if (!result.scores || result.scores.length === 0) {
    warnings.push({
      code: "EMPTY_CATEGORY_SCORES",
      message: "No category scores provided."
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateTechnicalBiasResult(result: TechnicalBiasResult): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (typeof result.technicalScore !== "number" || result.technicalScore < 0 || result.technicalScore > 100) {
    errors.push({
      code: "INVALID_TECHNICAL_SCORE",
      message: `Technical score must be 0-100, got ${result.technicalScore}.`,
      field: "technicalBias.technicalScore",
      value: result.technicalScore
    });
  }

  if (typeof result.confidence !== "number" || result.confidence < 0 || result.confidence > 100) {
    errors.push({
      code: "INVALID_TECHNICAL_CONFIDENCE",
      message: `Technical confidence must be 0-100, got ${result.confidence}.`,
      field: "technicalBias.confidence",
      value: result.confidence
    });
  }

  const validBiases = ["Strong Bullish", "Bullish", "Neutral", "Bearish", "Strong Bearish"];
  if (!validBiases.includes(result.technicalBias)) {
    errors.push({
      code: "INVALID_TECHNICAL_BIAS",
      message: `Invalid technical bias: "${result.technicalBias}".`,
      field: "technicalBias.technicalBias",
      value: result.technicalBias
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateInstitutionalFlowResult(result: InstitutionalFlowResult): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (typeof result.institutionalScore !== "number" || result.institutionalScore < 0 || result.institutionalScore > 100) {
    errors.push({
      code: "INVALID_INSTITUTIONAL_SCORE",
      message: `Institutional score must be 0-100, got ${result.institutionalScore}.`,
      field: "institutionalFlow.institutionalScore",
      value: result.institutionalScore
    });
  }

  if (typeof result.confidence !== "number" || result.confidence < 0 || result.confidence > 100) {
    errors.push({
      code: "INVALID_INSTITUTIONAL_CONFIDENCE",
      message: `Institutional confidence must be 0-100, got ${result.confidence}.`,
      field: "institutionalFlow.confidence",
      value: result.confidence
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateDecisionEngineResult(result: DecisionEngineResult): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (typeof result.overallGoldScore !== "number" || result.overallGoldScore < 0 || result.overallGoldScore > 100) {
    errors.push({
      code: "INVALID_GOLD_SCORE",
      message: `Gold score must be 0-100, got ${result.overallGoldScore}.`,
      field: "overallGoldScore",
      value: result.overallGoldScore
    });
  }

  if (typeof result.overallConfidence !== "number" || result.overallConfidence < 0 || result.overallConfidence > 100) {
    errors.push({
      code: "INVALID_CONFIDENCE",
      message: `Confidence must be 0-100, got ${result.overallConfidence}.`,
      field: "overallConfidence",
      value: result.overallConfidence
    });
  }

  if (!VALID_DECISION_ACTIONS.includes(result.decision)) {
    errors.push({
      code: "INVALID_DECISION",
      message: `Invalid decision: "${result.decision}".`,
      field: "decision",
      value: result.decision
    });
  }

  if (!VALID_RISK_RATINGS.includes(result.riskRating)) {
    errors.push({
      code: "INVALID_RISK_RATING",
      message: `Invalid risk rating: "${result.riskRating}".`,
      field: "riskRating",
      value: result.riskRating
    });
  }

  if (!VALID_DECISION_QUALITIES.includes(result.decisionQuality)) {
    errors.push({
      code: "INVALID_DECISION_QUALITY",
      message: `Invalid decision quality: "${result.decisionQuality}".`,
      field: "decisionQuality",
      value: result.decisionQuality
    });
  }

  if (typeof result.alignmentScore !== "number" || result.alignmentScore < 0 || result.alignmentScore > 100) {
    errors.push({
      code: "INVALID_ALIGNMENT_SCORE",
      message: `Alignment score must be 0-100, got ${result.alignmentScore}.`,
      field: "alignmentScore",
      value: result.alignmentScore
    });
  }

  if (typeof result.conflictScore !== "number" || result.conflictScore < 0 || result.conflictScore > 100) {
    errors.push({
      code: "INVALID_CONFLICT_SCORE",
      message: `Conflict score must be 0-100, got ${result.conflictScore}.`,
      field: "conflictScore",
      value: result.conflictScore
    });
  }

  if (!result.summary) {
    warnings.push({
      code: "MISSING_SUMMARY",
      message: "Summary is empty."
    });
  }

  if (!result.institutionalExplanation) {
    warnings.push({
      code: "MISSING_EXPLANATION",
      message: "Institutional explanation is empty."
    });
  }

  if (!result.schemaVersion) {
    warnings.push({
      code: "MISSING_SCHEMA_VERSION",
      message: "Schema version is missing."
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function hasMinimumDataForDecision(input: DecisionEngineInput): boolean {
  const sourcesAvailable = [
    Boolean(input.categoryScores),
    Boolean(input.technicalBias),
    Boolean(input.institutionalFlow)
  ].filter(Boolean).length;

  return sourcesAvailable >= 1;
}
