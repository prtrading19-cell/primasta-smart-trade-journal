import type {
  InstitutionalFlowInput,
  InstitutionalFlowResult,
  InstitutionalFactor,
  InstitutionalDataQuality,
  ConcentrationRisk,
  EtfFlowInput,
  CentralBankInput,
  CotPositioningInput,
  OpenInterestInput,
  CrowdPositioningInput,
  PositionRiskInput,
  FlowDirection,
  FlowMagnitude,
  PositioningBias,
  CrowdingLevel,
  RiskLevel,
  PositioningData,
  DataFreshness
} from "@/types/institutionalFlow";
import {
  FLOW_DIRECTION_NUMERIC,
  FLOW_MAGNITUDE_MULTIPLIER,
  POSITIONING_BIAS_NUMERIC,
  CROWDING_RISK_NUMERIC,
  RISK_LEVEL_NUMERIC
} from "@/types/institutionalFlow";

export interface InstitutionalFlowConfig {
  etfFlowWeight: number;
  centralBankWeight: number;
  cotWeight: number;
  openInterestWeight: number;
  crowdPositioningWeight: number;
  positionRiskWeight: number;
}

const DEFAULT_CONFIG: InstitutionalFlowConfig = {
  etfFlowWeight: 0.20,
  centralBankWeight: 0.20,
  cotWeight: 0.20,
  openInterestWeight: 0.10,
  crowdPositioningWeight: 0.15,
  positionRiskWeight: 0.15
};

export function calculateInstitutionalFlow(
  input: InstitutionalFlowInput,
  config?: InstitutionalFlowConfig
): InstitutionalFlowResult {
  const effectiveConfig = config ?? DEFAULT_CONFIG;
  const timestamp = input.timestamp ?? new Date().toISOString();

  const factors: InstitutionalFactor[] = [];

  factors.push(...analyzeEtfFlows(input.etfFlows, effectiveConfig.etfFlowWeight));
  factors.push(...analyzeCentralBank(input.centralBank, effectiveConfig.centralBankWeight));
  factors.push(...analyzeCotPositioning(input.cotPositioning, effectiveConfig.cotWeight));
  factors.push(...analyzeOpenInterest(input.openInterest, effectiveConfig.openInterestWeight));
  factors.push(...analyzeCrowdPositioning(input.crowdPositioning, effectiveConfig.crowdPositioningWeight));
  factors.push(...analyzePositionRisk(input.positionRisk, effectiveConfig.positionRiskWeight));

  const totalWeightedScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);

  const institutionalScore = totalWeight > 0
    ? Math.round(((totalWeightedScore / totalWeight) + 2) / 4 * 100)
    : 50;

  const clampedScore = Math.max(0, Math.min(100, institutionalScore));
  const institutionalBias = scoreToBias(clampedScore);
  const strength = deriveStrength(clampedScore, factors);
  const confidence = calculateConfidence(factors, input);
  const dataQuality = assessDataQuality(input);
  const concentrationRisks = detectConcentrationRisks(input, factors);

  const supportingFactors = factors
    .filter((f) => f.contribution > 0.05)
    .sort((a, b) => b.contribution - a.contribution)
    .map((f) => `${f.name}: ${f.reason}`);

  const conflictingFactors = factors
    .filter((f) => f.contribution < -0.05)
    .sort((a, b) => a.contribution - b.contribution)
    .map((f) => `${f.name}: ${f.reason}`);

  const summary = generateSummary(
    institutionalBias,
    strength,
    confidence,
    supportingFactors,
    conflictingFactors,
    concentrationRisks,
    dataQuality
  );

  return {
    institutionalBias,
    institutionalScore: clampedScore,
    confidence,
    strength,
    supportingFactors,
    conflictingFactors,
    concentrationRisks,
    summary,
    timestamp,
    dataQuality,
    factors
  };
}

