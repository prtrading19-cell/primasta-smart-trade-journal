import type { ResearchAsset } from "../ResearchTypes";
import type { ResearchSummary, ResearchSummarySection, ResearchSummaryInput } from "../models";
import type { ResearchBias, ResearchDecision } from "../models";

export function executeResearchSummaryEngine(input: ResearchSummaryInput): ResearchSummary {
  const sections = buildSummarySections(input);
  const missingData = identifyMissingData(input);

  return {
    asset: input.asset,
    reportDate: input.reportDate,
    overallBias: input.decisionBias,
    recommendation: input.decisionAction,
    confidence: input.decisionConfidence,
    risk: input.riskRating,
    alignment: `${input.alignmentScore}%`,
    executiveSummary: buildExecutiveSummary(input),
    sections,
    missingData,
    generatedAt: new Date().toISOString(),
    aiEnhanced: false,
  };
}

export function buildSummarySections(input: ResearchSummaryInput): ResearchSummarySection[] {
  return input.drivers.map((d) => ({
    driver: d.driverTitle,
    impact: mapBiasToImpact(d.bias),
    reason: `${d.driverTitle} is ${d.bias.toLowerCase()} with ${d.confidence}% confidence`,
    currentDataValue: d.currentDataValue,
    newsHeadline: `${d.driverTitle}: ${d.bias}`,
    newsSummary: `Analysis indicates ${d.bias.toLowerCase()} bias for ${d.driverTitle}`,
    chartObservation: "Based on institutional data",
    sourceLink: "Institutional Research",
  }));
}

export function identifyMissingData(input: ResearchSummaryInput): string[] {
  return input.drivers
    .filter((d) => !d.currentDataValue || d.currentDataValue === "N/A")
    .map((d) => d.driverTitle);
}

export function buildAIResearchPrompt(
  asset: ResearchAsset,
  reportDate: string,
  sections: ResearchSummarySection[],
  bias: ResearchBias,
  decision: ResearchDecision
): string {
  const lines: string[] = [];

  lines.push(`RESEARCH ANALYSIS: ${asset.toUpperCase()}`);
  lines.push(`Date: ${reportDate}`);
  lines.push("");
  lines.push("=== MARKET DATA ===");
  for (const section of sections) {
    lines.push(`\n${section.driver}:`);
    lines.push(`  Impact: ${section.impact}`);
    lines.push(`  Value: ${section.currentDataValue}`);
    lines.push(`  Assessment: ${section.reason}`);
  }

  lines.push("");
  lines.push("=== ENGINE ANALYSIS ===");
  lines.push(`Overall Bias: ${bias.overallBias} (Score: ${bias.overallScore}/100)`);
  lines.push(`Confidence: ${decision.confidence}%`);
  lines.push(`Alignment: ${bias.alignmentScore}%`);
  lines.push(`Decision: ${decision.action}`);
  lines.push(`Risk Rating: ${decision.riskRating}`);

  lines.push("");
  lines.push("=== REASONING ===");
  for (const step of decision.reasoning) {
    lines.push(`- ${step}`);
  }

  return lines.join("\n");
}

function buildExecutiveSummary(input: ResearchSummaryInput): string {
  const bullishCount = input.drivers.filter((d) => d.bias.includes("Bullish")).length;
  const bearishCount = input.drivers.filter((d) => d.bias.includes("Bearish")).length;
  const totalDrivers = input.drivers.length;

  return [
    `Bias: ${input.decisionBias} with ${input.decisionConfidence}% confidence.`,
    `${bullishCount} bullish, ${bearishCount} bearish out of ${totalDrivers} drivers.`,
    `Recommendation: ${input.decisionAction}. Risk: ${input.riskRating}.`,
  ].join(" ");
}

function mapBiasToImpact(bias: string): string {
  if (bias.includes("Bullish")) return "Bullish";
  if (bias.includes("Bearish")) return "Bearish";
  return "Neutral";
}
