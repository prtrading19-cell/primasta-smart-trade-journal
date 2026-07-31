import type { DriverAnalysisObject, DriverBias, DriverStrength } from "@/types/goldResearchConfig";
import type { GoldFullDataset } from "./goldDataOrchestrator";
import type { SectorData, BreadthData, MacroData, ETFData, COTReportData, OpenInterestRecord, VolatilityData } from "@/types/institutional";

const nowISO = () => new Date().toISOString();

function inferBiasFromChange(changePercent: number): { bias: DriverBias; reason: string } {
  if (changePercent > 1) return { bias: "Strong Bullish", reason: `Strong positive movement of ${changePercent.toFixed(2)}%` };
  if (changePercent > 0.3) return { bias: "Bullish", reason: `Positive movement of ${changePercent.toFixed(2)}%` };
  if (changePercent < -1) return { bias: "Strong Bearish", reason: `Strong negative movement of ${changePercent.toFixed(2)}%` };
  if (changePercent < -0.3) return { bias: "Bearish", reason: `Negative movement of ${changePercent.toFixed(2)}%` };
  return { bias: "Neutral", reason: `Flat movement of ${changePercent.toFixed(2)}%` };
}

function inferStrengthFromChange(changePercent: number): DriverStrength {
  const abs = Math.abs(changePercent);
  if (abs > 2) return "Strong";
  if (abs > 0.8) return "Moderate";
  if (abs > 0.2) return "Weak";
  return "None";
}

function buildBase(overrides: Partial<DriverAnalysisObject>): DriverAnalysisObject {
  return {
    driverId: "",
    driverTitle: "",
    categoryId: "",
    bias: "Neutral",
    biasReason: "No data available",
    strength: "None",
    strengthFactors: [],
    confidence: 0,
    confidenceReason: "Data not available",
    technicalObservation: "",
    supportingDrivers: [],
    conflictingDrivers: [],
    reason: "",
    aiExplanation: "",
    source: "composite",
    sourceUrl: "",
    timestamp: nowISO(),
    weight: 1.0,
    contribution: 0,
    dataFields: {},
    ...overrides,
  };
}

function inferBiasFromMacroIndicator(change: number, impact: string): DriverBias {
  const isHighImpact = impact === "High";
  if (change > 0 && isHighImpact) return "Bullish";
  if (change < 0 && isHighImpact) return "Bearish";
  if (Math.abs(change) > 2) return change > 0 ? "Bullish" : "Bearish";
  return "Neutral";
}

function inferBiasFromETF(etf: ETFData): DriverBias {
  const inflows = etf.etfs.filter((e) => e.flowDirection === "Inflow").length;
  const outflows = etf.etfs.filter((e) => e.flowDirection === "Outflow").length;
  if (inflows > outflows) return "Bullish";
  if (outflows > inflows) return "Bearish";
  return "Neutral";
}

function inferBiasFromBreadth(breadth: BreadthData): DriverBias {
  if (breadth.breadthScore >= 70) return "Bullish";
  if (breadth.breadthScore >= 50) return "Neutral";
  if (breadth.breadthScore >= 30) return "Mixed-Wait" as unknown as DriverBias;
  return "Bearish";
}

function inferBiasFromCOT(cot: COTReportData): DriverBias {
  const specNet = cot.nonCommercials.netLong;
  if (specNet > 20000) return "Bearish";
  if (specNet < -20000) return "Bullish";
  if (specNet > 5000) return "Mixed-Wait" as unknown as DriverBias;
  if (specNet < -5000) return "Mixed-Wait" as unknown as DriverBias;
  return "Neutral";
}

function inferBiasFromOI(oi: OpenInterestRecord): DriverBias {
  if (oi.trend === "Rising" && oi.changeFromPrevious > 5000) return "Mixed-Wait" as unknown as DriverBias;
  if (oi.trend === "Falling" && Math.abs(oi.changeFromPrevious) > 5000) return "Mixed-Wait" as unknown as DriverBias;
  return "Neutral";
}

const goldMacroDriverMap: { id: string; title: string; source: string; matchNames: string[] }[] = [
  { id: "gold-fed", title: "Federal Reserve", source: "FRED", matchNames: ["Federal Funds Rate", "US 2Y Treasury Yield", "US 10Y Treasury Yield"] },
  { id: "gold-dxy", title: "DXY", source: "TwelveData", matchNames: ["US Dollar Index"] },
  { id: "gold-treasury-yields", title: "Treasury Yields", source: "TwelveData", matchNames: ["US 10Y Treasury Yield", "US 2Y Treasury Yield"] },
  { id: "gold-inflation", title: "Inflation", source: "FRED", matchNames: ["CPI", "PPI"] },
  { id: "gold-employment", title: "Employment", source: "FRED", matchNames: ["Unemployment Rate", "Non-Farm Payrolls"] },
  { id: "gold-gdp", title: "GDP", source: "FRED", matchNames: ["GDP"] },
  { id: "gold-econ-calendar", title: "Economic Calendar", source: "FRED", matchNames: ["Federal Funds Rate"] },
];

