import type { InstitutionalFlowInput, FlowDirection, FlowMagnitude, PositioningBias, CrowdingLevel, RiskLevel } from "@/types/institutionalFlow";
import type { US100FullDataset } from "./us100DataOrchestrator";

export function buildUS100InstitutionalInput(dataset: US100FullDataset): InstitutionalFlowInput {
  const timestamp = dataset.collectedAt;
  const currentPrice = dataset.index.meta.status === "live" ? dataset.index.price : undefined;

  return {
    currentPrice,
    timestamp,
    etfFlows: deriveEtfFlows(dataset),
    crowdPositioning: deriveCrowdPositioning(dataset),
    positionRisk: derivePositionRisk(dataset),
  };
}

function deriveEtfFlows(dataset: US100FullDataset): InstitutionalFlowInput["etfFlows"] {
  if (dataset.sectors.meta.status !== "live") return undefined;

  const sectorChanges = [
    dataset.sectors.technology,
    dataset.sectors.semiconductors,
    dataset.sectors.financials,
    dataset.sectors.healthcare,
    dataset.sectors.energy,
    dataset.sectors.industrials,
    dataset.sectors.utilities,
    dataset.sectors.consumer,
    dataset.sectors.communication,
  ].filter((v) => typeof v === "number");

  if (sectorChanges.length === 0) return undefined;

  const positiveCount = sectorChanges.filter((c) => c > 0.1).length;
  const negativeCount = sectorChanges.filter((c) => c < -0.1).length;
  const avgChange = sectorChanges.reduce((s, c) => s + c, 0) / sectorChanges.length;

  const direction: FlowDirection = positiveCount > negativeCount ? "Inflow"
    : negativeCount > positiveCount ? "Outflow"
    : "Flat";

  const absAvg = Math.abs(avgChange);
  const magnitude: FlowMagnitude = absAvg > 1.0 ? "Heavy"
    : absAvg > 0.3 ? "Moderate"
    : absAvg > 0.05 ? "Light"
    : "None";

  return {
    direction,
    magnitude,
    source: dataset.sectors.meta.source,
    notes: `Derived from ${sectorChanges.length} sector ETFs. Positive: ${positiveCount}, Negative: ${negativeCount}, Avg: ${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%`,
  };
}

function deriveCrowdPositioning(dataset: US100FullDataset): InstitutionalFlowInput["crowdPositioning"] {
  const liveStocks = dataset.stocks.filter((s) => s.meta.status === "live");
  if (liveStocks.length === 0) return undefined;

  const bullishCount = liveStocks.filter((s) => s.changePercent > 0.5).length;
  const bearishCount = liveStocks.filter((s) => s.changePercent < -0.5).length;
  const total = liveStocks.length;
  const agreement = Math.max(bullishCount, bearishCount) / total;

  const retailBias: PositioningBias = bullishCount > bearishCount ? "Net Long"
    : bearishCount > bullishCount ? "Net Short"
    : "Flat";

  const institutionalBias: PositioningBias = retailBias;

  let crowdingLevel: CrowdingLevel;
  if (agreement >= 0.8) crowdingLevel = "Extreme";
  else if (agreement >= 0.65) crowdingLevel = "High";
  else if (agreement >= 0.5) crowdingLevel = "Moderate";
  else crowdingLevel = "Low";

  return {
    retailBias,
    institutionalBias,
    crowdingLevel,
    source: "Twelve Data",
    notes: `Mega cap consensus: ${bullishCount}/${total} bullish, ${bearishCount}/${total} bearish`,
  };
}

function derivePositionRisk(dataset: US100FullDataset): InstitutionalFlowInput["positionRisk"] {
  const vol = dataset.volatility;
  if (vol.meta.status !== "live") return undefined;

  const vix = vol.vix ?? 0;
  let level: RiskLevel;
  if (vix > 30) level = "Extreme";
  else if (vix > 25) level = "High";
  else if (vix > 20) level = "Moderate";
  else level = "Low";

  return {
    level,
    source: vol.meta.source,
    notes: `VIX: ${vix.toFixed(2)} | VXN: ${vol.vxn?.toFixed(2) ?? "N/A"} | Risk Rating: ${vol.riskRating}`,
  };
}
