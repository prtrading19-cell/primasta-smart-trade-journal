import type {
  TechnicalInput,
  TechnicalBiasResult,
  TechnicalFactor,
  TechnicalDataQuality,
  TrendDirection,
  TrendStrength,
  MarketStructure,
  SetupType,
  VolatilityLevel,
  BreakoutStatus,
  TrendInput,
  MomentumInput,
  MovingAverageInput,
  StructureInput,
  BreakoutInput,
  VolatilityInput,
  SetupInput,
  Timeframe
} from "@/types/technicalBias";
import {
  TREND_DIRECTION_NUMERIC,
  TREND_STRENGTH_MULTIPLIER,
  MARKET_STRUCTURE_NUMERIC,
  SETUP_GRADE_NUMERIC
} from "@/types/technicalBias";

export interface TechnicalBiasConfig {
  trendWeight: number;
  momentumWeight: number;
  structureWeight: number;
  movingAverageWeight: number;
  breakoutWeight: number;
  volatilityWeight: number;
  setupWeight: number;
}

const DEFAULT_CONFIG: TechnicalBiasConfig = {
  trendWeight: 0.25,
  momentumWeight: 0.15,
  structureWeight: 0.20,
  movingAverageWeight: 0.15,
  breakoutWeight: 0.10,
  volatilityWeight: 0.05,
  setupWeight: 0.10
};

export function calculateTechnicalBias(
  input: TechnicalInput,
  config?: TechnicalBiasConfig
): TechnicalBiasResult {
  console.log("[RUNTIME-AUDIT:TechBias] calculateTechnicalBias called with input:", JSON.stringify(input, null, 2));
  const effectiveConfig = config ?? DEFAULT_CONFIG;
  const timestamp = input.timestamp ?? new Date().toISOString();
  const timeframe = input.timeframe ?? "D1";

  const factors: TechnicalFactor[] = [];

  const trendFactors = analyzeTrend(input.trend, effectiveConfig.trendWeight);
  factors.push(...trendFactors);

  const momentumFactors = analyzeMomentum(input.momentum, effectiveConfig.momentumWeight);
  factors.push(...momentumFactors);

  const structureFactors = analyzeStructure(input.structure, effectiveConfig.structureWeight);
  factors.push(...structureFactors);

  const maFactors = analyzeMovingAverages(input.movingAverages, input.currentPrice, effectiveConfig.movingAverageWeight);
  factors.push(...maFactors);

  const breakoutFactors = analyzeBreakout(input.breakout, effectiveConfig.breakoutWeight);
  factors.push(...breakoutFactors);

  const volatilityFactors = analyzeVolatility(input.volatility, effectiveConfig.volatilityWeight);
  factors.push(...volatilityFactors);

  const setupFactors = analyzeSetup(input.setup, effectiveConfig.setupWeight);
  factors.push(...setupFactors);

  const totalWeightedScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);

  const technicalScore = totalWeight > 0
    ? Math.round(((totalWeightedScore / totalWeight) + 2) / 4 * 100)
    : 50;

  const clampedScore = Math.max(0, Math.min(100, technicalScore));

  const technicalBias = scoreToBias(clampedScore);
  const strength = deriveStrength(clampedScore, factors);
  const confidence = calculateConfidence(factors, input);
  const dataQuality = assessDataQuality(input);

  const supportingFactors = factors
    .filter((f) => f.contribution > 0.05)
    .sort((a, b) => b.contribution - a.contribution)
    .map((f) => `${f.name}: ${f.reason}`);

  const conflictingFactors = factors
    .filter((f) => f.contribution < -0.05)
    .sort((a, b) => a.contribution - b.contribution)
    .map((f) => `${f.name}: ${f.reason}`);

  const marketStructure = input.structure?.marketStructure ?? "Unknown";
  const setupPresent = input.setup?.present ?? false;
  const setupType = input.setup?.type ?? "None";
  const riskLevel = input.volatility?.level ?? "Unknown";

  const summary = generateSummary(technicalBias, strength, confidence, supportingFactors, conflictingFactors, dataQuality, marketStructure, setupPresent);

  return {
    technicalBias,
    technicalScore: clampedScore,
    confidence,
    strength,
    supportingFactors,
    conflictingFactors,
    summary,
    timestamp,
    dataQuality,
    factors,
    timeframe,
    marketStructure,
    setupPresent,
    setupType,
    riskLevel
  };
}

