import type { ResearchBias, ResearchDecision, DecisionAction } from "../models";

export function executeDecisionEngine(bias: ResearchBias): ResearchDecision {
  const action = deriveAction(bias);
  const riskRating = deriveRiskRating(bias);
  const decisionQuality = deriveQuality(bias);

  const supportingDrivers = buildSupportingDrivers(bias);
  const conflictingDrivers = buildConflictingDrivers(bias);

  const reasoning = buildReasoning(bias, action);

  return {
    action,
    bias: bias.overallBias,
    score: bias.overallScore,
    confidence: bias.confidence,
    riskRating,
    decisionQuality,
    supportingDrivers,
    conflictingDrivers,
    topContributors: [
      { name: "Category Analysis", contribution: bias.categoryContribution },
      { name: "Institutional Flow", contribution: bias.institutionalContribution },
      { name: "Technical Analysis", contribution: bias.technicalContribution },
    ],
    reasoning,
    summary: `Decision: ${action}. Bias: ${bias.overallBias}. Score: ${bias.overallScore}/100. Confidence: ${bias.confidence}%. Risk: ${riskRating}.`,
  };
}

function deriveAction(bias: ResearchBias): DecisionAction {
  if (bias.overallScore >= 70 && bias.confidence >= 65 && bias.alignmentScore >= 60) return "STRONG BUY";
  if (bias.overallScore >= 58 && bias.confidence >= 50 && bias.alignmentScore >= 45) return "BUY";
  if (bias.overallScore <= 30 && bias.confidence >= 65 && bias.alignmentScore >= 60) return "STRONG SELL";
  if (bias.overallScore <= 42 && bias.confidence >= 50 && bias.alignmentScore >= 45) return "SELL";
  if (bias.confidence < 40) return "WAIT";
  if (bias.alignmentScore < 35) return "WAIT";
  if (bias.conflictScore > 50) return "WAIT";
  return "WAIT";
}

function deriveRiskRating(bias: ResearchBias): string {
  const riskScore = bias.conflictScore * 0.4 + (100 - bias.confidence) * 0.3 + (100 - bias.alignmentScore) * 0.3;
  if (riskScore >= 70) return "Extreme";
  if (riskScore >= 50) return "High";
  if (riskScore >= 30) return "Medium";
  return "Low";
}

function deriveQuality(bias: ResearchBias): string {
  if (bias.confidence >= 70 && bias.alignmentScore >= 70 && bias.conflictScore <= 30) return "High";
  if (bias.confidence < 30 || bias.alignmentScore < 30 || bias.conflictScore > 60) return "Low";
  return "Medium";
}

function buildSupportingDrivers(bias: ResearchBias): string[] {
  const drivers: string[] = [];
  if (bias.overallBias.includes("Bullish")) {
    if (bias.categoryBias.includes("Bullish")) drivers.push("Category consensus is bullish");
    if (bias.institutionalBias.includes("Bullish")) drivers.push("Institutional flows are bullish");
    if (bias.technicalBias.includes("Bullish")) drivers.push("Technical setup is bullish");
  }
  if (bias.overallBias.includes("Bearish")) {
    if (bias.categoryBias.includes("Bearish")) drivers.push("Category consensus is bearish");
    if (bias.institutionalBias.includes("Bearish")) drivers.push("Institutional flows are bearish");
    if (bias.technicalBias.includes("Bearish")) drivers.push("Technical setup is bearish");
  }
  return drivers;
}

function buildConflictingDrivers(bias: ResearchBias): string[] {
  const drivers: string[] = [];
  const hasBullishBias = bias.overallBias.includes("Bullish");
  const hasBearishBias = bias.overallBias.includes("Bearish");

  if (hasBullishBias) {
    if (bias.categoryBias.includes("Bearish")) drivers.push("Category analysis conflicts");
    if (bias.institutionalBias.includes("Bearish")) drivers.push("Institutional flow conflicts");
    if (bias.technicalBias.includes("Bearish")) drivers.push("Technical analysis conflicts");
  }
  if (hasBearishBias) {
    if (bias.categoryBias.includes("Bullish")) drivers.push("Category analysis conflicts");
    if (bias.institutionalBias.includes("Bullish")) drivers.push("Institutional flow conflicts");
    if (bias.technicalBias.includes("Bullish")) drivers.push("Technical analysis conflicts");
  }
  return drivers;
}

function buildReasoning(bias: ResearchBias, action: DecisionAction): string[] {
  const chain: string[] = [];
  chain.push(`Category analysis contribution: ${bias.categoryContribution}/100`);
  chain.push(`Institutional flow contribution: ${bias.institutionalContribution}/100`);
  chain.push(`Technical analysis contribution: ${bias.technicalContribution}/100`);
  chain.push(`Overall score: ${bias.overallScore}/100`);
  chain.push(`Cross-source alignment: ${bias.alignmentScore}%`);
  chain.push(`Confidence: ${bias.confidence}%`);
  chain.push(`Final decision: ${action}`);
  return chain;
}
