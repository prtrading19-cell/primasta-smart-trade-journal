import type { ResearchCategory, ResearchInstitutional, ResearchTechnical, ResearchBias, BiasEngineInput } from "../models";
import type { DriverBias } from "@/types/goldResearchConfig";

export function executeBiasEngine(input: BiasEngineInput): ResearchBias {
  const categoryBias = aggregateCategoryBias(input.categories);
  const institutionalBias = input.institutional.bias;
  const technicalBias = input.technical.bias;

  const categoryScore = input.categories.reduce((sum, c) => sum + c.weightedScore, 0);
  const instScore = input.institutional.score;
  const techScore = input.technical.score;

  const categoryContribution = categoryScore * 0.45;
  const institutionalContribution = instScore * 0.30;
  const technicalContribution = techScore * 0.25;

  const overallScore = Math.round(categoryContribution + institutionalContribution + technicalContribution);

  const alignmentScore = calculateAlignment(categoryBias, institutionalBias, technicalBias);
  const overallBias = scoreToBias(overallScore);
  const confidence = calculateConfidence(input, alignmentScore);

  return {
    overallBias,
    overallScore,
    confidence,
    categoryContribution: Math.round(categoryContribution),
    institutionalContribution: Math.round(institutionalContribution),
    technicalContribution: Math.round(technicalContribution),
    categoryBias,
    institutionalBias,
    technicalBias,
    alignmentScore,
    conflictScore: 100 - alignmentScore,
  };
}

function aggregateCategoryBias(categories: ResearchCategory[]): DriverBias {
  const bullish = categories.filter((c) => c.bias.includes("Bullish")).length;
  const bearish = categories.filter((c) => c.bias.includes("Bearish")).length;
  if (bullish > bearish * 2) return "Strong Bullish";
  if (bullish > bearish) return "Bullish";
  if (bearish > bullish * 2) return "Strong Bearish";
  if (bearish > bullish) return "Bearish";
  return "Neutral";
}

function calculateAlignment(cat: DriverBias, inst: DriverBias, tech: DriverBias): number {
  const biases = [cat, inst, tech];
  const bullish = biases.filter((b) => b.includes("Bullish")).length;
  const bearish = biases.filter((b) => b.includes("Bearish")).length;
  const neutral = biases.filter((b) => b === "Neutral").length;
  const consensus = Math.max(bullish, bearish);
  const total = biases.length - neutral;
  return total > 0 ? Math.round((consensus / total) * 100) : 50;
}

function scoreToBias(score: number): DriverBias {
  if (score >= 70) return "Strong Bullish";
  if (score >= 58) return "Bullish";
  if (score <= 30) return "Strong Bearish";
  if (score <= 42) return "Bearish";
  return "Neutral";
}

function calculateConfidence(input: BiasEngineInput, alignment: number): number {
  const catConf = input.categories.reduce((sum, c) => sum + c.confidence, 0) / (input.categories.length || 1);
  const instConf = input.institutional.confidence;
  const techConf = input.technical.confidence;

  const avgConfidence = (catConf * 0.35 + instConf * 0.35 + techConf * 0.30);
  const alignmentMultiplier = alignment / 100;

  return Math.round(Math.max(0, Math.min(100, avgConfidence * (0.5 + alignmentMultiplier * 0.5))));
}