export function analyzeTrend(
  trend: TrendInput | undefined,
  weight: number
): TechnicalFactor[] {
  if (!trend || trend.direction === "Unknown") {
    return [{
      name: "Trend",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No trend data provided."
    }];
  }

  const directionValue = TREND_DIRECTION_NUMERIC[trend.direction];
  const strengthMultiplier = TREND_STRENGTH_MULTIPLIER[trend.strength];
  const contribution = directionValue * strengthMultiplier * weight;

  const reason = trend.description
    ? `${trend.direction} trend (${trend.strength}): ${trend.description}`
    : `${trend.direction} trend with ${trend.strength.toLowerCase()} strength.`;

  return [{
    name: "Trend",
    direction: trend.direction === "Sideways" ? "Neutral" : trend.direction as "Bullish" | "Bearish",
    strength: trend.strength,
    weight,
    contribution,
    reason
  }];
}

export function analyzeMomentum(
  momentum: MomentumInput | undefined,
  weight: number
): TechnicalFactor[] {
  const factors: TechnicalFactor[] = [];

  if (!momentum) {
    return [{
      name: "Momentum",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No momentum data provided."
    }];
  }

  if (momentum.rsi !== undefined) {
    const rsiValue = momentum.rsi;
    let rsiDirection: "Bullish" | "Bearish" | "Neutral" = "Neutral";
    let rsiStrength: TrendStrength = "Weak";
    let rsiContribution = 0;

    if (rsiValue < 30) {
      rsiDirection = "Bullish";
      rsiStrength = rsiValue < 20 ? "Strong" : "Moderate";
      rsiContribution = (30 - rsiValue) / 30 * weight;
    } else if (rsiValue > 70) {
      rsiDirection = "Bearish";
      rsiStrength = rsiValue > 80 ? "Strong" : "Moderate";
      rsiContribution = -(rsiValue - 70) / 30 * weight;
    } else {
      rsiContribution = ((50 - rsiValue) / 50) * weight * 0.2;
    }

    factors.push({
      name: "RSI",
      direction: rsiDirection,
      strength: rsiStrength,
      weight: weight * 0.5,
      contribution: rsiContribution,
      reason: `RSI at ${rsiValue.toFixed(1)}: ${momentum.rsiInterpretation ?? (rsiValue < 30 ? "oversold territory" : rsiValue > 70 ? "overbought territory" : "neutral zone")}.`
    });
  }

  if (momentum.macdInterpretation) {
    const macdDirection = momentum.macdInterpretation === "Neutral" ? "Neutral" : momentum.macdInterpretation as "Bullish" | "Bearish";
    const macdContribution = macdDirection === "Bullish" ? weight * 0.5 : macdDirection === "Bearish" ? -weight * 0.5 : 0;

    factors.push({
      name: "MACD",
      direction: macdDirection,
      strength: "Moderate",
      weight: weight * 0.5,
      contribution: macdContribution,
      reason: `MACD signal: ${momentum.macd ?? momentum.macdInterpretation}.`
    });
  }

  if (factors.length === 0) {
    return [{
      name: "Momentum",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No actionable momentum data provided."
    }];
  }

  return factors;
}

