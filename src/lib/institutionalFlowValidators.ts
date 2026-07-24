import type {
  InstitutionalFlowInput,
  InstitutionalFlowResult,
  EtfFlowInput,
  CentralBankInput,
  CotPositioningInput,
  OpenInterestInput,
  CrowdPositioningInput,
  PositionRiskInput,
  PositioningData,
  FlowDirection,
  FlowMagnitude,
  PositioningBias,
  CrowdingLevel,
  RiskLevel
} from "@/types/institutionalFlow";

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

const VALID_FLOW_DIRECTIONS: FlowDirection[] = ["Inflow", "Outflow", "Flat", "Unknown"];
const VALID_FLOW_MAGNITUDES: FlowMagnitude[] = ["Heavy", "Moderate", "Light", "None", "Unknown"];
const VALID_POSITIONING_BIASES: PositioningBias[] = ["Net Long", "Net Short", "Flat", "Unknown"];
const VALID_CROWDING_LEVELS: CrowdingLevel[] = ["Extreme", "High", "Moderate", "Low", "Unknown"];
const VALID_RISK_LEVELS: RiskLevel[] = ["Extreme", "High", "Moderate", "Low", "Unknown"];

export function validateInstitutionalFlowInput(input: InstitutionalFlowInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (input.etfFlows) {
    const result = validateEtfFlowInput(input.etfFlows);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  if (input.centralBank) {
    const result = validateCentralBankInput(input.centralBank);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  if (input.cotPositioning) {
    const result = validateCotPositioningInput(input.cotPositioning);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  if (input.openInterest) {
    const result = validateOpenInterestInput(input.openInterest);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  if (input.crowdPositioning) {
    const result = validateCrowdPositioningInput(input.crowdPositioning);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  if (input.positionRisk) {
    const result = validatePositionRiskInput(input.positionRisk);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  const hasAnyData = Boolean(
    input.etfFlows || input.centralBank || input.cotPositioning ||
    input.openInterest || input.crowdPositioning || input.positionRisk
  );

  if (!hasAnyData) {
    warnings.push({
      code: "EMPTY_INPUT",
      message: "No institutional data provided. All fields are empty."
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateEtfFlowInput(etf: EtfFlowInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!VALID_FLOW_DIRECTIONS.includes(etf.direction)) {
    errors.push({
      code: "INVALID_ETF_DIRECTION",
      message: `Invalid ETF flow direction: "${etf.direction}".`,
      field: "etfFlows.direction",
      value: etf.direction
    });
  }

  if (etf.magnitude && !VALID_FLOW_MAGNITUDES.includes(etf.magnitude)) {
    errors.push({
      code: "INVALID_ETF_MAGNITUDE",
      message: `Invalid ETF flow magnitude: "${etf.magnitude}".`,
      field: "etfFlows.magnitude",
      value: etf.magnitude
    });
  }

  if (etf.weeklyChange !== undefined && typeof etf.weeklyChange !== "number") {
    errors.push({
      code: "INVALID_ETF_WEEKLY_CHANGE",
      message: "ETF weekly change must be a number.",
      field: "etfFlows.weeklyChange",
      value: etf.weeklyChange
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateCentralBankInput(cb: CentralBankInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (cb.netPurchases !== undefined && typeof cb.netPurchases !== "number") {
    errors.push({
      code: "INVALID_CB_NET_PURCHASES",
      message: "Central bank net purchases must be a number.",
      field: "centralBank.netPurchases",
      value: cb.netPurchases
    });
  }

  if (cb.buyingVolume && !VALID_FLOW_MAGNITUDES.includes(cb.buyingVolume)) {
    errors.push({
      code: "INVALID_CB_BUYING_VOLUME",
      message: `Invalid central bank buying volume: "${cb.buyingVolume}".`,
      field: "centralBank.buyingVolume",
      value: cb.buyingVolume
    });
  }

  if (cb.sellingVolume && !VALID_FLOW_MAGNITUDES.includes(cb.sellingVolume)) {
    errors.push({
      code: "INVALID_CB_SELLING_VOLUME",
      message: `Invalid central bank selling volume: "${cb.sellingVolume}".`,
      field: "centralBank.sellingVolume",
      value: cb.sellingVolume
    });
  }

  if (cb.trend && !VALID_FLOW_DIRECTIONS.includes(cb.trend)) {
    errors.push({
      code: "INVALID_CB_TREND",
      message: `Invalid central bank trend: "${cb.trend}".`,
      field: "centralBank.trend",
      value: cb.trend
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateCotPositioningInput(cot: CotPositioningInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (cot.commercials) {
    const result = validatePositioningData(cot.commercials, "commercials");
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  if (cot.nonCommercials) {
    const result = validatePositioningData(cot.nonCommercials, "nonCommercials");
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  if (cot.managedMoney) {
    const result = validatePositioningData(cot.managedMoney, "managedMoney");
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateOpenInterestInput(oi: OpenInterestInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (oi.currentLevel !== undefined && typeof oi.currentLevel !== "number") {
    errors.push({
      code: "INVALID_OI_LEVEL",
      message: "Open interest current level must be a number.",
      field: "openInterest.currentLevel",
      value: oi.currentLevel
    });
  }

  if (oi.changeFromPrevious !== undefined && typeof oi.changeFromPrevious !== "number") {
    errors.push({
      code: "INVALID_OI_CHANGE",
      message: "Open interest change from previous must be a number.",
      field: "openInterest.changeFromPrevious",
      value: oi.changeFromPrevious
    });
  }

  if (oi.trend && !VALID_FLOW_DIRECTIONS.includes(oi.trend)) {
    errors.push({
      code: "INVALID_OI_TREND",
      message: `Invalid open interest trend: "${oi.trend}".`,
      field: "openInterest.trend",
      value: oi.trend
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateCrowdPositioningInput(crowd: CrowdPositioningInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (crowd.retailBias && !VALID_POSITIONING_BIASES.includes(crowd.retailBias)) {
    errors.push({
      code: "INVALID_RETAIL_BIAS",
      message: `Invalid retail bias: "${crowd.retailBias}".`,
      field: "crowdPositioning.retailBias",
      value: crowd.retailBias
    });
  }

  if (crowd.institutionalBias && !VALID_POSITIONING_BIASES.includes(crowd.institutionalBias)) {
    errors.push({
      code: "INVALID_INSTITUTIONAL_BIAS",
      message: `Invalid institutional bias: "${crowd.institutionalBias}".`,
      field: "crowdPositioning.institutionalBias",
      value: crowd.institutionalBias
    });
  }

  if (crowd.crowdingLevel && !VALID_CROWDING_LEVELS.includes(crowd.crowdingLevel)) {
    errors.push({
      code: "INVALID_CROWDING_LEVEL",
      message: `Invalid crowding level: "${crowd.crowdingLevel}".`,
      field: "crowdPositioning.crowdingLevel",
      value: crowd.crowdingLevel
    });
  }

  if (crowd.crowdedTradeRisk && !VALID_RISK_LEVELS.includes(crowd.crowdedTradeRisk)) {
    errors.push({
      code: "INVALID_CROWDED_TRADE_RISK",
      message: `Invalid crowded trade risk: "${crowd.crowdedTradeRisk}".`,
      field: "crowdPositioning.crowdedTradeRisk",
      value: crowd.crowdedTradeRisk
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validatePositionRiskInput(risk: PositionRiskInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!VALID_RISK_LEVELS.includes(risk.level)) {
    errors.push({
      code: "INVALID_RISK_LEVEL",
      message: `Invalid position risk level: "${risk.level}".`,
      field: "positionRisk.level",
      value: risk.level
    });
  }

  if (risk.crowdingFactor !== undefined && (typeof risk.crowdingFactor !== "number" || risk.crowdingFactor < 0 || risk.crowdingFactor > 1)) {
    errors.push({
      code: "INVALID_CROWDING_FACTOR",
      message: `Crowding factor must be 0-1, got ${risk.crowdingFactor}.`,
      field: "positionRisk.crowdingFactor",
      value: risk.crowdingFactor
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

function validatePositioningData(data: PositioningData, prefix: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (data.percentLong !== undefined) {
    if (data.percentLong < 0 || data.percentLong > 100) {
      errors.push({
        code: `INVALID_${prefix.toUpperCase()}_PERCENT_LONG`,
        message: `Percent long must be 0-100, got ${data.percentLong}.`,
        field: `${prefix}.percentLong`,
        value: data.percentLong
      });
    }
  }

  if (data.percentShort !== undefined) {
    if (data.percentShort < 0 || data.percentShort > 100) {
      errors.push({
        code: `INVALID_${prefix.toUpperCase()}_PERCENT_SHORT`,
        message: `Percent short must be 0-100, got ${data.percentShort}.`,
        field: `${prefix}.percentShort`,
        value: data.percentShort
      });
    }
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
      field: "institutionalScore",
      value: result.institutionalScore
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

  if (result.dataQuality.score < 20) {
    warnings.push({
      code: "VERY_LOW_DATA_QUALITY",
      message: `Data quality score is ${result.dataQuality.score}%. Results may be unreliable.`
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function hasMinimumDataForInstitutionalFlow(input: InstitutionalFlowInput): boolean {
  return Boolean(
    input.etfFlows || input.centralBank || input.cotPositioning ||
    input.openInterest || input.crowdPositioning || input.positionRisk
  );
}
