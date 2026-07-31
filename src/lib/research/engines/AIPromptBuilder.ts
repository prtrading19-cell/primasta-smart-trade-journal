import type { DecisionContext, EvidenceRecord, ConfidenceResult, AlignmentResult, RiskResult, DecisionV2Result } from "./types";

export interface AIPromptInput {
  context?: DecisionContext;
  evidence: EvidenceRecord[];
  confidence: ConfidenceResult;
  risk: RiskResult;
  alignment: AlignmentResult;
  decision?: DecisionV2Result;
  assetLabel: string;
  reportDate: string;
}

export function buildAIPrompt(input: AIPromptInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = buildSystemPrompt(input);
  const userPrompt = buildUserPrompt(input);
  return { systemPrompt, userPrompt };
}

function buildSystemPrompt(input: AIPromptInput): string {
  return `You are an institutional analyst specialising in ${input.assetLabel}.

Your task is to analyze the provided structured evidence and produce a research report.

RULES:
1. Use ONLY the evidence provided below. Do not invent data.
2. Every conclusion must reference specific evidence.
3. If evidence is missing for a category, state "No data available".
4. Maintain institutional-grade analytical rigor.
5. Always include the confidence level and risk assessment in your reasoning.

You will receive:
- Decision Context: Normalized market structure, liquidity, positioning, macro, risk, participation
- Evidence: Structured records from each provider with values and interpretations
- Confidence: Overall confidence score and level
- Risk: Risk score and class
- Alignment: Institutional alignment score and direction

Your output must reference evidence IDs from the provided evidence records.`;
}

function buildUserPrompt(input: AIPromptInput): string {
  const sections: string[] = [];

  sections.push(`REPORT DATE: ${input.reportDate}`);
  sections.push(`ASSET: ${input.assetLabel}`);
  sections.push("");

  if (input.context) {
    sections.push("=== DECISION CONTEXT ===");
    sections.push(formatDecisionContext(input.context));
    sections.push("");
  }

  sections.push("=== EVIDENCE ===");
  sections.push(formatEvidence(input.evidence));
  sections.push("");

  sections.push("=== CONFIDENCE ===");
  sections.push(formatConfidence(input.confidence));
  sections.push("");

  sections.push("=== RISK ===");
  sections.push(formatRisk(input.risk));
  sections.push("");

  sections.push("=== INSTITUTIONAL ALIGNMENT ===");
  sections.push(formatAlignment(input.alignment));
  sections.push("");

  if (input.decision) {
    sections.push("=== ENGINE DECISION ===");
    sections.push(formatDecision(input.decision));
    sections.push("");
  }

  sections.push("=== INSTRUCTIONS ===");
  sections.push("Produce a structured research report with the following sections:");
  sections.push("1. Executive Summary (2-3 sentences)");
  sections.push("2. Market Structure & Liquidity Assessment");
  sections.push("3. Institutional Positioning Analysis (reference evidence)");
  sections.push("4. Macro & Volatility Outlook");
  sections.push("5. Risk Assessment");
  sections.push("6. Confidence & Alignment Evaluation");
  sections.push("7. Recommendation with supporting reasoning chain");
  sections.push("8. Missing Data & Caveats");

  return sections.join("\n");
}