export function analyzeEtfFlows(
  etf: EtfFlowInput | undefined,
  weight: number
): InstitutionalFactor[] {
  if (!etf || etf.direction === "Unknown") {
    return [{
      name: "ETF Flows",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No ETF flow data provided."
    }];
  }

  const directionValue = FLOW_DIRECTION_NUMERIC[etf.direction];
  const magnitudeMultiplier = etf.magnitude
    ? FLOW_MAGNITUDE_MULTIPLIER[etf.magnitude]
    : 0.5;
  const contribution = directionValue * magnitudeMultiplier * weight;

  const direction = directionValue > 0 ? "Bullish" : directionValue < 0 ? "Bearish" : "Neutral";
  const strength = magnitudeMultiplier >= 0.75 ? "Strong" : magnitudeMultiplier >= 0.5 ? "Moderate" : "Weak";

  const reasonParts = [
    `ETF flows are ${etf.direction.toLowerCase()}${etf.magnitude ? ` (${etf.magnitude.toLowerCase()} volume)` : ""}.`,
    etf.period ? `Period: ${etf.period}.` : ""
  ].filter(Boolean).join(" ");

  return [{
    name: "ETF Flows",
    direction: direction as "Bullish" | "Bearish",
    strength,
    weight,
    contribution,
    reason: reasonParts
  }];
}

export function analyzeCentralBank(
  cb: CentralBankInput | undefined,
  weight: number
): InstitutionalFactor[] {
  const factors: InstitutionalFactor[] = [];

  if (!cb) {
    return [{
      name: "Central Bank Demand",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No central bank data provided."
    }];
  }

  if (cb.netPurchases !== undefined) {
    const direction: "Bullish" | "Bearish" | "Neutral" = cb.netPurchases > 0 ? "Bullish" : cb.netPurchases < 0 ? "Bearish" : "Neutral";
    const magnitude = Math.min(Math.abs(cb.netPurchases) / 100, 1.0);
    const contribution = (cb.netPurchases > 0 ? 1 : cb.netPurchases < 0 ? -1 : 0) * magnitude * weight;

    factors.push({
      name: "Central Bank Net Purchases",
      direction,
      strength: magnitude > 0.6 ? "Strong" : magnitude > 0.3 ? "Moderate" : "Weak",
      weight: weight * 0.6,
      contribution,
      reason: `Central bank net purchases: ${cb.netPurchases > 0 ? "+" : ""}${cb.netPurchases} tonnes.`
    });
  }

  if (cb.buyingVolume && cb.buyingVolume !== "Unknown") {
    const magnitude = FLOW_MAGNITUDE_MULTIPLIER[cb.buyingVolume];
    factors.push({
      name: "Central Bank Buying Volume",
      direction: "Bullish",
      strength: magnitude > 0.6 ? "Strong" : "Moderate",
      weight: weight * 0.2,
      contribution: magnitude * weight * 0.2,
      reason: `Central bank buying volume: ${cb.buyingVolume.toLowerCase()}.`
    });
  }

  if (cb.trend && cb.trend !== "Unknown") {
    const direction = cb.trend === "Inflow" ? "Bullish" : cb.trend === "Outflow" ? "Bearish" : "Neutral";
    factors.push({
      name: "Central Bank Trend",
      direction: direction as "Bullish" | "Bearish" | "Neutral",
      strength: "Moderate",
      weight: weight * 0.2,
      contribution: (cb.trend === "Inflow" ? 1 : cb.trend === "Outflow" ? -1 : 0) * weight * 0.2,
      reason: `Central bank demand trend is ${cb.trend.toLowerCase()}.`
    });
  }

  if (factors.length === 0) {
    return [{
      name: "Central Bank Demand",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No actionable central bank data provided."
    }];
  }

  return factors;
}

