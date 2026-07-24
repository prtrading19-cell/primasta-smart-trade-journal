import type {
  TechnicalInput,
  TechnicalBiasResult,
  TrendInput,
  MomentumInput,
  MovingAverageInput,
  StructureInput,
  BreakoutInput,
  VolatilityInput,
  SetupInput,
  TrendDirection,
  TrendStrength,
  MarketStructure,
  SetupType,
  VolatilityLevel,
  BreakoutStatus,
  Timeframe
} from "@/types/technicalBias";

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

const VALID_TREND_DIRECTIONS: TrendDirection[] = ["Bullish", "Bearish", "Sideways", "Unknown"];
const VALID_TREND_STRENGTHS: TrendStrength[] = ["Strong", "Moderate", "Weak", "None"];
const VALID_MARKET_STRUCTURES: MarketStructure[] = ["Bullish BOS", "Bearish BOS", "Bullish MSS", "Bearish MSS", "Ranging", "Unknown"];
const VALID_SETUP_TYPES: SetupType[] = ["Liquidity Sweep", "BOS", "MSS", "FVG", "OB", "Retest", "None", "Unknown"];
const VALID_VOLATILITY_LEVELS: VolatilityLevel[] = ["High", "Moderate", "Low", "Unknown"];
const VALID_BREAKOUT_STATUSES: BreakoutStatus[] = ["Breakout", "Breakdown", "None", "Pending", "Unknown"];
const VALID_TIMEFRAMES: Timeframe[] = ["M1", "M5", "M15", "H1", "H4", "D1", "W1"];