function inferGoldBiasFromMacroTrend(trend: string): DriverBias {
  if (trend === "Improving") return "Bearish";
  if (trend === "Deteriorating") return "Bullish";
  return "Neutral";
}

export function mapGoldDataToEngine(dataset: GoldFullDataset): DriverAnalysisObject[] {
  const drivers: DriverAnalysisObject[] = [];

  if (dataset.meta.status === "live") {
    const priceBias = inferBiasFromChange(dataset.goldChangePercent);
    drivers.push(buildBase({
      driverId: "gold-price", driverTitle: "Gold Price", categoryId: "market-overview",
      bias: priceBias.bias, biasReason: priceBias.reason,
      strength: inferStrengthFromChange(dataset.goldChangePercent),
      confidence: 85, confidenceReason: "Live TwelveData XAU/USD quote",
      technicalObservation: `XAU/USD: $${dataset.goldPrice.toFixed(2)} (${dataset.goldChangePercent >= 0 ? "+" : ""}${dataset.goldChangePercent.toFixed(2)}%)`,
      source: "TwelveData", weight: 1.0, contribution: dataset.goldChangePercent,
      dataFields: { price: String(dataset.goldPrice), change: `${dataset.goldChangePercent.toFixed(2)}%`, high: String(dataset.goldHigh), low: String(dataset.goldLow) },
    }));
  }

  const macro = dataset.macro;
  if (macro && macro.meta.status === "live") {
    for (const m of goldMacroDriverMap) {
      const indicator = macro.indicators.find((i) => m.matchNames.includes(i.name));
      if (indicator) {
        const macroBias = inferBiasFromMacroIndicator(indicator.change, indicator.impact);
        drivers.push(buildBase({
          driverId: m.id, driverTitle: m.title, categoryId: "macro",
          bias: macroBias, biasReason: `${indicator.name}: ${indicator.value} (${indicator.trend})`,
          strength: indicator.impact === "High" ? "Moderate" : "Weak",
          confidence: 75, confidenceReason: "Live macro provider data",
          source: m.source as DriverAnalysisObject["source"], weight: 1.0,
          contribution: indicator.impact === "High" ? (macroBias.includes("Bullish") ? 1.0 : macroBias.includes("Bearish") ? -1.0 : 0) : 0,
          dataFields: { value: String(indicator.value), change: String(indicator.change), trend: indicator.trend, impact: indicator.impact },
        }));
      } else {
        drivers.push(buildBase({
          driverId: m.id, driverTitle: m.title, categoryId: "macro",
          bias: "Neutral", biasReason: "No matching macro indicator available",
          strength: "None", confidence: 20, confidenceReason: "Indicator not found in provider data",
          source: m.source as DriverAnalysisObject["source"], weight: 1.0,
          dataFields: { status: "not_found" },
        }));
      }
    }
  } else {
    for (const m of goldMacroDriverMap) {
      drivers.push(buildBase({
        driverId: m.id, driverTitle: m.title, categoryId: "macro",
        bias: "Neutral", biasReason: "Macro data unavailable",
        strength: "None", confidence: 20, confidenceReason: "Macro provider returned unavailable",
        source: m.source as DriverAnalysisObject["source"], weight: 1.0,
        dataFields: { status: "unavailable" },
      }));
    }
  }

  const volInst = dataset.volatilityInstitutional;
  if (volInst && volInst.meta.status === "live") {
    const gvzBias: DriverBias = (volInst.gvz ?? 0) > 25 ? "Bearish" : (volInst.gvz ?? 0) > 18 ? "Mixed-Wait" as unknown as DriverBias : "Bullish";
    drivers.push(buildBase({
      driverId: "gold-gvz", driverTitle: "GVZ (Gold Volatility)", categoryId: "volatility",
      bias: gvzBias, biasReason: `GVZ at ${volInst.gvz?.toFixed(2) ?? "N/A"}, trend: ${volInst.trend}`,
      strength: volInst.riskRating === "Extreme" || volInst.riskRating === "High" ? "Strong" : "Moderate",
      confidence: 85, confidenceReason: "Live TwelveData GVZ quote",
      source: volInst.meta.source, weight: 1.0, contribution: gvzBias.includes("Bullish") ? 1.0 : -1.0,
      dataFields: { gvz: String(volInst.gvz), trend: volInst.trend },
    }));
    drivers.push(buildBase({
      driverId: "gold-risk-rating", driverTitle: "Risk Rating", categoryId: "volatility",
      bias: volInst.riskRating === "Extreme" || volInst.riskRating === "High" ? "Bearish" : volInst.riskRating === "Moderate" ? "Neutral" : "Bullish",
      biasReason: `Gold vol risk: ${volInst.riskRating}, trend: ${volInst.trend}`,
      strength: volInst.riskRating === "Extreme" ? "Strong" : "Moderate",
      confidence: 80, confidenceReason: "Composite from GVZ/VIX",
      source: "composite", weight: 1.0, contribution: volInst.riskRating === "Extreme" || volInst.riskRating === "High" ? -1.5 : 0,
      dataFields: { riskRating: volInst.riskRating, trend: volInst.trend },
    }));
  }

  const etf = dataset.etf;
  if (etf && etf.meta.status === "live") {
    const etfBias = inferBiasFromETF(etf);
    drivers.push(buildBase({
      driverId: "gold-gld", driverTitle: "GLD Flow", categoryId: "etf-flow",
      bias: etfBias, biasReason: `GLD flow: ${etf.etfs.find((e) => e.symbol === "GLD")?.flowDirection ?? "N/A"}`,
      strength: "Moderate", confidence: 75, confidenceReason: "Live FMP ETF profile data",
      source: etf.meta.source, weight: 1.0, contribution: etfBias.includes("Bullish") ? 1.0 : -1.0,
      dataFields: { gldDirection: etf.etfs.find((e) => e.symbol === "GLD")?.flowDirection ?? "N/A" },
    }));
    drivers.push(buildBase({
      driverId: "gold-iau", driverTitle: "IAU Flow", categoryId: "etf-flow",
      bias: etfBias, biasReason: `IAU flow: ${etf.etfs.find((e) => e.symbol === "IAU")?.flowDirection ?? "N/A"}`,
      strength: "Moderate", confidence: 75, confidenceReason: "Live FMP ETF profile data",
      source: etf.meta.source, weight: 1.0, contribution: 0,
      dataFields: { iauDirection: etf.etfs.find((e) => e.symbol === "IAU")?.flowDirection ?? "N/A" },
    }));
    drivers.push(buildBase({
      driverId: "gold-net-flow", driverTitle: "Net Flow", categoryId: "etf-flow",
      bias: etfBias, biasReason: `Net ETF flow: ${etfBias}`,
      strength: "Weak", confidence: 70, confidenceReason: "Derived from individual ETF flows",
      source: etf.meta.source, weight: 1.0, contribution: etfBias.includes("Bullish") ? 1.0 : etfBias.includes("Bearish") ? -1.0 : 0,
      dataFields: { netFlow: etfBias },
    }));
  } else {
    for (const e of [{ id: "gold-gld", title: "GLD Flow" }, { id: "gold-iau", title: "IAU Flow" }, { id: "gold-net-flow", title: "Net Flow" }]) {
      drivers.push(buildBase({
        driverId: e.id, driverTitle: e.title, categoryId: "etf-flow",
        bias: "Neutral", biasReason: "ETF flow data unavailable",
        strength: "None", confidence: 15, confidenceReason: "ETF provider returned unavailable",
        source: "composite", weight: 1.0, dataFields: { status: "unavailable" },
      }));
    }
  }

  const breadth = dataset.breadth;
  const breadthGold = breadth?.find((b) => b.exchange === "NYSE");
  if (breadthGold && breadthGold.meta.status === "live") {
    const breadthBias = inferBiasFromBreadth(breadthGold);
    drivers.push(buildBase({
      driverId: "gold-ad", driverTitle: "Advance/Decline", categoryId: "breadth",
      bias: breadthBias, biasReason: `A/D ratio: ${breadthGold.aDRatio}`,
      strength: breadthGold.breadthScore >= 70 ? "Moderate" : "Weak",
      confidence: 80, confidenceReason: "Live FMP market breadth data",
      source: breadthGold.meta.source, weight: 1.0, contribution: breadthGold.breadthScore >= 70 ? 1.0 : breadthGold.breadthScore < 30 ? -1.0 : 0,
      dataFields: { advances: String(breadthGold.advances), declines: String(breadthGold.declines) },
    }));
    drivers.push(buildBase({
      driverId: "gold-breadth-score", driverTitle: "Breadth Score", categoryId: "breadth",
      bias: breadthBias, biasReason: `Breadth score: ${breadthGold.breadthScore}`,
      strength: breadthGold.breadthScore >= 70 ? "Moderate" : "None",
      confidence: 85, confidenceReason: "Live FMP market breadth data",
      source: breadthGold.meta.source, weight: 1.0, contribution: breadthGold.breadthScore >= 70 ? 1.0 : breadthGold.breadthScore < 30 ? -1.0 : 0,
      dataFields: { breadthScore: String(breadthGold.breadthScore) },
    }));
  }

  const cot = dataset.cot;
  if (cot && cot.length > 0) {
    const goldCOT = cot.find((c) => c.contractName?.includes("GOLD") || c.contractName?.includes("GC"));
    if (goldCOT && goldCOT.meta.status === "live") {
      const cotBias = inferBiasFromCOT(goldCOT);
      drivers.push(buildBase({
        driverId: "gold-cot", driverTitle: "COT Positioning", categoryId: "cot",
        bias: cotBias, biasReason: `Spec Long: ${goldCOT.nonCommercials.long}, Spec Short: ${goldCOT.nonCommercials.short}, Net: ${goldCOT.nonCommercials.netLong >= 0 ? "+" : ""}${goldCOT.nonCommercials.netLong}`,
        strength: Math.abs(goldCOT.nonCommercials.netLong) > 20000 ? "Strong" : "Moderate",
        confidence: 85, confidenceReason: "Live CFTC COT report data",
        source: goldCOT.meta.source, weight: 1.2, contribution: cotBias.includes("Bullish") ? 1.0 : cotBias.includes("Bearish") ? -1.0 : 0,
        dataFields: { commercialNet: String(goldCOT.commercials.netLong), nonCommercialNet: String(goldCOT.nonCommercials.netLong), openInterest: String(goldCOT.totalOpenInterest) },
      }));
    }
  }

  const oi = dataset.openInterest;
  if (oi && oi.length > 0) {
    const goldOI = oi.find((o) => o.contractName === "GCUSD" || o.contractName?.includes("GOLD") || o.contractName?.includes("GC"));
    if (goldOI && goldOI.meta.status === "live") {
      const oiBias = inferBiasFromOI(goldOI);
      drivers.push(buildBase({
        driverId: "gold-open-interest", driverTitle: "Open Interest", categoryId: "open-interest",
        bias: oiBias, biasReason: `OI: ${goldOI.currentLevel}, Change: ${goldOI.changeFromPrevious >= 0 ? "+" : ""}${goldOI.changeFromPrevious}, Trend: ${goldOI.trend}`,
        strength: Math.abs(goldOI.changeFromPrevious) > 5000 ? "Strong" : "Moderate",
        confidence: 80, confidenceReason: "Live FMP open interest data",
        source: goldOI.meta.source, weight: 1.1, contribution: Math.abs(goldOI.changeFromPrevious) > 5000 ? (goldOI.trend === "Rising" ? 1.0 : -1.0) : 0,
        dataFields: { currentLevel: String(goldOI.currentLevel), change: String(goldOI.changeFromPrevious), trend: goldOI.trend },
      }));
    }
  }

  return drivers;
}

export function buildGoldMacroContext(dataset: GoldFullDataset): string {
  const lines: string[] = [];
  if (dataset.meta.status === "live") {
    const dir = dataset.goldChange >= 0 ? "+" : "";
    lines.push(`XAU/USD: $${dataset.goldPrice.toFixed(2)} (${dir}${dataset.goldChangePercent.toFixed(2)}%)`);
  }
  if (dataset.volatilityInstitutional && dataset.volatilityInstitutional.meta.status === "live") {
    lines.push(`GVZ: ${dataset.volatilityInstitutional.gvz?.toFixed(2) ?? "N/A"} | Risk: ${dataset.volatilityInstitutional.riskRating}`);
  }
  if (dataset.macro && dataset.macro.meta.status === "live") {
    const dxy = dataset.macro.indicators.find((i) => i.name === "US Dollar Index");
    const fedFunds = dataset.macro.indicators.find((i) => i.name === "Federal Funds Rate");
    if (dxy) lines.push(`DXY: ${dxy.value} (${dxy.trend})`);
    if (fedFunds) lines.push(`Fed Funds: ${fedFunds.value}`);
  }
  return lines.join(" | ");
}
