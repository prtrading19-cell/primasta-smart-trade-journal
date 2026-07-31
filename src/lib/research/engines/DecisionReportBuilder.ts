import type { DecisionContext, EvidenceRecord, ConfidenceResult, AlignmentResult, RiskResult, DecisionV2Result, ExplainabilityResult, DecisionReport, DecisionReportSection } from "./types";

export interface DecisionReportInput {
  context: DecisionContext;
  evidence: EvidenceRecord[];
  confidence: ConfidenceResult;
  alignment: AlignmentResult;
  risk: RiskResult;
  decision: DecisionV2Result;
  explainability: ExplainabilityResult;
  assetLabel: string;
  generatedAt: string;
}

export function buildDecisionReport(input: DecisionReportInput): DecisionReport {
  const executiveSummary = buildExecutiveSummary(input);
  const institutionalPositioning = buildInstitutionalPositioningSection(input);
  const macroOutlook = buildMacroOutlookSection(input);
  const liquidity = buildLiquiditySection(input);
  const risk = buildRiskSection(input);
  const confidence = buildConfidenceSection(input);
  const alignment = buildAlignmentSection(input);
  const recommendation = buildRecommendationSection(input);

  const missingData = input.explainability.missingProviders;

  return {
    executiveSummary,
    institutionalPositioning,
    macroOutlook,
    liquidity,
    risk,
    confidence,
    alignment,
    recommendation,
    evidence: input.evidence,
    missingData,
    generatedAt: input.generatedAt,
  };
}

function buildExecutiveSummary(input: DecisionReportInput): string {
  const { context, decision, confidence, risk, alignment } = input;

  const parts: string[] = [];
  parts.push(`ASSET: ${input.assetLabel}`);
  parts.push(`RECOMMENDATION: ${decision.action} (Score: ${decision.score}/100)`);
  parts.push(`MARKET STRUCTURE: ${context.marketStructure.trend} (Strength: ${context.marketStructure.strength}/100)`);
  parts.push(`INSTITUTIONAL BIAS: ${context.institutionalPositioning.positioningScore >= 0 ? "Net Long" : "Net Short"} (Score: ${context.institutionalPositioning.positioningScore})`);
  parts.push(`MACRO: ${context.macroBias.bias} — Economy ${context.macroBias.economicHealth}, Fed ${context.macroBias.fedPolicyImpact}`);
  parts.push(`VOLATILITY: ${context.technicalRisk.volatilityRegime} (VIX: ${context.technicalRisk.vixLevel.toFixed(1)})`);
  parts.push(`CONFIDENCE: ${confidence.score}/100 (${confidence.level})`);
  parts.push(`RISK: ${risk.score}/100 (${risk.class})`);
  parts.push(`ALIGNMENT: ${alignment.score}/100 (${alignment.strength} ${alignment.direction})`);

  const { explainability } = input;
  const agreed = explainability.providersAgreed.length;
  const disagreed = explainability.providersDisagreed.length;
  const missing = explainability.missingProviders.length;

  parts.push(`PROVIDERS: ${agreed} agreed, ${disagreed} disagreed, ${missing} missing`);

  return parts.join(" | ");
}

function buildInstitutionalPositioningSection(input: DecisionReportInput): DecisionReportSection {
  const { institutionalPositioning } = input.context;

  return {
    title: "Institutional Positioning",
    content: buildPositioningContent(institutionalPositioning),
    data: { positioning: institutionalPositioning } as Record<string, unknown>,
  };
}

function buildPositioningContent(pos: DecisionContext["institutionalPositioning"]): string {
  const lines: string[] = [];
  lines.push(`ETF Flows: ${pos.etfDirection}`);
  lines.push(`Commercial Positioning: ${pos.commercialPositioning}`);
  lines.push(`Speculator Positioning: ${pos.speculatorPositioning}`);
  lines.push(`Net Positioning Score: ${pos.positioningScore >= 0 ? "+" : ""}${pos.positioningScore}`);
  lines.push(`Crowding Level: ${pos.crowdingLevel}`);
  return lines.join("\n");
}

function buildMacroOutlookSection(input: DecisionReportInput): DecisionReportSection {
  const { macroBias } = input.context;

  return {
    title: "Macro Outlook",
    content: buildMacroContent(macroBias, input),
    data: { macro: macroBias } as Record<string, unknown>,
  };
}

function buildMacroContent(macro: DecisionContext["macroBias"], input: DecisionReportInput): string {
  const lines: string[] = [];
  lines.push(`Macro Bias: ${macro.bias} (Score: ${macro.score}/100)`);
  lines.push(`Economic Health: ${macro.economicHealth}`);
  lines.push(`Fed Policy Impact: ${macro.fedPolicyImpact}`);

  for (const indicator of macro.keyIndicators) {
    lines.push(`- ${indicator.name}: ${indicator.impact}`);
  }

  const volEvidence = input.evidence.filter((e) => e.category === "volatility");
  if (volEvidence.length > 0) {
    lines.push("");
    lines.push("Volatility Evidence:");
    for (const e of volEvidence) {
      lines.push(`- ${e.provider}: ${e.value} — ${e.interpretation}`);
    }
  }

  return lines.join("\n");
}

function buildLiquiditySection(input: DecisionReportInput): DecisionReportSection {
  const { liquidity } = input.context;

  return {
    title: "Liquidity Assessment",
    content: buildLiquidityContent(liquidity),
    data: { liquidity } as Record<string, unknown>,
  };
}