function formatDecisionContext(context: DecisionContext): string {
  const lines: string[] = [];

  lines.push(`Market Trend: ${context.marketStructure.trend} (Strength: ${context.marketStructure.strength}/100)`);
  lines.push(`Sector Rotation: ${context.marketStructure.sectorRotation}`);
  lines.push(`Dominant Sectors: ${context.marketStructure.dominantSectors.join(", ") || "None"}`);
  lines.push("");
  lines.push(`Liquidity: ${context.liquidity.assessment}`);
  lines.push(`OI Trend: ${context.liquidity.openInterestTrend} (${context.liquidity.openInterestChange >= 0 ? "+" : ""}${context.liquidity.openInterestChange})`);
  lines.push(`Volume Participation: ${context.liquidity.volumeParticipation}/100`);
  lines.push("");
  lines.push(`Institutional Positioning: ${context.institutionalPositioning.positioningScore >= 0 ? "Net Long" : "Net Short"} (Score: ${context.institutionalPositioning.positioningScore})`);
  lines.push(`ETF Flow: ${context.institutionalPositioning.etfDirection}`);
  lines.push(`Commercials: ${context.institutionalPositioning.commercialPositioning}`);
  lines.push(`Speculators: ${context.institutionalPositioning.speculatorPositioning}`);
  lines.push(`Crowding: ${context.institutionalPositioning.crowdingLevel}`);
  lines.push("");
  lines.push(`Macro Bias: ${context.macroBias.bias} (Score: ${context.macroBias.score}/100)`);
  lines.push(`Economic Health: ${context.macroBias.economicHealth}`);
  lines.push(`Fed Policy: ${context.macroBias.fedPolicyImpact}`);
  lines.push("");
  lines.push(`VIX: ${context.technicalRisk.vixLevel.toFixed(1)} (Regime: ${context.technicalRisk.volatilityRegime})`);
  if (context.technicalRisk.gvzLevel !== undefined && context.technicalRisk.gvzLevel !== null) {
    lines.push(`GVZ: ${context.technicalRisk.gvzLevel.toFixed(1)}`);
  }
  lines.push("");
  lines.push(`Breadth: ${context.marketParticipation.advancingStocks}/${context.marketParticipation.decliningStocks} (Ratio: ${context.marketParticipation.breadthRatio.toFixed(2)})`);
  lines.push(`Participation: ${context.marketParticipation.assessment}`);

  return lines.join("\n");
}

function formatEvidence(evidence: EvidenceRecord[]): string {
  if (evidence.length === 0) return "No evidence records available.";

  return evidence
    .map(
      (e, i) =>
        `[${i + 1}] Category: ${e.category}
  Provider: ${e.provider}
  Value: ${e.value}
  Interpretation: ${e.interpretation}
  Confidence: ${e.confidence}/100
  Bias: ${e.bias}
  Source: ${e.source}`
    )
    .join("\n\n");
}

function formatConfidence(confidence: ConfidenceResult): string {
  const lines: string[] = [];
  lines.push(`Score: ${confidence.score}/100`);
  lines.push(`Level: ${confidence.level}`);
  lines.push("Components:");
  lines.push(`  Provider Freshness: ${confidence.components.providerFreshness}/100`);
  lines.push(`  Provider Agreement: ${confidence.components.providerAgreement}/100`);
  lines.push(`  Provider Availability: ${confidence.components.providerAvailability}/100`);
  lines.push(`  Signal Quality: ${confidence.components.signalQuality}/100`);
  lines.push(`  Conflict Penalty: ${confidence.components.conflictPenalty}`);
  lines.push(`  Historical Consistency: ${confidence.components.historicalConsistency}/100`);
  return lines.join("\n");
}

function formatRisk(risk: RiskResult): string {
  const lines: string[] = [];
  lines.push(`Score: ${risk.score}/100`);
  lines.push(`Class: ${risk.class}`);
  lines.push("Components:");
  lines.push(`  GVZ Risk: ${risk.components.gvzRisk}/100`);
  lines.push(`  VIX Risk: ${risk.components.vixRisk}/100`);
  lines.push(`  Macro Risk: ${risk.components.macroRisk}/100`);
  lines.push(`  Breadth Risk: ${risk.components.breadthRisk}/100`);
  lines.push(`  COT Risk: ${risk.components.cotRisk}/100`);
  lines.push(`  Open Interest Risk: ${risk.components.openInterestRisk}/100`);
  return lines.join("\n");
}

function formatAlignment(alignment: AlignmentResult): string {
  const lines: string[] = [];
  lines.push(`Score: ${alignment.score}/100`);
  lines.push(`Direction: ${alignment.direction}`);
  lines.push(`Strength: ${alignment.strength}`);
  lines.push("Components:");
  lines.push(`  ETF Alignment: ${alignment.components.etfAlignment}/100`);
  lines.push(`  Commercial Alignment: ${alignment.components.commercialAlignment}/100`);
  lines.push(`  Open Interest Alignment: ${alignment.components.openInterestAlignment}/100`);
  lines.push(`  Breadth Alignment: ${alignment.components.breadthAlignment}/100`);
  return lines.join("\n");
}

function formatDecision(decision: DecisionV2Result): string {
  return [
    `Action: ${decision.action}`,
    `Score: ${decision.score}/100`,
    `Bias: ${decision.bias}`,
    `Confidence: ${decision.confidence}/100`,
    `Reasoning:`,
    ...decision.reasoning.map((r) => `  - ${r}`),
  ].join("\n");
}
