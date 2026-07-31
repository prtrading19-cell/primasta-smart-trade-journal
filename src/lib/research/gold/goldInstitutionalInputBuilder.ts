import type { InstitutionalFlowInput, FlowDirection, FlowMagnitude, PositioningBias, CrowdingLevel, RiskLevel } from "@/types/institutionalFlow";
import type { GoldFullDataset } from "./goldDataOrchestrator";

export function buildGoldInstitutionalInput(dataset: GoldFullDataset): InstitutionalFlowInput {
  const timestamp = dataset.collectedAt;
  const currentPrice = dataset.meta.status === "live" ? dataset.goldPrice : undefined;

  return {
    currentPrice,
    timestamp,
    etfFlows: deriveEtfFlows(dataset),
    crowdPositioning: deriveCrowdPositioning(dataset),
    positionRisk: derivePositionRisk(dataset),
  };
}

function deriveEtfFlows(dataset: GoldFullDataset): InstitutionalFlowInput["etfFlows"] {
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
      notes: `Gold ETF flows: ${inflowCount} inflows, ${outflowCount} outflows across ${etf.etfs.length} ETFs`,
    };
  }

  return undefined;
}

function deriveCrowdPositioning(dataset: GoldFullDataset): InstitutionalFlowInput["crowdPositioning"] {
  const cot = dataset.cot;
  if (cot && cot.length > 0) {
    const goldCOT = cot.find(
      (c) => c.contractName?.includes("GOLD") || c.contractName?.includes("GC")
    );
    if (goldCOT && goldCOT.meta.status === "live") {
      const specNet = goldCOT.nonCommercials.netLong;
      const commercialNet = goldCOT.commercials.netLong;

      const retailBias: PositioningBias = specNet > 5000 ? "Net Long"
        : specNet < -5000 ? "Net Short"
        : "Flat";

      const institutionalBias: PositioningBias = commercialNet > 5000 ? "Net Long"
        : commercialNet < -5000 ? "Net Short"
        : "Flat";

      const totalPositions = Math.abs(goldCOT.nonCommercials.long) + Math.abs(goldCOT.nonCommercials.short);
      let crowdingLevel: CrowdingLevel;
      if (totalPositions > 80000) crowdingLevel = "Extreme";
      else if (totalPositions > 40000) crowdingLevel = "High";
      else if (totalPositions > 15000) crowdingLevel = "Moderate";
      else crowdingLevel = "Low";

      return {
        retailBias,
        institutionalBias,
        crowdingLevel,
        source: goldCOT.meta.source,
        notes: `COT: Spec Net ${specNet >= 0 ? "+" : ""}${specNet}, Comm Net ${commercialNet >= 0 ? "+" : ""}${commercialNet}, OI: ${goldCOT.totalOpenInterest}`,
      };
    }
  }

  return undefined;
}

function derivePositionRisk(dataset: GoldFullDataset): InstitutionalFlowInput["positionRisk"] {
  const macro = dataset.macro;
  if (macro && macro.meta.status === "live") {
    const gvz = dataset.volatilityInstitutional?.gvz ?? 0;
    const deterioratingCount = macro.indicators.filter((i) => i.trend === "Deteriorating").length;

    let level: RiskLevel;
    if (gvz > 30 || deterioratingCount >= 3) level = "Extreme";
    else if (gvz > 25 || deterioratingCount >= 2) level = "High";
    else if (gvz > 18 || deterioratingCount >= 1) level = "Moderate";
    else level = "Low";

    const details: string[] = [];
    if (gvz > 0) details.push(`GVZ: ${gvz.toFixed(2)}`);
    if (deterioratingCount > 0) details.push(`${deterioratingCount} deteriorating indicators`);

    return {
      level,
      source: "Macro",
      notes: details.join(" | "),
    };
  }

  const volInst = dataset.volatilityInstitutional;
  if (volInst && volInst.meta.status === "live") {
    const gvz = volInst.gvz ?? 0;
    let level: RiskLevel;
    if (gvz > 30) level = "Extreme";
    else if (gvz > 25) level = "High";
    else if (gvz > 18) level = "Moderate";
    else level = "Low";

    return {
      level,
      source: volInst.meta.source,
      notes: `GVZ: ${gvz.toFixed(2)}`,
    };
  }

  return undefined;
}
