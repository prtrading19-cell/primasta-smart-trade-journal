import type { InstitutionalFlowInput, FlowDirection, FlowMagnitude, PositioningBias, CrowdingLevel, RiskLevel } from "@/types/institutionalFlow";
import type { US100FullDataset } from "./us100DataOrchestrator";
import type { ETFData, COTReportData, MacroData } from "@/types/institutional";

export function buildUS100InstitutionalInput(dataset: US100FullDataset): InstitutionalFlowInput {
  const timestamp = dataset.collectedAt;
  const effectiveIndex = dataset.index.meta.status === "live" ? dataset.index : dataset.derivedIndex;
  const currentPrice = effectiveIndex.meta.status === "live" ? effectiveIndex.price : undefined;

  return {
    currentPrice,
    timestamp,
    etfFlows: deriveEtfFlows(dataset),
    crowdPositioning: deriveCrowdPositioning(dataset),
    positionRisk: derivePositionRisk(dataset),
  };
}

function deriveEtfFlows(dataset: US100FullDataset): InstitutionalFlowInput["etfFlows"] {
  const etf = dataset.etf;
  if (etf && etf.meta.status === "live") {
    const inflowCount = etf.etfs.filter((e) => e.flowDirection === "Inflow").length;
    const outflowCount = etf.etfs.filter((e) => e.flowDirection === "Outflow").length;

    const direction: FlowDirection = inflowCount > outflowCount ? "Inflow"
      : outflowCount > inflowCount ? "Outflow"
      : "Flat";

    const netFlow = inflowCount - outflowCount;
    const magnitude: FlowMagnitude = netFlow >= 2 ? "Heavy"
      : netFlow === 1 ? "Moderate"
      : netFlow === 0 ? "None"
      : "Light";

    return {
      direction,
      magnitude,
      source: etf.meta.source,
      notes: `ETF flows: ${inflowCount} inflows, ${outflowCount} outflows across ${etf.etfs.length} ETFs`,
    };
  }

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
  const cot = dataset.cot;
  if (cot && cot.length > 0) {
    const us100COT = cot.find(
      (c) => c.contractName?.includes("NASDAQ") || c.contractName?.includes("NQ") || c.contractName?.includes("US100")
    );
    if (us100COT && us100COT.meta.status === "live") {
      const specNet = us100COT.nonCommercials.netLong;
      const commercialNet = us100COT.commercials.netLong;

      const retailBias: PositioningBias = specNet > 10000 ? "Net Long"
        : specNet < -10000 ? "Net Short"
        : "Flat";

      const institutionalBias: PositioningBias = commercialNet > 10000 ? "Net Long"
        : commercialNet < -10000 ? "Net Short"
        : "Flat";

      const totalPositions = Math.abs(us100COT.nonCommercials.long) + Math.abs(us100COT.nonCommercials.short);
      let crowdingLevel: CrowdingLevel;
      if (totalPositions > 100000) crowdingLevel = "Extreme";
      else if (totalPositions > 50000) crowdingLevel = "High";
      else if (totalPositions > 20000) crowdingLevel = "Moderate";
      else crowdingLevel = "Low";

      return {
        retailBias,
        institutionalBias,
        crowdingLevel,
        source: us100COT.meta.source,
        notes: `COT: Spec Net ${specNet >= 0 ? "+" : ""}${specNet}, Comm Net ${commercialNet >= 0 ? "+" : ""}${commercialNet}, OI: ${us100COT.totalOpenInterest}`,
      };
    }
  }

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
  const macro = dataset.macro;
  if (macro && macro.meta.status === "live") {
    const vix = dataset.volatilityInstitutional?.vix ?? dataset.volatility.vix ?? 0;
    const fedFunds = macro.indicators.find((i) => i.name === "Federal Funds Rate");
    const cpi = macro.indicators.find((i) => i.name === "CPI");
    const gdp = macro.indicators.find((i) => i.name === "GDP");

    const deterioratingCount = macro.indicators.filter((i) => i.trend === "Deteriorating").length;
    const improvingCount = macro.indicators.filter((i) => i.trend === "Improving").length;

    let level: RiskLevel;
    if (vix > 30 || deterioratingCount >= 3) level = "Extreme";
    else if (vix > 25 || deterioratingCount >= 2) level = "High";
    else if (vix > 20 || deterioratingCount >= 1) level = "Moderate";
    else level = "Low";

    const details: string[] = [];
    if (vix > 0) details.push(`VIX: ${vix.toFixed(2)}`);
    if (fedFunds) details.push(`Fed Funds: ${fedFunds.value}`);
    if (cpi) details.push(`CPI Trend: ${cpi.trend}`);
    if (gdp) details.push(`GDP Trend: ${gdp.trend}`);
    if (deterioratingCount > 0) details.push(`${deterioratingCount} deteriorating indicators`);
    if (improvingCount > 0) details.push(`${improvingCount} improving indicators`);

    return {
      level,
      source: "Macro",
      notes: details.join(" | "),
    };
  }

  const volInst = dataset.volatilityInstitutional;
  const vol = volInst && volInst.meta.status === "live" ? volInst : dataset.volatility;
  if (vol.meta.status !== "live") return undefined;

  const vix = "vix" in vol ? (vol as typeof dataset.volatility).vix ?? 0 : dataset.volatility.vix ?? 0;
  let level: RiskLevel;
  if (vix > 30) level = "Extreme";
  else if (vix > 25) level = "High";
  else if (vix > 20) level = "Moderate";
  else level = "Low";

  return {
    level,
    source: vol.meta.source,
    notes: `VIX: ${vix.toFixed(2)} | Source: ${vol.meta.source}`,
  };
}
