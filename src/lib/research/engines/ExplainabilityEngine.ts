import type { DecisionContext, ConfidenceResult, AlignmentResult, RiskResult, DecisionV2Result, ExplainabilityResult, ProviderAgreement, ProviderDisagreement } from "./types";

export interface ExplainabilityInput {
  context: DecisionContext;
  confidence: ConfidenceResult;
  alignment: AlignmentResult;
  risk: RiskResult;
  decision: DecisionV2Result;
}

export function buildExplainability(input: ExplainabilityInput): ExplainabilityResult {
  const reasoningChain = buildReasoningChain(input);
  const providersAgreed = identifyAgreedProviders(input);
  const providersDisagreed = identifyDisagreedProviders(input);
  const missingProviders = identifyMissingProviders(input);

  const confidenceStatement = buildConfidenceStatement(input);
  const alignmentStatement = buildAlignmentStatement(input);
  const riskStatement = buildRiskStatement(input);

  return {
    reasoningChain,
    providersAgreed,
    providersDisagreed,
    missingProviders,
    confidenceStatement,
    alignmentStatement,
    riskStatement,
  };
}

function buildReasoningChain(input: ExplainabilityInput): string[] {
  const chain: string[] = [];
  const { context, decision } = input;

  chain.push("=== DECISION REASONING CHAIN ===");
  chain.push(`Step 1: Aggregate institutional data — ${providerCount(context)} of 7 provider categories available`);
  chain.push(`Step 2: Market structure assessment — ${context.marketStructure.trend} (strength: ${context.marketStructure.strength}/100)`);
  chain.push(`Step 3: Institutional positioning — ${context.institutionalPositioning.positioningScore >= 0 ? "Net Long" : "Net Short"} (score: ${context.institutionalPositioning.positioningScore})`);
  chain.push(`Step 4: Macro analysis — ${context.macroBias.bias} (${context.macroBias.score}/100), economy ${context.macroBias.economicHealth}, Fed ${context.macroBias.fedPolicyImpact}`);
  chain.push(`Step 5: Volatility assessment — ${context.technicalRisk.volatilityRegime} regime (VIX: ${context.technicalRisk.vixLevel.toFixed(1)}, GVZ: ${context.technicalRisk.gvzLevel?.toFixed(1) ?? "N/A"})`);
  chain.push(`Step 6: Liquidity check — ${context.liquidity.openInterestTrend} OI, ${context.liquidity.assessment}`);
  chain.push(`Step 7: Market participation — ${context.marketParticipation.assessment}`);
  chain.push(`Step 8: Alignment evaluation — ${input.alignment.score}/100 (${input.alignment.strength} ${input.alignment.direction})`);
  chain.push(`Step 9: Confidence evaluation — ${input.confidence.score}/100 (${input.confidence.level})`);
  chain.push(`Step 10: Risk evaluation — ${input.risk.score}/100 (${input.risk.class})`);
  chain.push(`Step 11: Final decision — ${decision.action} at score ${decision.score}/100`);
  chain.push(`Step 12: Explanation — ${decision.reasoning[decision.reasoning.length - 1] ?? ""}`);

  return chain;
}

function providerCount(context: DecisionContext): number {
  let count = 0;
  if (context.macroBias.keyIndicators.length > 0) count++;
  if (context.technicalRisk.vixLevel > 0) count++;
  if (context.institutionalPositioning.etfDirection !== "Unknown") count++;
  if (context.institutionalPositioning.commercialPositioning !== "Unknown") count++;
  if (context.liquidity.openInterestTrend !== "Unknown") count++;
  if (context.marketParticipation.breadthRatio > 0) count++;
  if (context.marketStructure.dominantSectors.length > 0) count++;
  return count;
}

function identifyAgreedProviders(input: ExplainabilityInput): ProviderAgreement[] {
  const agreed: ProviderAgreement[] = [];
  const { context, decision } = input;

  const bullish = decision.bias.includes("Bullish");
  const bearish = decision.bias.includes("Bearish");

  const macroBullish = context.macroBias.bias.includes("Bullish");
  const macroBearish = context.macroBias.bias.includes("Bearish");
  if ((bullish && macroBullish) || (bearish && macroBearish)) {
    agreed.push({
      providerId: "macro",
      bias: context.macroBias.bias,
      confidence: context.macroBias.score,
      weight: 0.25,
    });
  }

  const etfBullish = context.institutionalPositioning.etfDirection === "Accumulation";
  const etfBearish = context.institutionalPositioning.etfDirection === "Distribution";
  if ((bullish && etfBullish) || (bearish && etfBearish)) {
    agreed.push({
      providerId: "etf",
      bias: etfBullish ? "Bullish" : "Bearish",
      confidence: 70,
      weight: 0.15,
    });
  }

  const commercialBullish = context.institutionalPositioning.commercialPositioning === "Net Long";
  const commercialBearish = context.institutionalPositioning.commercialPositioning === "Net Short";
  if ((bullish && commercialBullish) || (bearish && commercialBearish)) {
    agreed.push({
      providerId: "cot",
      bias: commercialBullish ? "Bullish" : "Bearish",
      confidence: 75,
      weight: 0.20,
    });
  }

  const breadthPositive = context.marketParticipation.participationScore >= 50;
  if ((bullish && breadthPositive) || (bearish && !breadthPositive)) {
    agreed.push({
      providerId: "breadth",
      bias: breadthPositive ? "Bullish" : "Bearish",
      confidence: 65,
      weight: 0.10,
    });
  }

  return agreed;
}