export function analyzeCotPositioning(
  cot: CotPositioningInput | undefined,
  weight: number
): InstitutionalFactor[] {
  const factors: InstitutionalFactor[] = [];

  if (!cot) {
    return [{
      name: "COT Positioning",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No COT positioning data provided."
    }];
  }

  if (cot.commercials) {
    const result = analyzePositioningGroup(cot.commercials, "Commercials", weight * 0.33);
    factors.push(result);
  }

  if (cot.nonCommercials) {
    const result = analyzePositioningGroup(cot.nonCommercials, "Non-Commercials", weight * 0.33);
    factors.push(result);
  }

  if (cot.managedMoney) {
    const result = analyzePositioningGroup(cot.managedMoney, "Managed Money", weight * 0.34);
    factors.push(result);
  }

  if (factors.length === 0) {
    return [{
      name: "COT Positioning",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No actionable COT positioning data provided."
    }];
  }

  return factors;
}

export function analyzeOpenInterest(
  oi: OpenInterestInput | undefined,
  weight: number
): InstitutionalFactor[] {
  if (!oi) {
    return [{
      name: "Open Interest",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No open interest data provided."
    }];
  }

  const factors: InstitutionalFactor[] = [];

  if (oi.trend && oi.trend !== "Unknown") {
    const direction = oi.trend === "Inflow" ? "Bullish" : oi.trend === "Outflow" ? "Bearish" : "Neutral";
    factors.push({
      name: "Open Interest Trend",
      direction: direction as "Bullish" | "Bearish" | "Neutral",
      strength: "Moderate",
      weight: weight * 0.5,
      contribution: (oi.trend === "Inflow" ? 1 : oi.trend === "Outflow" ? -1 : 0) * weight * 0.5,
      reason: `Open interest trend is ${oi.trend.toLowerCase()}.`
    });
  }

  if (oi.highLevel) {
    factors.push({
      name: "Open Interest Level",
      direction: "Bearish",
      strength: "Moderate",
      weight: weight * 0.25,
      contribution: -weight * 0.25,
      reason: "Open interest at elevated levels — potential crowded trade risk."
    });
  } else if (oi.lowLevel) {
    factors.push({
      name: "Open Interest Level",
      direction: "Neutral",
      strength: "Weak",
      weight: weight * 0.25,
      contribution: 0,
      reason: "Open interest at low levels — limited positioning signal."
    });
  }

  if (oi.changeFromPrevious !== undefined) {
    const changeDirection = oi.changeFromPrevious > 0 ? "Bullish" : oi.changeFromPrevious < 0 ? "Bearish" : "Neutral";
    factors.push({
      name: "Open Interest Change",
      direction: changeDirection as "Bullish" | "Bearish" | "Neutral",
      strength: Math.abs(oi.changeFromPrevious) > 10000 ? "Strong" : "Moderate",
      weight: weight * 0.25,
      contribution: (oi.changeFromPrevious > 0 ? 1 : oi.changeFromPrevious < 0 ? -1 : 0) * weight * 0.25,
      reason: `Open interest ${oi.changeFromPrevious > 0 ? "increased" : "decreased"} by ${Math.abs(oi.changeFromPrevious).toLocaleString()} contracts.`
    });
  }

  if (factors.length === 0) {
    return [{
      name: "Open Interest",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No actionable open interest data provided."
    }];
  }

  return factors;
}

