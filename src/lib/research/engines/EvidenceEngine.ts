import type { DecisionContext, EvidenceRecord } from "./types";

export function buildEvidence(context: DecisionContext): EvidenceRecord[] {
  const evidence: EvidenceRecord[] = [];

  addMacroEvidence(evidence, context);
  addVolatilityEvidence(evidence, context);
  addETFEvidence(evidence, context);
  addCOTEvidence(evidence, context);
  addOpenInterestEvidence(evidence, context);
  addBreadthEvidence(evidence, context);
  addMarketStructureEvidence(evidence, context);

  return evidence;
}

function addMacroEvidence(evidence: EvidenceRecord[], context: DecisionContext): void {
  const { macroBias } = context;

  for (const indicator of macroBias.keyIndicators) {
    evidence.push({
      category: "macro",
      provider: macroBias.keyIndicators.length > 0 ? "Macro Provider" : "Unknown",
      value: `${indicator.name}: ${indicator.impact}`,
      interpretation: `Macro indicator ${indicator.name} has a ${indicator.impact} impact on the asset`,
      confidence: macroBias.score,
      bias: macroBias.bias,
      source: "Institutional Research",
    });
  }

  evidence.push({
    category: "macro",
    provider: "Federal Reserve",
    value: `Fed Policy: ${macroBias.fedPolicyImpact}`,
    interpretation: `Monetary policy is ${macroBias.fedPolicyImpact.toLowerCase()}`,
    confidence: 80,
    bias: macroBias.fedPolicyImpact.includes("Accommodative") ? "Bullish" : "Neutral",
    source: "Federal Reserve",
  });

  evidence.push({
    category: "macro",
    provider: "Economic Data",
    value: `Economic Health: ${macroBias.economicHealth}`,
    interpretation: `Economy is ${macroBias.economicHealth.toLowerCase()}`,
    confidence: 75,
    bias: macroBias.economicHealth === "Improving" ? "Bullish" : macroBias.economicHealth === "Deteriorating" ? "Bearish" : "Neutral",
    source: "Economic Indicators",
  });
}

function addVolatilityEvidence(evidence: EvidenceRecord[], context: DecisionContext): void {
  const { technicalRisk } = context;

  evidence.push({
    category: "volatility",
    provider: "VIX",
    value: `VIX: ${technicalRisk.vixLevel.toFixed(2)}`,
    interpretation: `Volatility regime is ${technicalRisk.volatilityRegime} with VIX at ${technicalRisk.vixLevel.toFixed(1)}`,
    confidence: 85,
    bias: technicalRisk.volatilityRegime === "Low" || technicalRisk.volatilityRegime === "Normal" ? "Bullish" : "Bearish",
    source: "CBOE",
  });

  if (technicalRisk.gvzLevel !== undefined && technicalRisk.gvzLevel !== null) {
    evidence.push({
      category: "volatility",
      provider: "GVZ",
      value: `GVZ: ${technicalRisk.gvzLevel.toFixed(2)}`,
      interpretation: `Gold volatility (GVZ) at ${technicalRisk.gvzLevel.toFixed(1)}`,
      confidence: 85,
      bias: technicalRisk.gvzLevel < 20 ? "Bullish" : "Bearish",
      source: "CBOE",
    });
  }
}

function addETFEvidence(evidence: EvidenceRecord[], context: DecisionContext): void {
  const { institutionalPositioning } = context;

  if (institutionalPositioning.etfDirection === "Unknown") return;

  evidence.push({
    category: "etf-flows",
    provider: "ETF Flow Data",
    value: `ETF Flow Direction: ${institutionalPositioning.etfDirection}`,
    interpretation: `ETF flows indicate ${institutionalPositioning.etfDirection.toLowerCase()} of positions`,
    confidence: 70,
    bias: institutionalPositioning.etfDirection === "Accumulation" ? "Bullish" : institutionalPositioning.etfDirection === "Distribution" ? "Bearish" : "Neutral",
    source: "ETF Provider",
  });
}