export function analyzeStructure(
  structure: StructureInput | undefined,
  weight: number
): TechnicalFactor[] {
  const factors: TechnicalFactor[] = [];

  if (!structure) {
    return [{
      name: "Market Structure",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No market structure data provided."
    }];
  }

  if (structure.marketStructure && structure.marketStructure !== "Unknown") {
    const structureValue = MARKET_STRUCTURE_NUMERIC[structure.marketStructure];
    const direction = structureValue > 0 ? "Bullish" : structureValue < 0 ? "Bearish" : "Neutral";
    const contribution = structureValue * weight * 0.5;

    factors.push({
      name: "Market Structure",
      direction: direction as "Bullish" | "Bearish" | "Neutral",
      strength: Math.abs(structureValue) >= 1 ? "Strong" : "Moderate",
      weight: weight * 0.4,
      contribution,
      reason: `Market structure is ${structure.marketStructure}.`
    });
  }

  if (structure.higherTimeframeStructure && structure.higherTimeframeStructure !== "Unknown") {
    const htfDirection = structure.higherTimeframeStructure;
    const contribution = htfDirection === "Bullish" ? weight * 0.3 : htfDirection === "Bearish" ? -weight * 0.3 : 0;

    factors.push({
      name: "Higher Timeframe Structure",
      direction: htfDirection === "Sideways" ? "Neutral" : htfDirection as "Bullish" | "Bearish",
      strength: "Moderate",
      weight: weight * 0.3,
      contribution,
      reason: `Higher timeframe structure is ${htfDirection.toLowerCase()}.`
    });
  }

  if (structure.liquiditySweep === "Yes") {
    const sweepDirection = structure.liquiditySweepDirection ?? "Unknown";
    const contribution = sweepDirection === "Buy-Side" ? -weight * 0.2 : sweepDirection === "Sell-Side" ? weight * 0.2 : 0;

    factors.push({
      name: "Liquidity Sweep",
      direction: sweepDirection === "Buy-Side" ? "Bearish" : sweepDirection === "Sell-Side" ? "Bullish" : "Neutral",
      strength: "Moderate",
      weight: weight * 0.2,
      contribution,
      reason: `Liquidity sweep detected: ${sweepDirection} side swept.`
    });
  }

  if (structure.supportLevels && structure.supportLevels.length > 0) {
    factors.push({
      name: "Support Levels",
      direction: "Bullish",
      strength: "Moderate",
      weight: weight * 0.05,
      contribution: weight * 0.05,
      reason: `${structure.supportLevels.length} support level(s) identified: ${structure.supportLevels.slice(0, 2).join(", ")}.`
    });
  }

  if (structure.resistanceLevels && structure.resistanceLevels.length > 0) {
    factors.push({
      name: "Resistance Levels",
      direction: "Bearish",
      strength: "Moderate",
      weight: weight * 0.05,
      contribution: -weight * 0.05,
      reason: `${structure.resistanceLevels.length} resistance level(s) identified: ${structure.resistanceLevels.slice(0, 2).join(", ")}.`
    });
  }

  if (factors.length === 0) {
    return [{
      name: "Market Structure",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No actionable structure data provided."
    }];
  }

  return factors;
}

export function analyzeMovingAverages(
  ma: MovingAverageInput | undefined,
  currentPrice: number | undefined,
  weight: number
): TechnicalFactor[] {
  if (!ma) {
    return [{
      name: "Moving Averages",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No moving average data provided."
    }];
  }

  if (ma.alignment && ma.alignment !== "Unknown") {
    const direction = ma.alignment === "Mixed" ? "Neutral" : ma.alignment as "Bullish" | "Bearish";
    const contribution = ma.alignment === "Bullish" ? weight : ma.alignment === "Bearish" ? -weight : 0;

    return [{
      name: "Moving Averages",
      direction,
      strength: ma.alignment === "Mixed" ? "Weak" : "Moderate",
      weight,
      contribution,
      reason: `Moving average alignment is ${ma.alignment.toLowerCase()}.`
    }];
  }

  if (currentPrice !== undefined) {
    let bullishCount = 0;
    let bearishCount = 0;
    let totalMas = 0;

    const mas = [
      { value: ma.sma200, label: "SMA200" },
      { value: ma.sma50, label: "SMA50" },
      { value: ma.sma20, label: "SMA20" },
      { value: ma.ema50, label: "EMA50" },
      { value: ma.ema21, label: "EMA21" },
      { value: ma.ema9, label: "EMA9" }
    ].filter((m) => m.value !== undefined);

    for (const m of mas) {
      totalMas++;
      if (currentPrice > m.value!) bullishCount++;
      else if (currentPrice < m.value!) bearishCount++;
    }

    if (totalMas === 0) {
      return [{
        name: "Moving Averages",
        direction: "Neutral",
        strength: "None",
        weight,
        contribution: 0,
        reason: "No moving average values provided."
      }];
    }

    const ratio = (bullishCount - bearishCount) / totalMas;
    const direction = ratio > 0.3 ? "Bullish" : ratio < -0.3 ? "Bearish" : "Neutral";
    const contribution = ratio * weight;

    return [{
      name: "Moving Averages",
      direction: direction as "Bullish" | "Bearish" | "Neutral",
      strength: Math.abs(ratio) > 0.6 ? "Strong" : Math.abs(ratio) > 0.3 ? "Moderate" : "Weak",
      weight,
      contribution,
      reason: `Price ${currentPrice > (mas[0]?.value ?? 0) ? "above" : "below"} ${bullishCount}/${totalMas} key moving averages.`
    }];
  }

  return [{
    name: "Moving Averages",
    direction: "Neutral",
    strength: "None",
    weight,
    contribution: 0,
    reason: "Insufficient moving average data."
  }];
}