export function analyzeCrowdPositioning(
  crowd: CrowdPositioningInput | undefined,
  weight: number
): InstitutionalFactor[] {
  if (!crowd) {
    return [{
      name: "Crowd Positioning",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No crowd positioning data provided."
    }];
  }

  const factors: InstitutionalFactor[] = [];

  if (crowd.retailBias && crowd.retailBias !== "Unknown") {
    const direction = crowd.retailBias === "Net Long" ? "Bearish" : crowd.retailBias === "Net Short" ? "Bullish" : "Neutral";
    factors.push({
      name: "Retail Positioning",
      direction: direction as "Bullish" | "Bearish" | "Neutral",
      strength: "Moderate",
      weight: weight * 0.4,
      contribution: (direction === "Bullish" ? 1 : direction === "Bearish" ? -1 : 0) * weight * 0.4,
      reason: `Retail positioning is ${crowd.retailBias.toLowerCase()} — contrarian indicator.`
    });
  }

  if (crowd.crowdingLevel && crowd.crowdingLevel !== "Unknown") {
    const crowding = CROWDING_RISK_NUMERIC[crowd.crowdingLevel];
    factors.push({
      name: "Crowding Level",
      direction: "Bearish",
      strength: crowding > 0.7 ? "Strong" : crowding > 0.4 ? "Moderate" : "Weak",
      weight: weight * 0.3,
      contribution: -crowding * weight * 0.3,
      reason: `Crowding level is ${crowd.crowdingLevel.toLowerCase()} — increased reversal risk.`
    });
  }

  if (crowd.crowdedTradeRisk && crowd.crowdedTradeRisk !== "Unknown") {
    const risk = RISK_LEVEL_NUMERIC[crowd.crowdedTradeRisk];
    factors.push({
      name: "Crowded Trade Risk",
      direction: "Bearish",
      strength: risk > 0.7 ? "Strong" : risk > 0.4 ? "Moderate" : "Weak",
      weight: weight * 0.3,
      contribution: -risk * weight * 0.3,
      reason: `Crowded trade risk is ${crowd.crowdedTradeRisk.toLowerCase()}.`
    });
  }

  if (factors.length === 0) {
    return [{
      name: "Crowd Positioning",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No actionable crowd positioning data provided."
    }];
  }

  return factors;
}

export function analyzePositionRisk(
  risk: PositionRiskInput | undefined,
  weight: number
): InstitutionalFactor[] {
  if (!risk) {
    return [{
      name: "Position Risk",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No position risk data provided."
    }];
  }

  const factors: InstitutionalFactor[] = [];

  const riskLevel = RISK_LEVEL_NUMERIC[risk.level];
  factors.push({
    name: "Position Risk Level",
    direction: "Bearish",
    strength: risk.level === "Extreme" ? "Strong" : risk.level === "High" ? "Moderate" : risk.level === "Moderate" ? "Weak" : "None",
    weight: weight * 0.5,
    contribution: -riskLevel * weight * 0.5,
    reason: `Position risk level is ${risk.level.toLowerCase()}.`
  });

  if (risk.crowdingFactor !== undefined) {
    factors.push({
      name: "Crowding Factor",
      direction: "Bearish",
      strength: risk.crowdingFactor > 0.7 ? "Strong" : "Moderate",
      weight: weight * 0.25,
      contribution: -risk.crowdingFactor * weight * 0.25,
      reason: `Crowding factor: ${(risk.crowdingFactor * 100).toFixed(0)}%.`
    });
  }

  if (risk.reversalRisk) {
    factors.push({
      name: "Reversal Risk",
      direction: "Bearish",
      strength: "Moderate",
      weight: weight * 0.25,
      contribution: -weight * 0.25,
      reason: `Reversal risk: ${risk.reversalRisk}.`
    });
  }

  return factors;
}

function analyzePositioningGroup(
  data: PositioningData,
  groupName: string,
  weight: number
): InstitutionalFactor {
  if (data.netLong !== undefined || data.netShort !== undefined) {
    const netPosition = (data.netLong ?? 0) - (data.netShort ?? 0);
    const direction: "Bullish" | "Bearish" | "Neutral" = netPosition > 0 ? "Bullish" : netPosition < 0 ? "Bearish" : "Neutral";
    const magnitude = Math.min(Math.abs(netPosition) / 50000, 1.0);
    const contribution = (netPosition > 0 ? 1 : netPosition < 0 ? -1 : 0) * magnitude * weight;

    return {
      name: groupName,
      direction,
      strength: magnitude > 0.6 ? "Strong" : magnitude > 0.3 ? "Moderate" : "Weak",
      weight,
      contribution,
      reason: `${groupName} positioning: ${netPosition > 0 ? "net long" : netPosition < 0 ? "net short" : "flat"} ${Math.abs(netPosition).toLocaleString()} contracts.`
    };
  }

  return {
    name: groupName,
    direction: "Neutral",
    strength: "None",
    weight,
    contribution: 0,
    reason: `No ${groupName} positioning data provided.`
  };
}