function addCOTEvidence(evidence: EvidenceRecord[], context: DecisionContext): void {
  const { institutionalPositioning } = context;

  if (institutionalPositioning.commercialPositioning === "Unknown") return;

  evidence.push({
    category: "cot",
    provider: "CFTC COT Report",
    value: `Commercials: ${institutionalPositioning.commercialPositioning}`,
    interpretation: `Commercial traders are ${institutionalPositioning.commercialPositioning.toLowerCase()} in the futures market`,
    confidence: 75,
    bias: institutionalPositioning.commercialPositioning === "Net Long" ? "Bullish" : institutionalPositioning.commercialPositioning === "Net Short" ? "Bearish" : "Neutral",
    source: "CFTC",
  });

  evidence.push({
    category: "cot",
    provider: "CFTC COT Report",
    value: `Speculators: ${institutionalPositioning.speculatorPositioning}`,
    interpretation: `Speculative traders are ${institutionalPositioning.speculatorPositioning.toLowerCase()}`,
    confidence: 70,
    bias: "Neutral",
    source: "CFTC",
  });

  evidence.push({
    category: "cot",
    provider: "CFTC COT Report",
    value: `Crowding Level: ${institutionalPositioning.crowdingLevel}`,
    interpretation: `Position crowding is ${institutionalPositioning.crowdingLevel.toLowerCase()}`,
    confidence: 70,
    bias: institutionalPositioning.crowdingLevel === "Extreme" || institutionalPositioning.crowdingLevel === "High" ? "Bearish" : "Neutral",
    source: "CFTC",
  });
}

function addOpenInterestEvidence(evidence: EvidenceRecord[], context: DecisionContext): void {
  const { liquidity } = context;

  if (liquidity.openInterestTrend === "Unknown") return;

  evidence.push({
    category: "open-interest",
    provider: "Open Interest Data",
    value: `OI Trend: ${liquidity.openInterestTrend} (Change: ${liquidity.openInterestChange})`,
    interpretation: `Open interest is ${liquidity.openInterestTrend.toLowerCase()} indicating ${liquidity.openInterestTrend === "Rising" ? "increasing" : "decreasing"} market participation`,
    confidence: 70,
    bias: liquidity.openInterestTrend === "Rising" ? "Bullish" : liquidity.openInterestTrend === "Falling" ? "Bearish" : "Neutral",
    source: "Exchange Data",
  });
}

function addBreadthEvidence(evidence: EvidenceRecord[], context: DecisionContext): void {
  const { marketParticipation } = context;

  if (marketParticipation.breadthRatio === 0) return;

  evidence.push({
    category: "breadth",
    provider: "Market Breadth",
    value: `Advancers: ${marketParticipation.advancingStocks}, Decliners: ${marketParticipation.decliningStocks}, Ratio: ${marketParticipation.breadthRatio.toFixed(2)}`,
    interpretation: marketParticipation.assessment,
    confidence: 75,
    bias: marketParticipation.breadthRatio > 1.2 ? "Bullish" : marketParticipation.breadthRatio < 0.8 ? "Bearish" : "Neutral",
    source: "Market Data",
  });
}

function addMarketStructureEvidence(evidence: EvidenceRecord[], context: DecisionContext): void {
  const { marketStructure } = context;

  evidence.push({
    category: "market-structure",
    provider: "Sector Analysis",
    value: `Sector Rotation: ${marketStructure.sectorRotation}`,
    interpretation: `Sector rotation detected: ${marketStructure.sectorRotation.toLowerCase().replace(/_/g, " ")}`,
    confidence: 70,
    bias: marketStructure.sectorRotation === "Rotation Into" ? "Bullish" : marketStructure.sectorRotation === "Rotation Out Of" ? "Bearish" : "Neutral",
    source: "Sector Data",
  });

  if (marketStructure.dominantSectors.length > 0) {
    evidence.push({
      category: "market-structure",
      provider: "Leading Sectors",
      value: `Leading: ${marketStructure.dominantSectors.join(", ")}`,
      interpretation: `Dominant sectors driving market action: ${marketStructure.dominantSectors.join(", ")}`,
      confidence: 70,
      bias: "Neutral",
      source: "Sector Data",
    });
  }
}