export function analyzeBreakout(
  breakout: BreakoutInput | undefined,
  weight: number
): TechnicalFactor[] {
  if (!breakout || breakout.status === "None") {
    return [{
      name: "Breakout",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No breakout activity."
    }];
  }

  if (breakout.status === "Unknown" || breakout.status === "Pending") {
    return [{
      name: "Breakout",
      direction: "Neutral",
      strength: "Weak",
      weight,
      contribution: 0,
      reason: `Breakout status: ${breakout.status}${breakout.level ? ` at ${breakout.level}` : ""}.`
    }];
  }

  const direction = breakout.status === "Breakout" ? "Bullish" : "Bearish";
  const confirmedMultiplier = breakout.confirmed ? 1.0 : 0.6;
  const volumeMultiplier = breakout.volumeConfirmation ? 1.2 : 0.8;
  const contribution = (direction === "Bullish" ? weight : -weight) * confirmedMultiplier * volumeMultiplier;

  const reasonParts = [
    `${breakout.status} detected${breakout.level ? ` at ${breakout.level}` : ""}.`,
    breakout.confirmed ? "Confirmed." : "Unconfirmed.",
    breakout.volumeConfirmation ? "Volume confirmed." : "No volume confirmation.",
    breakout.retestPending ? "Retest pending." : ""
  ].filter(Boolean).join(" ");

  return [{
    name: "Breakout",
    direction,
    strength: confirmedMultiplier > 0.8 ? "Strong" : "Moderate",
    weight,
    contribution,
    reason: reasonParts
  }];
}

export function analyzeVolatility(
  volatility: VolatilityInput | undefined,
  weight: number
): TechnicalFactor[] {
  if (!volatility || volatility.level === "Unknown") {
    return [{
      name: "Volatility",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: "No volatility data provided."
    }];
  }

  const direction = "Neutral";
  const strength = volatility.level === "High" ? "Strong" : volatility.level === "Moderate" ? "Moderate" : "Weak";

  return [{
    name: "Volatility",
    direction,
    strength,
    weight,
    contribution: 0,
    reason: `Volatility is ${volatility.level.toLowerCase()}${volatility.description ? `: ${volatility.description}` : ""}.`
  }];
}

export function analyzeSetup(
  setup: SetupInput | undefined,
  weight: number
): TechnicalFactor[] {
  if (!setup || !setup.present) {
    return [{
      name: "Setup",
      direction: "Neutral",
      strength: "None",
      weight,
      contribution: 0,
      reason: setup?.present === false ? "No setup present." : "No setup data provided."
    }];
  }

  const gradeMultiplier = setup.grade ? (SETUP_GRADE_NUMERIC[setup.grade] ?? 0.5) : 0.5;
  const isBullishSetup = setup.type === "Liquidity Sweep" || setup.type === "BOS" || setup.type === "MSS" || setup.type === "Retest";
  const direction: "Bullish" | "Bearish" | "Neutral" = isBullishSetup ? "Bullish" : "Neutral";

  const contribution = weight * gradeMultiplier * (isBullishSetup ? 1 : 0.3);

  return [{
    name: "Setup",
    direction: direction as "Bullish" | "Bearish" | "Neutral",
    strength: gradeMultiplier > 0.7 ? "Strong" : gradeMultiplier > 0.4 ? "Moderate" : "Weak",
    weight,
    contribution,
    reason: `Setup present: ${setup.type ?? "Unknown type"}, grade ${setup.grade ?? "ungraded"}.`
  }];
}