function scoreToBias(score: number): InstitutionalFlowResult["institutionalBias"] {
  if (score >= 75) return "Strong Bullish";
  if (score >= 60) return "Bullish";
  if (score <= 25) return "Strong Bearish";
  if (score <= 40) return "Bearish";
  return "Neutral";
}

function deriveStrength(
  score: number,
  factors: InstitutionalFactor[]
): InstitutionalFlowResult["strength"] {
  const activeFactors = factors.filter((f) => f.weight > 0 && f.contribution !== 0);
  if (activeFactors.length === 0) return "None";

  const avgContribution = activeFactors.reduce((sum, f) => sum + Math.abs(f.contribution), 0) / activeFactors.length;
  const normalizedStrength = avgContribution / (activeFactors[0]?.weight ?? 1);

  if (normalizedStrength > 0.6 || Math.abs(score - 50) > 30) return "Strong";
  if (normalizedStrength > 0.3 || Math.abs(score - 50) > 15) return "Moderate";
  if (normalizedStrength > 0.1) return "Weak";
  return "None";
}

function calculateConfidence(
  factors: InstitutionalFactor[],
  input: InstitutionalFlowInput
): number {
  const activeFactors = factors.filter((f) => f.weight > 0);
  if (activeFactors.length === 0) return 0;

  const factorsWithDirection = activeFactors.filter((f) => f.direction !== "Neutral");
  const alignmentRatio = factorsWithDirection.length / activeFactors.length;

  const dataPoints = [
    Boolean(input.etfFlows),
    Boolean(input.centralBank),
    Boolean(input.cotPositioning),
    Boolean(input.openInterest),
    Boolean(input.crowdPositioning),
    Boolean(input.positionRisk)
  ].filter(Boolean).length;

  const dataCompleteness = dataPoints / 6;
  const baseConfidence = alignmentRatio * 60 + dataCompleteness * 40;

  return Math.round(Math.max(0, Math.min(100, baseConfidence)));
}

function assessDataQuality(input: InstitutionalFlowInput): InstitutionalDataQuality {
  const hasEtfFlows = Boolean(input.etfFlows && input.etfFlows.direction !== "Unknown");
  const hasCentralBank = Boolean(input.centralBank && (input.centralBank.netPurchases !== undefined || input.centralBank.buyingVolume));
  const hasCotPositioning = Boolean(input.cotPositioning && (input.cotPositioning.commercials || input.cotPositioning.nonCommercials || input.cotPositioning.managedMoney));
  const hasOpenInterest = Boolean(input.openInterest && (input.openInterest.trend || input.openInterest.currentLevel !== undefined));
  const hasCrowdPositioning = Boolean(input.crowdPositioning && (input.crowdPositioning.retailBias || input.crowdPositioning.crowdingLevel));
  const hasPositionRisk = Boolean(input.positionRisk);

  const fields = [hasEtfFlows, hasCentralBank, hasCotPositioning, hasOpenInterest, hasCrowdPositioning, hasPositionRisk];
  const completeness = fields.filter(Boolean).length / fields.length;

  const availableDrivers: string[] = [];
  const missingDrivers: string[] = [];

  if (hasEtfFlows) availableDrivers.push("ETF Flows");
  else missingDrivers.push("ETF Flows");

  if (hasCentralBank) availableDrivers.push("Central Bank");
  else missingDrivers.push("Central Bank");

  if (hasCotPositioning) availableDrivers.push("COT Positioning");
  else missingDrivers.push("COT Positioning");

  if (hasOpenInterest) availableDrivers.push("Open Interest");
  else missingDrivers.push("Open Interest");

  if (hasCrowdPositioning) availableDrivers.push("Crowd Positioning");
  else missingDrivers.push("Crowd Positioning");

  if (hasPositionRisk) availableDrivers.push("Position Risk");
  else missingDrivers.push("Position Risk");

  return {
    score: Math.round(completeness * 100),
    completeness,
    hasEtfFlows,
    hasCentralBank,
    hasCotPositioning,
    hasOpenInterest,
    hasCrowdPositioning,
    hasPositionRisk,
    availableDrivers,
    missingDrivers,
    freshness: "Unknown"
  };
}