export function validateTechnicalInput(input: TechnicalInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (input.timeframe && !VALID_TIMEFRAMES.includes(input.timeframe)) {
    errors.push({
      code: "INVALID_TIMEFRAME",
      message: `Invalid timeframe: "${input.timeframe}".`,
      field: "timeframe",
      value: input.timeframe
    });
  }

  if (input.currentPrice !== undefined && (typeof input.currentPrice !== "number" || input.currentPrice <= 0)) {
    errors.push({
      code: "INVALID_CURRENT_PRICE",
      message: `Current price must be a positive number, got ${input.currentPrice}.`,
      field: "currentPrice",
      value: input.currentPrice
    });
  }

  if (input.trend) {
    const trendResult = validateTrendInput(input.trend);
    errors.push(...trendResult.errors);
    warnings.push(...trendResult.warnings);
  }

  if (input.momentum) {
    const momentumResult = validateMomentumInput(input.momentum);
    errors.push(...momentumResult.errors);
    warnings.push(...momentumResult.warnings);
  }

  if (input.movingAverages) {
    const maResult = validateMovingAverageInput(input.movingAverages, input.currentPrice);
    errors.push(...maResult.errors);
    warnings.push(...maResult.warnings);
  }

  if (input.structure) {
    const structureResult = validateStructureInput(input.structure);
    errors.push(...structureResult.errors);
    warnings.push(...structureResult.warnings);
  }

  if (input.breakout) {
    const breakoutResult = validateBreakoutInput(input.breakout);
    errors.push(...breakoutResult.errors);
    warnings.push(...breakoutResult.warnings);
  }

  if (input.volatility) {
    const volatilityResult = validateVolatilityInput(input.volatility);
    errors.push(...volatilityResult.errors);
    warnings.push(...volatilityResult.warnings);
  }

  if (input.setup) {
    const setupResult = validateSetupInput(input.setup);
    errors.push(...setupResult.errors);
    warnings.push(...setupResult.warnings);
  }

  const hasAnyData = Boolean(
    input.trend || input.momentum || input.structure || input.movingAverages || input.breakout || input.volatility || input.setup
  );

  if (!hasAnyData) {
    warnings.push({
      code: "EMPTY_INPUT",
      message: "No technical data provided. All fields are empty."
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateTrendInput(trend: TrendInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!VALID_TREND_DIRECTIONS.includes(trend.direction)) {
    errors.push({
      code: "INVALID_TREND_DIRECTION",
      message: `Invalid trend direction: "${trend.direction}".`,
      field: "trend.direction",
      value: trend.direction
    });
  }

  if (!VALID_TREND_STRENGTHS.includes(trend.strength)) {
    errors.push({
      code: "INVALID_TREND_STRENGTH",
      message: `Invalid trend strength: "${trend.strength}".`,
      field: "trend.strength",
      value: trend.strength
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateMomentumInput(momentum: MomentumInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (momentum.rsi !== undefined) {
    if (typeof momentum.rsi !== "number" || momentum.rsi < 0 || momentum.rsi > 100) {
      errors.push({
        code: "INVALID_RSI",
        message: `RSI must be 0-100, got ${momentum.rsi}.`,
        field: "momentum.rsi",
        value: momentum.rsi
      });
    }
  }

  if (momentum.stochastics) {
    warnings.push({
      code: "STOCHASTICS_STRING",
      message: "Stochastics is a string field — validation is limited."
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateMovingAverageInput(
  ma: MovingAverageInput,
  currentPrice?: number
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const fields = [
    { name: "sma20", value: ma.sma20 },
    { name: "sma50", value: ma.sma50 },
    { name: "sma200", value: ma.sma200 },
    { name: "ema9", value: ma.ema9 },
    { name: "ema21", value: ma.ema21 },
    { name: "ema50", value: ma.ema50 }
  ];

  for (const field of fields) {
    if (field.value !== undefined && typeof field.value !== "number") {
      errors.push({
        code: "INVALID_MA_VALUE",
        message: `${field.name} must be a number.`,
        field: `movingAverages.${field.name}`,
        value: field.value
      });
    }
  }

  if (ma.alignment && !["Bullish", "Bearish", "Mixed", "Unknown"].includes(ma.alignment)) {
    errors.push({
      code: "INVALID_MA_ALIGNMENT",
      message: `Invalid MA alignment: "${ma.alignment}".`,
      field: "movingAverages.alignment",
      value: ma.alignment
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateStructureInput(structure: StructureInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (structure.marketStructure && !VALID_MARKET_STRUCTURES.includes(structure.marketStructure)) {
    errors.push({
      code: "INVALID_MARKET_STRUCTURE",
      message: `Invalid market structure: "${structure.marketStructure}".`,
      field: "structure.marketStructure",
      value: structure.marketStructure
    });
  }

  if (structure.higherTimeframeStructure && !VALID_TREND_DIRECTIONS.includes(structure.higherTimeframeStructure)) {
    errors.push({
      code: "INVALID_HTF_STRUCTURE",
      message: `Invalid higher timeframe structure: "${structure.higherTimeframeStructure}".`,
      field: "structure.higherTimeframeStructure",
      value: structure.higherTimeframeStructure
    });
  }

  if (structure.liquiditySweep && !["Yes", "No", "Pending", "Unknown"].includes(structure.liquiditySweep)) {
    errors.push({
      code: "INVALID_LIQUIDITY_SWEEP",
      message: `Invalid liquidity sweep: "${structure.liquiditySweep}".`,
      field: "structure.liquiditySweep",
      value: structure.liquiditySweep
    });
  }

  if (structure.supportLevels && !Array.isArray(structure.supportLevels)) {
    errors.push({
      code: "INVALID_SUPPORT_LEVELS",
      message: "Support levels must be an array.",
      field: "structure.supportLevels"
    });
  }

  if (structure.resistanceLevels && !Array.isArray(structure.resistanceLevels)) {
    errors.push({
      code: "INVALID_RESISTANCE_LEVELS",
      message: "Resistance levels must be an array.",
      field: "structure.resistanceLevels"
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateBreakoutInput(breakout: BreakoutInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!VALID_BREAKOUT_STATUSES.includes(breakout.status)) {
    errors.push({
      code: "INVALID_BREAKOUT_STATUS",
      message: `Invalid breakout status: "${breakout.status}".`,
      field: "breakout.status",
      value: breakout.status
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateVolatilityInput(volatility: VolatilityInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!VALID_VOLATILITY_LEVELS.includes(volatility.level)) {
    errors.push({
      code: "INVALID_VOLATILITY_LEVEL",
      message: `Invalid volatility level: "${volatility.level}".`,
      field: "volatility.level",
      value: volatility.level
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateSetupInput(setup: SetupInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (typeof setup.present !== "boolean") {
    errors.push({
      code: "INVALID_SETUP_PRESENT",
      message: `Setup present must be boolean, got ${typeof setup.present}.`,
      field: "setup.present",
      value: setup.present
    });
  }

  if (setup.type && !VALID_SETUP_TYPES.includes(setup.type)) {
    errors.push({
      code: "INVALID_SETUP_TYPE",
      message: `Invalid setup type: "${setup.type}".`,
      field: "setup.type",
      value: setup.type
    });
  }

  if (setup.grade && !["A+", "A", "B", "C", "None"].includes(setup.grade)) {
    errors.push({
      code: "INVALID_SETUP_GRADE",
      message: `Invalid setup grade: "${setup.grade}".`,
      field: "setup.grade",
      value: setup.grade
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
      field: "technicalScore",
      value: result.technicalScore
    });
  }

  if (typeof result.confidence !== "number" || result.confidence < 0 || result.confidence > 100) {
    errors.push({
      code: "INVALID_CONFIDENCE",
      message: `Confidence must be 0-100, got ${result.confidence}.`,
      field: "confidence",
      value: result.confidence
    });
  }

  if (!result.timestamp) {
    warnings.push({
      code: "MISSING_TIMESTAMP",
      message: "Timestamp is empty."
    });
  }

  if (result.dataQuality.score < 30) {
    warnings.push({
      code: "LOW_DATA_QUALITY",
      message: `Data quality score is ${result.dataQuality.score}%. Consider providing more inputs.`
    });
  }

  if (!result.summary) {
    warnings.push({
      code: "MISSING_SUMMARY",
      message: "Summary is empty."
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function hasMinimumDataForTechnicalBias(input: TechnicalInput): boolean {
  return Boolean(
    input.trend ||
    input.momentum ||
    input.structure ||
    input.movingAverages
  );
}