function identifyDisagreedProviders(input: ExplainabilityInput): ProviderDisagreement[] {
  const disagreed: ProviderDisagreement[] = [];
  const { context, decision } = input;

  const bullish = decision.bias.includes("Bullish");
  const bearish = decision.bias.includes("Bearish");

  const macroBullish = context.macroBias.bias.includes("Bullish");
  const macroBearish = context.macroBias.bias.includes("Bearish");
  if ((bullish && macroBearish) || (bearish && macroBullish)) {
    disagreed.push({
      providerId: "macro",
      bias: context.macroBias.bias,
      confidence: context.macroBias.score,
      reason: `Macro bias ${context.macroBias.bias} conflicts with overall decision bias ${decision.bias}`,
    });
  }

  const etfBullish = context.institutionalPositioning.etfDirection === "Accumulation";
  const etfBearish = context.institutionalPositioning.etfDirection === "Distribution";
  if ((bullish && etfBearish) || (bearish && etfBullish)) {
    disagreed.push({
      providerId: "etf",
      bias: etfBullish ? "Bullish" : "Bearish",
      confidence: 70,
      reason: `ETF flows show ${context.institutionalPositioning.etfDirection} against overall direction`,
    });
  }

  const commercialBullish = context.institutionalPositioning.commercialPositioning === "Net Long";
  const commercialBearish = context.institutionalPositioning.commercialPositioning === "Net Short";
  if ((bullish && commercialBearish) || (bearish && commercialBullish)) {
    disagreed.push({
      providerId: "cot",
      bias: commercialBullish ? "Bullish" : "Bearish",
      confidence: 75,
      reason: `Commercials are ${context.institutionalPositioning.commercialPositioning} against overall direction`,
    });
  }

  return disagreed;
}

function identifyMissingProviders(input: ExplainabilityInput): string[] {
  const missing: string[] = [];
  const { context } = input;

  if (context.macroBias.keyIndicators.length === 0) missing.push("macro");
  if (context.institutionalPositioning.etfDirection === "Unknown") missing.push("etf");
  if (context.institutionalPositioning.commercialPositioning === "Unknown") missing.push("cot");
  if (context.liquidity.openInterestTrend === "Unknown") missing.push("open-interest");
  if (context.marketParticipation.breadthRatio === 0) missing.push("breadth");
  if (context.marketStructure.dominantSectors.length === 0) missing.push("sectors");
  if (context.technicalRisk.gvzLevel === undefined || context.technicalRisk.gvzLevel === null) missing.push("gvz");

  return missing;
}

function buildConfidenceStatement(input: ExplainabilityInput): string {
  const { confidence } = input;
  const missing = identifyMissingProviders(input);

  let statement = `Confidence: ${confidence.score}/100 (${confidence.level}). `;

  if (missing.length > 0) {
    statement += `Data gaps in: ${missing.join(", ")}. `;
  }

  if (confidence.level === "Very High" || confidence.level === "High") {
    statement += "Sufficient cross-provider agreement to support decision.";
  } else if (confidence.level === "Moderate") {
    statement += "Additional data needed for higher conviction.";
  } else {
    statement += "Low conviction — consider waiting for confirmation.";
  }

  return statement;
}

function buildAlignmentStatement(input: ExplainabilityInput): string {
  const { alignment } = input;

  let statement = `Alignment: ${alignment.score}/100 (${alignment.strength} ${alignment.direction}). `;

  if (alignment.score >= 75) {
    statement += "Strong institutional consensus across all measured categories.";
  } else if (alignment.score >= 50) {
    statement += "Moderate agreement with some divergence in specific categories.";
  } else if (alignment.score >= 25) {
    statement += "Weak alignment — institutional signals are mixed.";
  } else {
    statement += "No meaningful institutional alignment detected.";
  }

  return statement;
}

function buildRiskStatement(input: ExplainabilityInput): string {
  const { risk } = input;

  let statement = `Risk score: ${risk.score}/100 (${risk.class}). `;

  if (risk.class === "Extreme" || risk.class === "High") {
    statement += "Elevated risk environment — position sizing should be reduced.";
  } else if (risk.class === "Elevated") {
    statement += "Above-average risk — maintain prudent risk management.";
  } else if (risk.class === "Moderate") {
    statement += "Normal risk conditions.";
  } else {
    statement += "Low risk environment — favorable for position entry.";
  }

  return statement;
}