function detectConcentrationRisks(
  input: InstitutionalFlowInput,
  factors: InstitutionalFactor[]
): ConcentrationRisk[] {
  const risks: ConcentrationRisk[] = [];

  if (input.cotPositioning?.commercials) {
    const com = input.cotPositioning.commercials;
    if (com.percentLong !== undefined && com.percentLong > 80) {
      risks.push({
        detected: true,
        type: "Commercial Concentration",
        severity: "High",
        description: `Commercials are ${com.percentLong.toFixed(1)}% long — extreme concentration.`,
        recommendation: "Watch for potential reversal when commercial positioning reaches extremes."
      });
    }
    if (com.percentShort !== undefined && com.percentShort > 80) {
      risks.push({
        detected: true,
        type: "Commercial Short Concentration",
        severity: "High",
        description: `Commercials are ${com.percentShort.toFixed(1)}% short — extreme concentration.`,
        recommendation: "Commercial extreme shorting may signal bottom formation."
      });
    }
  }

  if (input.crowdPositioning?.crowdingLevel === "Extreme") {
    risks.push({
      detected: true,
      type: "Extreme Crowding",
      severity: "Extreme",
      description: "Market positioning is at extreme crowding levels.",
      recommendation: "High risk of violent reversal. Reduce position size or wait for normalization."
    });
  }

  if (input.positionRisk?.level === "Extreme") {
    risks.push({
      detected: true,
      type: "Extreme Position Risk",
      severity: "Extreme",
      description: "Position risk is at extreme levels.",
      recommendation: "Potential for sharp move. Use tighter stops and smaller position sizes."
    });
  }

  if (input.openInterest?.highLevel) {
    risks.push({
      detected: true,
      type: "Elevated Open Interest",
      severity: "Moderate",
      description: "Open interest is at elevated levels.",
      recommendation: "Higher open interest increases potential for volatile moves."
    });
  }

  return risks;
}

function generateSummary(
  bias: InstitutionalFlowResult["institutionalBias"],
  strength: InstitutionalFlowResult["strength"],
  confidence: number,
  supportingFactors: string[],
  conflictingFactors: string[],
  concentrationRisks: ConcentrationRisk[],
  dataQuality: InstitutionalDataQuality
): string {
  const parts: string[] = [];

  parts.push(`Institutional flow analysis shows a ${bias.toLowerCase()} bias with ${strength.toLowerCase()} strength.`);

  if (confidence < 30) {
    parts.push("Low confidence due to limited institutional data availability.");
  } else if (confidence >= 70) {
    parts.push("High confidence supported by multiple institutional data sources.");
  }

  if (dataQuality.availableDrivers.length > 0) {
    parts.push(`Data sources: ${dataQuality.availableDrivers.join(", ")}.`);
  }

  if (dataQuality.missingDrivers.length > 0) {
    parts.push(`Missing: ${dataQuality.missingDrivers.join(", ")}.`);
  }

  if (concentrationRisks.length > 0) {
    const extremeRisks = concentrationRisks.filter((r) => r.severity === "Extreme" || r.severity === "High");
    if (extremeRisks.length > 0) {
      parts.push(`Warning: ${extremeRisks.length} concentration risk(s) detected.`);
    }
  }

  if (supportingFactors.length > 0) {
    parts.push(`Key bullish factors: ${supportingFactors.slice(0, 2).join("; ")}.`);
  }

  if (conflictingFactors.length > 0) {
    parts.push(`Key bearish factors: ${conflictingFactors.slice(0, 2).join("; ")}.`);
  }

  return parts.join(" ");
}