function buildLiquidityContent(liquidity: DecisionContext["liquidity"]): string {
  const lines: string[] = [];
  lines.push(`Open Interest Trend: ${liquidity.openInterestTrend}`);
  lines.push(`OI Change: ${liquidity.openInterestChange >= 0 ? "+" : ""}${liquidity.openInterestChange}`);
  lines.push(`Volume Participation: ${liquidity.volumeParticipation}/100`);
  lines.push(`Liquidity Score: ${liquidity.liquidityScore}/100`);
  lines.push(`Assessment: ${liquidity.assessment}`);
  return lines.join("\n");
}

function buildRiskSection(input: DecisionReportInput): DecisionReportSection {
  const { risk } = input;

  return {
    title: "Risk Assessment",
    content: buildRiskContent(input),
    data: { risk } as Record<string, unknown>,
  };
}

function buildRiskContent(input: DecisionReportInput): string {
  const { risk, context } = input;
  const lines: string[] = [];
  lines.push(`Risk Score: ${risk.score}/100`);
  lines.push(`Risk Class: ${risk.class}`);
  lines.push("");
  lines.push("Component Breakdown:");
  lines.push(`  GVZ: ${risk.components.gvzRisk}/100`);
  lines.push(`  VIX: ${risk.components.vixRisk}/100`);
  lines.push(`  Macro: ${risk.components.macroRisk}/100`);
  lines.push(`  Breadth: ${risk.components.breadthRisk}/100`);
  lines.push(`  COT Crowding: ${risk.components.cotRisk}/100`);
  lines.push(`  Open Interest: ${risk.components.openInterestRisk}/100`);
  lines.push("");
  lines.push(`Volatility Regime: ${context.technicalRisk.volatilityRegime}`);
  lines.push(input.explainability.riskStatement);
  return lines.join("\n");
}

function buildConfidenceSection(input: DecisionReportInput): DecisionReportSection {
  const { confidence } = input;

  return {
    title: "Confidence Assessment",
    content: buildConfidenceContent(input),
    data: { confidence } as Record<string, unknown>,
  };
}

function buildConfidenceContent(input: DecisionReportInput): string {
  const { confidence, explainability } = input;
  const lines: string[] = [];
  lines.push(`Confidence Score: ${confidence.score}/100`);
  lines.push(`Confidence Level: ${confidence.level}`);
  lines.push("");
  lines.push("Components:");
  lines.push(`  Provider Freshness: ${confidence.components.providerFreshness}/100`);
  lines.push(`  Provider Agreement: ${confidence.components.providerAgreement}/100`);
  lines.push(`  Provider Availability: ${confidence.components.providerAvailability}/100`);
  lines.push(`  Signal Quality: ${confidence.components.signalQuality}/100`);
  lines.push(`  Conflict Penalty: ${confidence.components.conflictPenalty}`);
  lines.push(`  Historical Consistency: ${confidence.components.historicalConsistency}/100`);
  lines.push("");
  lines.push(explainability.confidenceStatement);

  if (explainability.missingProviders.length > 0) {
    lines.push("");
    lines.push("Data Gaps (reducing confidence):");
    for (const p of explainability.missingProviders) {
      lines.push(`  - ${p}`);
    }
  }

  return lines.join("\n");
}

function buildAlignmentSection(input: DecisionReportInput): DecisionReportSection {
  const { alignment } = input;

  return {
    title: "Institutional Alignment",
    content: buildAlignmentContent(input),
    data: { alignment } as Record<string, unknown>,
  };
}

function buildAlignmentContent(input: DecisionReportInput): string {
  const { alignment, explainability } = input;
  const lines: string[] = [];
  lines.push(`Alignment Score: ${alignment.score}/100`);
  lines.push(`Direction: ${alignment.direction}`);
  lines.push(`Strength: ${alignment.strength}`);
  lines.push("");
  lines.push("Component Breakdown:");
  lines.push(`  ETF Flow Alignment: ${alignment.components.etfAlignment}/100`);
  lines.push(`  Commercial Alignment: ${alignment.components.commercialAlignment}/100`);
  lines.push(`  Open Interest Alignment: ${alignment.components.openInterestAlignment}/100`);
  lines.push(`  Breadth Alignment: ${alignment.components.breadthAlignment}/100`);
  lines.push("");
  lines.push(explainability.alignmentStatement);

  if (explainability.providersAgreed.length > 0) {
    lines.push("");
    lines.push("Providers in Agreement:");
    for (const p of explainability.providersAgreed) {
      lines.push(`  - ${p.providerId} (${p.bias}, confidence: ${p.confidence})`);
    }
  }

  if (explainability.providersDisagreed.length > 0) {
    lines.push("");
    lines.push("Providers in Disagreement:");
    for (const p of explainability.providersDisagreed) {
      lines.push(`  - ${p.providerId} (${p.bias}, reason: ${p.reason})`);
    }
  }

  return lines.join("\n");
}

function buildRecommendationSection(input: DecisionReportInput): DecisionReportSection {
  const { decision, explainability } = input;

  return {
    title: "Recommendation",
    content: buildRecommendationContent(input),
    data: { decision: decision, explainability: explainability } as Record<string, unknown>,
  };
}

function buildRecommendationContent(input: DecisionReportInput): string {
  const { decision, explainability } = input;
  const lines: string[] = [];

  lines.push(`Action: ${decision.action}`);
  lines.push(`Bias: ${decision.bias}`);
  lines.push(`Score: ${decision.score}/100`);
  lines.push(`Confidence: ${decision.confidence}/100`);
  lines.push("");
  lines.push("Reasoning Chain:");
  for (let i = 0; i < decision.reasoning.length; i++) {
    lines.push(`  ${i + 1}. ${decision.reasoning[i]}`);
  }
  lines.push("");
  lines.push(explainability.confidenceStatement);
  lines.push(explainability.alignmentStatement);
  lines.push(explainability.riskStatement);

  return lines.join("\n");
}