function scoreToBias(score: number): TechnicalBiasResult["technicalBias"] {
  if (score >= 75) return "Strong Bullish";
  if (score >= 60) return "Bullish";
  if (score <= 25) return "Strong Bearish";
  if (score <= 40) return "Bearish";
  return "Neutral";
}

function deriveStrength(
  score: number,
  factors: TechnicalFactor[]
): TrendStrength {
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
  factors: TechnicalFactor[],
  input: TechnicalInput
): number {
  const activeFactors = factors.filter((f) => f.weight > 0);
  if (activeFactors.length === 0) return 0;

  const factorsWithDirection = activeFactors.filter((f) => f.direction !== "Neutral");
  const alignmentRatio = factorsWithDirection.length / activeFactors.length;

  const hasTrend = Boolean(input.trend);
  const hasMomentum = Boolean(input.momentum?.rsi !== undefined || input.momentum?.macdInterpretation);
  const hasStructure = Boolean(input.structure?.marketStructure);
  const hasMA = Boolean(input.movingAverages?.alignment || input.currentPrice);

  const dataPoints = [hasTrend, hasMomentum, hasStructure, hasMA].filter(Boolean).length;
  const dataCompleteness = dataPoints / 4;

  const baseConfidence = alignmentRatio * 60 + dataCompleteness * 40;

  return Math.round(Math.max(0, Math.min(100, baseConfidence)));
}

function assessDataQuality(input: TechnicalInput): TechnicalDataQuality {
  const hasTrend = Boolean(input.trend && input.trend.direction !== "Unknown");
  const hasMomentum = Boolean(input.momentum && (input.momentum.rsi !== undefined || input.momentum.macdInterpretation));
  const hasStructure = Boolean(input.structure && (input.structure.marketStructure || input.structure.supportLevels?.length));
  const hasVolatility = Boolean(input.volatility && input.volatility.level !== "Unknown");
  const hasMovingAverages = Boolean(input.movingAverages && (input.movingAverages.alignment || input.currentPrice));

  const fields = [hasTrend, hasMomentum, hasStructure, hasVolatility, hasMovingAverages];
  const completeness = fields.filter(Boolean).length / fields.length;

  const missingFields: string[] = [];
  if (!hasTrend) missingFields.push("trend");
  if (!hasMomentum) missingFields.push("momentum");
  if (!hasStructure) missingFields.push("market structure");
  if (!hasVolatility) missingFields.push("volatility");
  if (!hasMovingAverages) missingFields.push("moving averages");

  const score = Math.round(completeness * 100);

  return {
    score,
    completeness,
    hasTrend,
    hasMomentum,
    hasStructure,
    hasVolatility,
    hasMovingAverages,
    missingFields
  };
}

function generateSummary(
  bias: TechnicalBiasResult["technicalBias"],
  strength: TrendStrength,
  confidence: number,
  supportingFactors: string[],
  conflictingFactors: string[],
  dataQuality: TechnicalDataQuality,
  marketStructure: MarketStructure,
  setupPresent: boolean
): string {
  const parts: string[] = [];

  parts.push(`Technical analysis shows a ${bias.toLowerCase()} bias with ${strength.toLowerCase()} strength.`);

  if (confidence < 30) {
    parts.push("Low confidence due to limited data availability.");
  } else if (confidence >= 70) {
    parts.push("High confidence supported by multiple technical factors.");
  }

  if (marketStructure !== "Unknown") {
    parts.push(`Market structure: ${marketStructure}.`);
  }

  if (setupPresent) {
    parts.push("A trade setup is present on the chart.");
  }

  if (supportingFactors.length > 0) {
    parts.push(`Key bullish factors: ${supportingFactors.slice(0, 2).join("; ")}.`);
  }

  if (conflictingFactors.length > 0) {
    parts.push(`Key bearish factors: ${conflictingFactors.slice(0, 2).join("; ")}.`);
  }

  if (dataQuality.score < 50) {
    parts.push(`Data quality is ${dataQuality.score}% — consider adding ${dataQuality.missingFields.slice(0, 2).join(" and ")} for better accuracy.`);
  }

  return parts.join(" ");
}
