import type { ResearchTechnical, TechnicalEngineInput } from "../models";
import type { DriverBias } from "@/types/goldResearchConfig";

export function executeTechnicalEngine(input: TechnicalEngineInput): ResearchTechnical {
  const trendLabel = describeTrend(input.trendDirection, input.trendStrength);
  const momentumLabel = describeMomentum(input.momentumScore);
  const structureLabel = describeStructure(input.structureScore);
  const volLabel = describeVolatility(input.volatilityLevel);
  const maAlignment = input.movingAverageAlignment ?? 50;

  const score = computeScore(input);
  const bias = scoreToBias(score);
  const confidence = computeConfidence(input);
  const setupPresent = (input.setupGrade ?? 0) > 0;

  const factors: string[] = [];
  const conflicts: string[] = [];

  if (trendLabel) factors.push(`Trend: ${trendLabel}`);
  if (momentumLabel) factors.push(`Momentum: ${momentumLabel}`);
  if (maAlignment > 60) factors.push("Moving averages aligned bullishly");
  else if (maAlignment < 40) conflicts.push("Moving averages bearishly aligned");

  const summary = buildSummary(bias, score, factors);

  return {
    bias,
    score,
    confidence,
    strength: confidence >= 65 ? "Strong" : confidence >= 40 ? "Moderate" : "Weak",
    trend: trendLabel,
    momentum: momentumLabel,
    structure: structureLabel,
    volatility: volLabel,
    setupPresent,
    setupType: setupPresent ? "Detected" : "None",
    supportingFactors: factors,
    conflictingFactors: conflicts,
    summary,
  };
}

function describeTrend(direction?: number, strength?: number): string {
  if (direction === undefined) return "Unknown";
  if (direction > 0.5 && (strength ?? 0) > 0.6) return "Strong Uptrend";
  if (direction > 0.3) return "Uptrend";
  if (direction < -0.5 && (strength ?? 0) > 0.6) return "Strong Downtrend";
  if (direction < -0.3) return "Downtrend";
  return "Neutral/Sideways";
}

function describeMomentum(score?: number): string {
  if (score === undefined) return "Unknown";
  if (score > 70) return "Strong Positive";
  if (score > 55) return "Positive";
  if (score < 30) return "Strong Negative";
  if (score < 45) return "Negative";
  return "Neutral";
}

function describeStructure(score?: number): string {
  if (score === undefined) return "Unknown";
  if (score > 70) return "Bullish Structure";
  if (score < 30) return "Bearish Structure";
  return "Neutral Structure";
}

function describeVolatility(level?: number): string {
  if (level === undefined) return "Unknown";
  if (level > 35) return "Extreme";
  if (level > 25) return "High";
  if (level > 18) return "Elevated";
  return "Normal";
}

function computeScore(input: TechnicalEngineInput): number {
  let score = 50;

  if (input.trendDirection !== undefined) {
    score += input.trendDirection * 20;
  }
  if (input.momentumScore !== undefined) {
    score += (input.momentumScore - 50) * 0.15;
  }
  if (input.structureScore !== undefined) {
    score += (input.structureScore - 50) * 0.15;
  }
  if (input.movingAverageAlignment !== undefined) {
    score += (input.movingAverageAlignment - 50) * 0.10;
  }
  if (input.volatilityLevel !== undefined) {
    if (input.volatilityLevel > 28) score -= 10;
    else if (input.volatilityLevel > 20) score -= 5;
    else if (input.volatilityLevel < 14) score += 5;
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

function scoreToBias(score: number): DriverBias {
  if (score >= 65) return "Bullish";
  if (score <= 35) return "Bearish";
  return "Neutral";
}

function computeConfidence(input: TechnicalEngineInput): number {
  let fields = 0;
  if (input.trendDirection !== undefined) fields++;
  if (input.momentumScore !== undefined) fields++;
  if (input.structureScore !== undefined) fields++;
  if (input.movingAverageAlignment !== undefined) fields++;
  if (input.setupGrade !== undefined) fields++;
  return Math.round((fields / 5) * 80 + 10);
}

function buildSummary(bias: DriverBias, score: number, factors: string[]): string {
  const parts: string[] = [];
  parts.push(`Technical bias: ${bias} (score: ${score}/100).`);
  if (factors.length > 0) parts.push(factors.join(". "));
  return parts.join(" ");
}
