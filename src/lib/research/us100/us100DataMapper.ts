import type { DriverAnalysisObject, DriverBias, DriverStrength } from "@/types/goldResearchConfig";
import type { US100FullDataset } from "./us100DataOrchestrator";
import { getProfile } from "@/lib/research";
import type { SectorData, BreadthData, MacroData, ETFData, COTReportData, OpenInterestRecord, VolatilityData } from "@/types/institutional";

const nowISO = () => new Date().toISOString();

function inferBiasFromChange(changePercent: number): { bias: DriverBias; reason: string } {
  if (changePercent > 2) return { bias: "Strong Bullish", reason: `Strong positive movement of ${changePercent.toFixed(2)}%` };
  if (changePercent > 0.5) return { bias: "Bullish", reason: `Positive movement of ${changePercent.toFixed(2)}%` };
  if (changePercent < -2) return { bias: "Strong Bearish", reason: `Strong negative movement of ${changePercent.toFixed(2)}%` };
  if (changePercent < -0.5) return { bias: "Bearish", reason: `Negative movement of ${changePercent.toFixed(2)}%` };
  return { bias: "Neutral", reason: `Flat movement of ${changePercent.toFixed(2)}%` };
}

function inferStrengthFromChange(changePercent: number): DriverStrength {
  const abs = Math.abs(changePercent);
  if (abs > 3) return "Strong";
  if (abs > 1) return "Moderate";
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

function getDriverWeight(driverId: string): number {
  const weightMap: Record<string, number> = {
    "us100-apple": 1.2, "us100-microsoft": 1.2, "us100-nvidia": 1.3,
    "us100-amazon": 1.1, "us100-meta": 1.0, "us100-alphabet": 1.0,
    "us100-tesla": 0.9, "us100-broadcom": 0.9, "us100-amd": 0.8, "us100-netflix": 0.8,
    "us100-fed": 1.3, "us100-dxy": 1.1, "us100-treasury-yields": 1.2,
    "us100-inflation": 1.1, "us100-employment": 1.0, "us100-gdp": 0.9, "us100-econ-calendar": 0.8,
    "us100-sector-semi": 1.1,
    "us100-trend": 1.2, "us100-momentum": 1.1, "us100-market-structure": 1.1,
  };
  return weightMap[driverId] ?? 1.0;
}

function inferBiasFromMacroIndicator(change: number, impact: string): DriverBias {
  const isHighImpact = impact === "High";
  if (change > 0 && isHighImpact) return "Bullish";
  if (change < 0 && isHighImpact) return "Bearish";
  if (Math.abs(change) > 2) return change > 0 ? "Bullish" : "Bearish";
  return "Neutral";
}

function inferBiasFromMacroTrend(trend: string): DriverBias {
  if (trend === "Improving") return "Bullish";
  if (trend === "Deteriorating") return "Bearish";
  return "Neutral";
}

function inferBiasFromCOT(cot: COTReportData): DriverBias {
  const netSpeculative = cot.nonCommercials.netLong;
  const netCommercial = cot.commercials.netLong;
  if (netSpeculative > 30000 && netCommercial < -30000) return "Bearish";
  if (netSpeculative < -30000 && netCommercial > 30000) return "Bullish";
  if (netSpeculative > 10000) return "Mixed-Wait" as unknown as DriverBias;
  if (netSpeculative < -10000) return "Mixed-Wait" as unknown as DriverBias;
  return "Neutral";
}

function inferBiasFromETF(etf: ETFData): DriverBias {
  const inflows = etf.etfs.filter((e) => e.flowDirection === "Inflow").length;
  const outflows = etf.etfs.filter((e) => e.flowDirection === "Outflow").length;
  if (inflows > outflows) return "Bullish";
  if (outflows > inflows) return "Bearish";
  return "Neutral";
}

function inferBiasFromOI(oi: OpenInterestRecord): DriverBias {
  if (oi.trend === "Rising" && oi.changeFromPrevious > 10000) return "Mixed-Wait" as unknown as DriverBias;
  if (oi.trend === "Falling" && Math.abs(oi.changeFromPrevious) > 10000) return "Mixed-Wait" as unknown as DriverBias;
  return "Neutral";
}

function inferBiasFromBreadth(breadth: BreadthData): DriverBias {
  if (breadth.breadthScore >= 70) return "Bullish";
  if (breadth.breadthScore >= 50) return "Neutral";
  if (breadth.breadthScore >= 30) return "Mixed-Wait" as unknown as DriverBias;
  return "Bearish";
}

export function mapUS100DataToEngine(dataset: US100FullDataset): DriverAnalysisObject[] {
  const drivers: DriverAnalysisObject[] = [];
  const ts = dataset.collectedAt;

  if (dataset.index.meta.status === "live") {
    const idx = dataset.index;
    const priceBias = inferBiasFromChange(idx.changePercent);
    drivers.push(buildBase({
      driverId: "us100-price", driverTitle: "US100 Price", categoryId: "market-overview",
      bias: priceBias.bias, biasReason: priceBias.reason,
      strength: inferStrengthFromChange(idx.changePercent),
      confidence: 85, confidenceReason: "Live derived data",
      technicalObservation: `Current: ${idx.price.toFixed(2)}, Range: ${idx.low.toFixed(2)}–${idx.high.toFixed(2)}`,
      source: idx.meta.source, weight: 1.0, contribution: priceBias.bias.includes("Bullish") ? 1.0 : priceBias.bias.includes("Bearish") ? -1.0 : 0,
      dataFields: { price: String(idx.price), open: String(idx.open), high: String(idx.high), low: String(idx.low), previousClose: String(idx.previousClose) },
    }));
    const dailyBias = inferBiasFromChange(idx.changePercent);
    drivers.push(buildBase({
      driverId: "us100-daily-pct", driverTitle: "Daily %", categoryId: "market-overview",
      bias: dailyBias.bias, biasReason: dailyBias.reason,
      strength: inferStrengthFromChange(idx.changePercent),
      confidence: 90, confidenceReason: "Live calculation from derived data",
      technicalObservation: `Daily change: ${idx.changePercent >= 0 ? "+" : ""}${idx.changePercent.toFixed(2)}%`,
      source: idx.meta.source, weight: 1.0, contribution: idx.changePercent,
      dataFields: { dailyChange: `${idx.changePercent.toFixed(2)}%`, dailyChangeAbs: String(idx.change) },
    }));
    drivers.push(buildBase({
      driverId: "us100-weekly-pct", driverTitle: "Weekly %", categoryId: "market-overview",
      bias: dailyBias.bias, biasReason: "Derived from daily movement",
      strength: "Weak", confidence: 50, confidenceReason: "Estimated from daily data",
      source: idx.meta.source, weight: 1.0, contribution: 0,
      dataFields: { weeklyChange: "Estimated" },
    }));
    drivers.push(buildBase({
      driverId: "us100-session-high", driverTitle: "Session High", categoryId: "market-overview",
      bias: idx.price >= idx.high * 0.99 ? "Bullish" : "Neutral",
      biasReason: `Session high: ${idx.high.toFixed(2)}`,
      strength: "Weak", confidence: 80, confidenceReason: "Live derived data",
      source: idx.meta.source, weight: 1.0, contribution: 0,
      dataFields: { sessionHigh: String(idx.high) },
    }));
    drivers.push(buildBase({
      driverId: "us100-session-low", driverTitle: "Session Low", categoryId: "market-overview",
      bias: idx.price <= idx.low * 1.01 ? "Bearish" : "Neutral",
      biasReason: `Session low: ${idx.low.toFixed(2)}`,
      strength: "Weak", confidence: 80, confidenceReason: "Live derived data",
      source: idx.meta.source, weight: 1.0, contribution: 0,
      dataFields: { sessionLow: String(idx.low) },
    }));
    drivers.push(buildBase({
      driverId: "us100-volume", driverTitle: "Volume", categoryId: "market-overview",
      bias: "Neutral", biasReason: `Volume: ${idx.volume}`,
      strength: "None", confidence: 70, confidenceReason: "Live derived data",
      source: idx.meta.source, weight: 1.0, contribution: 0,
      dataFields: { volume: String(idx.volume) },
    }));
    drivers.push(buildBase({
      driverId: "us100-futures", driverTitle: "Futures", categoryId: "market-overview",
      bias: dailyBias.bias, biasReason: "Aligned with cash session",
      strength: "Weak", confidence: 40, confidenceReason: "Estimated from cash movement",
      source: "composite", weight: 1.0, contribution: 0,
      dataFields: { futures: "Aligned with cash" },
    }));
  }

  const profile = getProfile("us100");
  const trackedSymbols = profile?.trackedSymbols ?? [];

  const megaCapDrivers = (profile?.driverRegistry ?? []).filter((d) => d.category === "mega-cap");
  const megaCapMap = new Map<string, string>();
  const nameMap = new Map<string, string>();
  for (const driver of megaCapDrivers) {
    megaCapMap.set(driver.shortTitle, driver.id);
    nameMap.set(driver.shortTitle, driver.title);
  }

  for (const symbol of trackedSymbols) {
    const stock = dataset.stocks.find((s) => s.symbol === symbol);
    const driverId = megaCapMap.get(symbol) ?? `us100-${symbol.toLowerCase()}`;
    const driverTitle = nameMap.get(symbol) ?? symbol;
    if (stock && stock.meta.status === "live") {
      const stockBias = inferBiasFromChange(stock.changePercent);
      drivers.push(buildBase({
        driverId, driverTitle, categoryId: "mega-cap",
        bias: stockBias.bias, biasReason: stockBias.reason,
        strength: inferStrengthFromChange(stock.changePercent),
        confidence: 85, confidenceReason: "Live Twelve Data quote",
        technicalObservation: `${symbol}: $${stock.price.toFixed(2)} (${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent.toFixed(2)}%)`,
        source: "Twelve Data", weight: getDriverWeight(driverId),
        contribution: stock.changePercent,
        dataFields: { price: String(stock.price), change: `${stock.changePercent.toFixed(2)}%`, volume: String(stock.volume), marketCap: String(stock.marketCap) },
      }));
    } else {
      drivers.push(buildBase({
        driverId, driverTitle, categoryId: "mega-cap",
        bias: "Neutral", biasReason: "Live Data Unavailable",
        strength: "None", confidence: 0, confidenceReason: "No data received",
        source: "Twelve Data", weight: getDriverWeight(driverId),
        dataFields: { status: "unavailable" },
      }));
    }
  }

  const macro = dataset.macro;
  const macroDriverMap: { id: string; title: string; source: string; matchNames: string[] }[] = [
    { id: "us100-fed", title: "Federal Reserve", source: "FRED", matchNames: ["Federal Funds Rate", "US 2Y Treasury Yield", "US 10Y Treasury Yield"] },
    { id: "us100-dxy", title: "DXY", source: "TwelveData", matchNames: ["US Dollar Index"] },
    { id: "us100-treasury-yields", title: "Treasury Yields", source: "TwelveData", matchNames: ["US 10Y Treasury Yield", "US 2Y Treasury Yield"] },
    { id: "us100-inflation", title: "Inflation", source: "FRED", matchNames: ["CPI", "PPI"] },
    { id: "us100-employment", title: "Employment", source: "FRED", matchNames: ["Unemployment Rate", "Non-Farm Payrolls"] },
    { id: "us100-gdp", title: "GDP", source: "FRED", matchNames: ["GDP"] },
    { id: "us100-econ-calendar", title: "Economic Calendar", source: "FRED", matchNames: ["Federal Funds Rate"] },
  ];

  if (macro && macro.meta.status === "live") {
    for (const m of macroDriverMap) {
      const indicator = macro.indicators.find((i) => m.matchNames.includes(i.name));
      if (indicator) {
        const macroBias = inferBiasFromMacroIndicator(indicator.change, indicator.impact);
        drivers.push(buildBase({
          driverId: m.id, driverTitle: m.title, categoryId: "macro",
          bias: macroBias, biasReason: `${indicator.name}: ${indicator.value} (${indicator.trend})`,
          strength: indicator.impact === "High" ? "Moderate" : "Weak",
          confidence: 75, confidenceReason: "Live macro provider data",
          source: m.source as DriverAnalysisObject["source"], weight: getDriverWeight(m.id),
          contribution: indicator.impact === "High" ? (macroBias.includes("Bullish") ? 1.0 : macroBias.includes("Bearish") ? -1.0 : 0) : 0,
          dataFields: { value: String(indicator.value), change: String(indicator.change), trend: indicator.trend, impact: indicator.impact },
        }));
      } else {
        drivers.push(buildBase({
          driverId: m.id, driverTitle: m.title, categoryId: "macro",
          bias: "Neutral", biasReason: "No matching macro indicator available",
          strength: "None", confidence: 20, confidenceReason: "Indicator not found in provider data",
          source: m.source as DriverAnalysisObject["source"], weight: getDriverWeight(m.id),
          dataFields: { status: "not_found" },
        }));
      }
    }
  } else {
    for (const m of macroDriverMap) {
      drivers.push(buildBase({
        driverId: m.id, driverTitle: m.title, categoryId: "macro",
        bias: "Neutral", biasReason: "Macro data unavailable",
        strength: "None", confidence: 20, confidenceReason: "Macro provider returned unavailable",
        source: m.source as DriverAnalysisObject["source"], weight: getDriverWeight(m.id),
        dataFields: { status: "unavailable" },
      }));
    }
  }

  const liveEarnings = dataset.earnings.filter((e) => e.meta.status === "live");
  const highImpact = liveEarnings.filter((e) => e.importance === "High");
  const earningsBias: DriverBias = highImpact.length > 2 ? "Mixed-Wait" as unknown as DriverBias : liveEarnings.length > 0 ? "Neutral" : "Neutral";

  drivers.push(buildBase({
    driverId: "us100-earnings-upcoming", driverTitle: "Upcoming Earnings", categoryId: "earnings",
    bias: earningsBias, biasReason: `${liveEarnings.length} upcoming earnings, ${highImpact.length} high impact`,
    strength: liveEarnings.length > 3 ? "Moderate" : "Weak",
    confidence: 75, confidenceReason: "FMP earnings calendar",
    source: "FMP", weight: 1.0, contribution: 0,
    dataFields: { upcomingCount: String(liveEarnings.length), highImpactCount: String(highImpact.length) },
  }));
  drivers.push(buildBase({
    driverId: "us100-earnings-estimate", driverTitle: "Earnings Estimate", categoryId: "earnings",
    bias: "Neutral", biasReason: "Aggregate estimates",
    strength: "None", confidence: 60, confidenceReason: "FMP estimates",
    source: "FMP", weight: 1.0, contribution: 0,
    dataFields: {},
  }));
  drivers.push(buildBase({
    driverId: "us100-earnings-previous", driverTitle: "Previous Earnings", categoryId: "earnings",
    bias: "Neutral", biasReason: "Historical data",
    strength: "None", confidence: 50, confidenceReason: "Historical reference",
    source: "FMP", weight: 0.8, contribution: 0,
    dataFields: {},
  }));
  drivers.push(buildBase({
    driverId: "us100-earnings-date", driverTitle: "Announcement Date", categoryId: "earnings",
    bias: "Neutral", biasReason: "Dates tracked",
    strength: "None", confidence: 90, confidenceReason: "FMP calendar",
    source: "FMP", weight: 0.7, contribution: 0,
    dataFields: {},
  }));
  drivers.push(buildBase({
    driverId: "us100-earnings-impact", driverTitle: "Market Impact", categoryId: "earnings",
    bias: highImpact.length > 2 ? "Mixed-Wait" as unknown as DriverBias : "Neutral",
    biasReason: `${highImpact.length} high-impact events this period`,
    strength: highImpact.length > 2 ? "Moderate" : "Weak",
    confidence: 55, confidenceReason: "Estimated from importance ratings",
    source: "ai-analysis", weight: 1.0, contribution: 0,
    dataFields: {},
  }));

  const breadth = dataset.breadth;
  const breadthUs100 = breadth?.find((b) => b.exchange === "NASDAQ");
  if (breadthUs100 && breadthUs100.meta.status === "live") {
    const breadthBias = inferBiasFromBreadth(breadthUs100);
    drivers.push(buildBase({
      driverId: "us100-ad", driverTitle: "Advance/Decline", categoryId: "breadth",
      bias: breadthBias, biasReason: `A/D ratio: ${breadthUs100.aDRatio}`,
      strength: breadthUs100.breadthScore >= 70 ? "Moderate" : "Weak",
      confidence: 80, confidenceReason: "Live FMP market breadth data",
      source: breadthUs100.meta.source, weight: 1.0, contribution: breadthUs100.breadthScore >= 70 ? 1.0 : breadthUs100.breadthScore < 30 ? -1.0 : 0,
      dataFields: { advances: String(breadthUs100.advances), declines: String(breadthUs100.declines), adRatio: String(breadthUs100.aDRatio) },
    }));
    drivers.push(buildBase({
      driverId: "us100-new-highs", driverTitle: "New Highs", categoryId: "breadth",
      bias: breadthUs100.newHighs > breadthUs100.newLows ? "Bullish" : "Neutral",
      biasReason: `New Highs: ${breadthUs100.newHighs}, New Lows: ${breadthUs100.newLows}`,
      strength: "Weak", confidence: 80, confidenceReason: "Live FMP market breadth data",
      source: breadthUs100.meta.source, weight: 1.0, contribution: 0,
      dataFields: { newHighs: String(breadthUs100.newHighs), newLows: String(breadthUs100.newLows) },
    }));
    drivers.push(buildBase({
      driverId: "us100-new-lows", driverTitle: "New Lows", categoryId: "breadth",
      bias: breadthUs100.newLows > breadthUs100.newHighs ? "Bearish" : "Neutral",
      biasReason: `New Lows: ${breadthUs100.newLows}, New Highs: ${breadthUs100.newHighs}`,
      strength: "Weak", confidence: 80, confidenceReason: "Live FMP market breadth data",
      source: breadthUs100.meta.source, weight: 1.0, contribution: 0,
      dataFields: { newLows: String(breadthUs100.newLows), newHighs: String(breadthUs100.newHighs) },
    }));
    drivers.push(buildBase({
      driverId: "us100-breadth-score", driverTitle: "Breadth Score", categoryId: "breadth",
      bias: breadthBias, biasReason: `Breadth score: ${breadthUs100.breadthScore}`,
      strength: breadthUs100.breadthScore >= 70 ? "Moderate" : "None",
      confidence: 85, confidenceReason: "Live FMP market breadth data",
      source: breadthUs100.meta.source, weight: 1.0, contribution: breadthUs100.breadthScore >= 70 ? 1.0 : breadthUs100.breadthScore < 30 ? -1.0 : 0,
      dataFields: { breadthScore: String(breadthUs100.breadthScore) },
    }));
  } else {
    const breadthDrivers = [
      { id: "us100-ad", title: "Advance/Decline" },
      { id: "us100-new-highs", title: "New Highs" },
      { id: "us100-new-lows", title: "New Lows" },
      { id: "us100-breadth-score", title: "Breadth Score" },
    ];
    for (const b of breadthDrivers) {
      drivers.push(buildBase({
        driverId: b.id, driverTitle: b.title, categoryId: "breadth",
        bias: "Neutral", biasReason: "Market breadth data unavailable",
        strength: "None", confidence: 15, confidenceReason: "Breadth provider returned unavailable",
        source: "composite", weight: 1.0, dataFields: { status: "unavailable" },
      }));
    }
  }

  const volInst = dataset.volatilityInstitutional;
  const vol = volInst && volInst.meta.status === "live" ? volInst : dataset.volatility;
  if (vol.meta.status === "live") {
    const vixValue = "vix" in vol ? (vol as VolatilityData).vix ?? (vol as typeof dataset.volatility).vix ?? 0 : (vol as typeof dataset.volatility).vix ?? 0;
    const vxnValue = "vxn" in vol ? (vol as VolatilityData).vxn ?? (vol as typeof dataset.volatility).vxn ?? 0 : (vol as typeof dataset.volatility).vxn ?? 0;
    const trend = "trend" in vol ? vol.trend : "Normal";
    const riskRating = "riskRating" in vol ? vol.riskRating : "Moderate";

    const vixBias: DriverBias = vixValue > 25 ? "Bearish" : vixValue > 20 ? "Mixed-Wait" as unknown as DriverBias : "Bullish";
    drivers.push(buildBase({
      driverId: "us100-vix", driverTitle: "VIX", categoryId: "volatility",
      bias: vixBias, biasReason: `VIX at ${vixValue.toFixed(2)}, trend: ${trend}`,
      strength: riskRating === "Extreme" || riskRating === "High" ? "Strong" : "Moderate",
      confidence: 85, confidenceReason: "Live volatility data",
      source: vol.meta.source, weight: 1.0, contribution: vixBias.includes("Bearish") ? -1.5 : 1.0,
      dataFields: { vix: String(vixValue), trend },
    }));
    const vxnBias: DriverBias = vxnValue > 28 ? "Bearish" : vxnValue > 22 ? "Mixed-Wait" as unknown as DriverBias : "Bullish";
    drivers.push(buildBase({
      driverId: "us100-vxn", driverTitle: "VXN", categoryId: "volatility",
      bias: vxnBias, biasReason: `VXN at ${vxnValue.toFixed(2)}, trend: ${trend}`,
      strength: riskRating === "Extreme" || riskRating === "High" ? "Strong" : "Moderate",
      confidence: 85, confidenceReason: "Live volatility data",
      source: vol.meta.source, weight: 1.0, contribution: vxnBias.includes("Bearish") ? -1.5 : 1.0,
      dataFields: { vxn: String(vxnValue), trend },
    }));
    const riskBias: DriverBias = riskRating === "Extreme" || riskRating === "High" ? "Bearish" : riskRating === "Moderate" ? "Neutral" : "Bullish";
    drivers.push(buildBase({
      driverId: "us100-risk-rating", driverTitle: "Risk Rating", categoryId: "volatility",
      bias: riskBias, biasReason: `Risk: ${riskRating}, Trend: ${trend}`,
      strength: riskRating === "Extreme" ? "Strong" : "Moderate",
      confidence: 80, confidenceReason: "Composite from VIX/VXN",
      source: "composite", weight: 1.0, contribution: riskBias.includes("Bearish") ? -2 : 0,
      dataFields: { riskRating, trend },
    }));
  }

  const etf = dataset.etf;
  if (etf && etf.meta.status === "live") {
    const etfBias = inferBiasFromETF(etf);
    drivers.push(buildBase({
      driverId: "us100-qqq", driverTitle: "QQQ", categoryId: "etf-flow",
      bias: etfBias, biasReason: `QQQ flow: ${etf.etfs.find((e) => e.symbol === "QQQ")?.flowDirection ?? "N/A"}`,
      strength: "Moderate", confidence: 75, confidenceReason: "Live FMP ETF profile data",
      source: etf.meta.source, weight: 1.0, contribution: etfBias.includes("Bullish") ? 1.0 : -1.0,
      dataFields: { qqqDirection: etf.etfs.find((e) => e.symbol === "QQQ")?.flowDirection ?? "N/A" },
    }));
    drivers.push(buildBase({
      driverId: "us100-tqqq", driverTitle: "TQQQ", categoryId: "etf-flow",
      bias: etfBias, biasReason: `TQQQ flow: ${etf.etfs.find((e) => e.symbol === "TQQQ")?.flowDirection ?? "N/A"}`,
      strength: "Moderate", confidence: 75, confidenceReason: "Live FMP ETF profile data",
      source: etf.meta.source, weight: 1.0, contribution: 0,
      dataFields: { tqqqDirection: etf.etfs.find((e) => e.symbol === "TQQQ")?.flowDirection ?? "N/A" },
    }));
    drivers.push(buildBase({
      driverId: "us100-sqqq", driverTitle: "SQQQ", categoryId: "etf-flow",
      bias: etfBias === "Bullish" ? "Bearish" as DriverBias : etfBias === "Bearish" ? "Bullish" as DriverBias : "Neutral",
      biasReason: `SQQQ flow: ${etf.etfs.find((e) => e.symbol === "SQQQ")?.flowDirection ?? "N/A"} (inverse ETF)`,
      strength: "Moderate", confidence: 75, confidenceReason: "Live FMP ETF profile data",
      source: etf.meta.source, weight: 1.0, contribution: 0,
      dataFields: { sqqqDirection: etf.etfs.find((e) => e.symbol === "SQQQ")?.flowDirection ?? "N/A" },
    }));
    drivers.push(buildBase({
      driverId: "us100-net-flow", driverTitle: "Net Flow", categoryId: "etf-flow",
      bias: etfBias, biasReason: `Net ETF flow: ${etfBias}`,
      strength: "Weak", confidence: 70, confidenceReason: "Derived from individual ETF flows",
      source: etf.meta.source, weight: 1.0, contribution: etfBias.includes("Bullish") ? 1.0 : etfBias.includes("Bearish") ? -1.0 : 0,
      dataFields: { netFlow: etfBias },
    }));
  } else {
    const etfDrivers = [
      { id: "us100-qqq", title: "QQQ" },
      { id: "us100-tqqq", title: "TQQQ" },
      { id: "us100-sqqq", title: "SQQQ" },
      { id: "us100-net-flow", title: "Net Flow" },
    ];
    for (const e of etfDrivers) {
      drivers.push(buildBase({
        driverId: e.id, driverTitle: e.title, categoryId: "etf-flow",
        bias: "Neutral", biasReason: "ETF flow data unavailable",
        strength: "None", confidence: 15, confidenceReason: "ETF provider returned unavailable",
        source: "composite", weight: 1.0, dataFields: { status: "unavailable" },
      }));
    }
  }

  if (dataset.sectors.meta.status === "live") {
    const sectorMap: [string, string, number][] = [
      ["us100-sector-tech", "technology", 1.0],
      ["us100-sector-semi", "semiconductors", 1.1],
      ["us100-sector-financials", "financials", 0.8],
      ["us100-sector-healthcare", "healthcare", 0.7],
      ["us100-sector-energy", "energy", 0.6],
      ["us100-sector-industrials", "industrials", 0.6],
      ["us100-sector-utilities", "utilities", 0.5],
      ["us100-sector-consumer", "consumer", 0.7],
      ["us100-sector-communication", "communication", 0.7],
    ];
    for (const [driverId, sectorKey, weight] of sectorMap) {
      const change = dataset.sectors[sectorKey as keyof typeof dataset.sectors] as number;
      if (typeof change !== "number") continue;
      const sectorBias = inferBiasFromChange(change);
      drivers.push(buildBase({
        driverId, driverTitle: sectorKey.charAt(0).toUpperCase() + sectorKey.slice(1), categoryId: "sector-rotation",
        bias: sectorBias.bias, biasReason: sectorBias.reason,
        strength: inferStrengthFromChange(change),
        confidence: 80, confidenceReason: "Derived from Twelve Data stocks",
        source: dataset.sectors.meta.source, weight, contribution: change,
        dataFields: { dailyChange: `${change.toFixed(2)}%`, etf: dataset.sectors.meta.source },
      }));
    }
  }

  const cot = dataset.cot;
  if (cot && cot.length > 0) {
    const us100COT = cot.find((c) => c.contractName?.includes("NASDAQ") || c.contractName?.includes("NQ") || c.contractName?.includes("US100"));
    if (us100COT && us100COT.meta.status === "live") {
      const cotBias = inferBiasFromCOT(us100COT);
      drivers.push(buildBase({
        driverId: "us100-cot-positioning", driverTitle: "COT Positioning", categoryId: "cot",
        bias: cotBias, biasReason: `Spec Long: ${us100COT.nonCommercials.long}, Spec Short: ${us100COT.nonCommercials.short}, Net: ${us100COT.nonCommercials.netLong >= 0 ? "+" : ""}${us100COT.nonCommercials.netLong}`,
        strength: Math.abs(us100COT.nonCommercials.netLong) > 30000 ? "Strong" : "Moderate",
        confidence: 85, confidenceReason: "Live CFTC COT report data",
        source: us100COT.meta.source, weight: 1.2, contribution: cotBias.includes("Bullish") ? 1.0 : cotBias.includes("Bearish") ? -1.0 : 0,
        dataFields: { commercialNet: String(us100COT.commercials.netLong), nonCommercialNet: String(us100COT.nonCommercials.netLong), openInterest: String(us100COT.totalOpenInterest) },
      }));
    } else {
      drivers.push(buildBase({
        driverId: "us100-cot-positioning", driverTitle: "COT Positioning", categoryId: "cot",
        bias: "Neutral", biasReason: "US100 specific COT data not found in report",
        strength: "None", confidence: 15, confidenceReason: "No matching contract in COT data",
        source: "CFTC", weight: 1.2, dataFields: { status: "not_found" },
      }));
    }
  } else {
    drivers.push(buildBase({
      driverId: "us100-cot-positioning", driverTitle: "COT Positioning", categoryId: "cot",
      bias: "Neutral", biasReason: "COT data unavailable",
      strength: "None", confidence: 15, confidenceReason: "COT provider returned unavailable",
      source: "CFTC", weight: 1.2, dataFields: { status: "unavailable" },
    }));
  }

  const oi = dataset.openInterest;
  if (oi && oi.length > 0) {
    const us100OI = oi.find((o) => o.contractName === "NQUSD" || o.contractName?.includes("US100"));
    if (us100OI && us100OI.meta.status === "live") {
      const oiBias = inferBiasFromOI(us100OI);
      drivers.push(buildBase({
        driverId: "us100-open-interest", driverTitle: "Open Interest", categoryId: "open-interest",
        bias: oiBias, biasReason: `OI: ${us100OI.currentLevel}, Change: ${us100OI.changeFromPrevious >= 0 ? "+" : ""}${us100OI.changeFromPrevious}, Trend: ${us100OI.trend}`,
        strength: Math.abs(us100OI.changeFromPrevious) > 10000 ? "Strong" : "Moderate",
        confidence: 80, confidenceReason: "Live FMP open interest data",
        source: us100OI.meta.source, weight: 1.1, contribution: Math.abs(us100OI.changeFromPrevious) > 10000 ? (us100OI.trend === "Rising" ? 1.0 : -1.0) : 0,
        dataFields: { currentLevel: String(us100OI.currentLevel), change: String(us100OI.changeFromPrevious), trend: us100OI.trend },
      }));
    } else {
      drivers.push(buildBase({
        driverId: "us100-open-interest", driverTitle: "Open Interest", categoryId: "open-interest",
        bias: "Neutral", biasReason: "US100 specific OI data not found",
        strength: "None", confidence: 15, confidenceReason: "No matching contract in OI data",
        source: "FMP", weight: 1.1, dataFields: { status: "not_found" },
      }));
    }
  } else {
    drivers.push(buildBase({
      driverId: "us100-open-interest", driverTitle: "Open Interest", categoryId: "open-interest",
      bias: "Neutral", biasReason: "Open interest data unavailable",
      strength: "None", confidence: 15, confidenceReason: "Open interest provider returned unavailable",
      source: "FMP", weight: 1.1, dataFields: { status: "unavailable" },
    }));
  }

  const techDrivers = [
    { id: "us100-trend", title: "Trend" },
    { id: "us100-momentum", title: "Momentum" },
    { id: "us100-moving-averages", title: "Moving Averages" },
    { id: "us100-support", title: "Support" },
    { id: "us100-resistance", title: "Resistance" },
    { id: "us100-market-structure", title: "Market Structure" },
  ];
  for (const t of techDrivers) {
    drivers.push(buildBase({
      driverId: t.id, driverTitle: t.title, categoryId: "technical",
      bias: "Neutral", biasReason: "Awaiting manual technical input",
      strength: "None", confidence: 10, confidenceReason: "Placeholder — requires chart analysis",
      source: "manual", weight: getDriverWeight(t.id), dataFields: { status: "awaiting_manual_input" },
    }));
  }

  drivers.push(buildBase({
    driverId: "us100-ai-summary", driverTitle: "Institutional Summary", categoryId: "sentiment",
    bias: "Neutral", biasReason: "AI summary pending",
    strength: "None", confidence: 0, confidenceReason: "Awaiting AI analysis",
    source: "ai-analysis", weight: 1.0, dataFields: { status: "pending" },
  }));

  return drivers;
}

export function buildUS100MacroContext(dataset: US100FullDataset): string {
  const lines: string[] = [];
  const idx = dataset.index;
  if (idx.meta.status === "live") {
    lines.push(`US100 Price: ${idx.price.toFixed(2)} (${idx.changePercent >= 0 ? "+" : ""}${idx.changePercent.toFixed(2)}%)`);
    lines.push(`Open: ${idx.open.toFixed(2)} | High: ${idx.high.toFixed(2)} | Low: ${idx.low.toFixed(2)} | Prev Close: ${idx.previousClose.toFixed(2)}`);
  }
  const volInst = dataset.volatilityInstitutional;
  const vol = volInst && volInst.meta.status === "live" ? volInst : dataset.volatility;
  if (vol.meta.status === "live") {
    const vixVal = "vix" in vol ? String((vol as VolatilityData).vix ?? "N/A") : String((vol as typeof dataset.volatility).vix ?? "N/A");
    const vxnVal = "vxn" in vol ? String((vol as VolatilityData).vxn ?? "N/A") : String((vol as typeof dataset.volatility).vxn ?? "N/A");
    const riskVal = "riskRating" in vol ? vol.riskRating : (vol as typeof dataset.volatility).riskRating;
    lines.push(`VIX: ${vixVal} | VXN: ${vxnVal} | Risk: ${riskVal}`);
  }
  if (dataset.stocks.length > 0) {
    const topGainer = [...dataset.stocks].filter((s) => s.meta.status === "live").sort((a, b) => b.changePercent - a.changePercent)[0];
    const topLoser = [...dataset.stocks].filter((s) => s.meta.status === "live").sort((a, b) => a.changePercent - b.changePercent)[0];
    if (topGainer) lines.push(`Top Gainer: ${topGainer.symbol} +${topGainer.changePercent.toFixed(2)}%`);
    if (topLoser) lines.push(`Top Loser: ${topLoser.symbol} ${topLoser.changePercent.toFixed(2)}%`);
  }
  if (dataset.macro && dataset.macro.meta.status === "live") {
    const dxy = dataset.macro.indicators.find((i) => i.name === "US Dollar Index");
    const fedFunds = dataset.macro.indicators.find((i) => i.name === "Federal Funds Rate");
    const cpi = dataset.macro.indicators.find((i) => i.name === "CPI");
    if (dxy) lines.push(`DXY: ${dxy.value} (${dxy.trend})`);
    if (fedFunds) lines.push(`Fed Funds: ${fedFunds.value}`);
    if (cpi) lines.push(`CPI: ${cpi.value} (${cpi.trend})`);
  }
  return lines.join(" | ");
}
