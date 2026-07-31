import type { ResearchDataset, ResearchDriver } from "../models";
import type { DriverBias, DriverStrength } from "@/types/goldResearchConfig";

export function executeDriverEngine(dataset: ResearchDataset): ResearchDriver[] {
  const drivers: ResearchDriver[] = [];

  addMacroDrivers(drivers, dataset);
  addVolatilityDrivers(drivers, dataset);
  addETFDrivers(drivers, dataset);
  addCOTDrivers(drivers, dataset);
  addBreadthDrivers(drivers, dataset);
  addSectorDrivers(drivers, dataset);
  addMarketDataDrivers(drivers, dataset);

  return drivers;
}

function addMacroDrivers(drivers: ResearchDriver[], dataset: ResearchDataset): void {
  if (!dataset.macro?.indicators) return;

  const indicators = dataset.macro.indicators;
  const deteriorating = indicators.filter((i) => i.trend === "Deteriorating").length;
  const improving = indicators.filter((i) => i.trend === "Improving").length;
  const net = improving - deteriorating;
  const total = indicators.length || 1;

  const bias: DriverBias = net > 0 ? "Bullish" : net < 0 ? "Bearish" : "Neutral";
  const strength: DriverStrength = Math.abs(net) / total > 0.5 ? "Strong" : Math.abs(net) > 0 ? "Moderate" : "Weak";
  const score = 50 + (net / total) * 50;
  const confidence = Math.min(100, Math.round((total / 10) * 100));

  drivers.push({
    driverId: "macro-outlook",
    driverTitle: "Macro Outlook",
    categoryId: "macro",
    categoryTitle: "Macroeconomic",
    bias,
    strength,
    score: Math.round(Math.max(0, Math.min(100, score))),
    confidence,
    weight: 0.15,
    currentDataValue: `${improving} improving, ${deteriorating} deteriorating out of ${total} indicators`,
    reason: `Macro bias is ${bias.toLowerCase()} based on ${net > 0 ? improving + " improving" : deteriorating + " deteriorating"} indicators`,
  });
}

function addVolatilityDrivers(drivers: ResearchDriver[], dataset: ResearchDataset): void {
  const vol = dataset.volatility;
  if (!vol || (!vol.vix && vol.vix !== 0)) return;

  const vix = vol.vix ?? 0;
  const gvz = ("gvz" in vol ? (vol as any).gvz : dataset.gold?.gvz) ?? undefined;

  let bias: DriverBias;
  let strength: DriverStrength;
  let score: number;

  if (vix > 28) { bias = "Bearish"; strength = "Strong"; score = 20; }
  else if (vix > 22) { bias = "Bearish"; strength = "Moderate"; score = 35; }
  else if (vix > 14) { bias = "Neutral"; strength = "Weak"; score = 50; }
  else { bias = "Bullish"; strength = "Moderate"; score = 65; }

  drivers.push({
    driverId: "volatility",
    driverTitle: "Volatility",
    categoryId: "volatility",
    categoryTitle: "Volatility",
    bias,
    strength,
    score,
    confidence: 80,
    weight: 0.10,
    currentDataValue: `VIX: ${vix.toFixed(2)}${gvz !== undefined ? `, GVZ: ${(gvz as number).toFixed(2)}` : ""}`,
    reason: `VIX at ${vix.toFixed(1)} indicates ${bias.toLowerCase()} volatility bias`,
  });
}

function addETFDrivers(drivers: ResearchDriver[], dataset: ResearchDataset): void {
  if (!dataset.etf?.etfs || dataset.etf.etfs.length === 0) return;

  const etfs = dataset.etf.etfs;
  const inflowCount = etfs.filter((e) => e.flowDirection === "Inflow").length;
  const outflowCount = etfs.filter((e) => e.flowDirection === "Outflow").length;
  const total = etfs.length || 1;

  let bias: DriverBias;
  let strength: DriverStrength;
  if (inflowCount > outflowCount * 2) { bias = "Bullish"; strength = "Strong"; }
  else if (inflowCount > outflowCount) { bias = "Bullish"; strength = "Moderate"; }
  else if (outflowCount > inflowCount * 2) { bias = "Bearish"; strength = "Strong"; }
  else if (outflowCount > inflowCount) { bias = "Bearish"; strength = "Moderate"; }
  else { bias = "Neutral"; strength = "Weak"; }

  const score = 50 + ((inflowCount - outflowCount) / total) * 50;

  drivers.push({
    driverId: "etf-flows",
    driverTitle: "ETF Flows",
    categoryId: "etf-flow",
    categoryTitle: "ETF Flow",
    bias,
    strength,
    score: Math.round(Math.max(0, Math.min(100, score))),
    confidence: 70,
    weight: 0.10,
    currentDataValue: `${inflowCount} inflows, ${outflowCount} outflows across ${total} ETFs`,
    reason: `ETF flow bias is ${bias.toLowerCase()} (${inflowCount} in / ${outflowCount} out)`,
  });
}

function addCOTDrivers(drivers: ResearchDriver[], dataset: ResearchDataset): void {
  if (!dataset.cot || dataset.cot.length === 0) return;

  const cotEntry = dataset.cot.find(
    (c) =>
      c.contractName?.includes("NASDAQ") ||
      c.contractName?.includes("NQ") ||
      c.contractName?.includes("US100") ||
      c.contractName?.includes("GOLD") ||
      c.contractName?.includes("XAU")
  ) ?? dataset.cot[0];

  if (!cotEntry) return;

  const specNet = cotEntry.nonCommercials?.netLong ?? 0;
  const commNet = cotEntry.commercials?.netLong ?? 0;

  let bias: DriverBias;
  let strength: DriverStrength;
  if (commNet > 10000) { bias = "Bullish"; strength = "Strong"; }
  else if (commNet > 0) { bias = "Bullish"; strength = "Moderate"; }
  else if (commNet < -10000) { bias = "Bearish"; strength = "Strong"; }
  else if (commNet < 0) { bias = "Bearish"; strength = "Moderate"; }
  else { bias = "Neutral"; strength = "Weak"; }

  const score = 50 + (commNet / 20000) * 50;

  drivers.push({
    driverId: "cot-positioning",
    driverTitle: "COT Positioning",
    categoryId: "institutional",
    categoryTitle: "Institutional",
    bias,
    strength,
    score: Math.round(Math.max(0, Math.min(100, score))),
    confidence: 75,
    weight: 0.10,
    currentDataValue: `Spec net: ${specNet >= 0 ? "+" : ""}${specNet}, Comm net: ${commNet >= 0 ? "+" : ""}${commNet}`,
    reason: `Commercials are ${bias.toLowerCase()} with net position of ${commNet >= 0 ? "+" : ""}${commNet}`,
  });
}

function addBreadthDrivers(drivers: ResearchDriver[], dataset: ResearchDataset): void {
  if (!dataset.breadth) return;

  const advances = dataset.breadth.advances ?? 0;
  const declines = dataset.breadth.declines ?? 0;
  if (advances === 0 && declines === 0) return;

  const total = advances + declines;
  const ratio = declines > 0 ? advances / declines : 2;

  let bias: DriverBias;
  let strength: DriverStrength;
  if (ratio > 1.5) { bias = "Bullish"; strength = "Strong"; }
  else if (ratio > 1.0) { bias = "Bullish"; strength = "Moderate"; }
  else if (ratio > 0.7) { bias = "Bearish"; strength = "Moderate"; }
  else { bias = "Bearish"; strength = "Strong"; }

  const score = (advances / total) * 100;

  drivers.push({
    driverId: "market-breadth",
    driverTitle: "Market Breadth",
    categoryId: "breadth",
    categoryTitle: "Market Breadth",
    bias,
    strength,
    score: Math.round(score),
    confidence: 80,
    weight: 0.10,
    currentDataValue: `${advances} advancing, ${declines} declining (ratio: ${ratio.toFixed(2)})`,
    reason: `Market breadth is ${bias.toLowerCase()} with ${advances}/${total} stocks advancing`,
  });
}

function addSectorDrivers(drivers: ResearchDriver[], dataset: ResearchDataset): void {
  if (dataset.us100?.sectorChanges) {
    const changes = dataset.us100.sectorChanges;
    const values = Object.values(changes).filter((v) => typeof v === "number");
    if (values.length === 0) return;

    const positiveCount = values.filter((v) => v > 0).length;
    const negativeCount = values.filter((v) => v < 0).length;
    const total = values.length || 1;

    let bias: DriverBias;
    let strength: DriverStrength;
    if (positiveCount > negativeCount * 2) { bias = "Bullish"; strength = "Strong"; }
    else if (positiveCount > negativeCount) { bias = "Bullish"; strength = "Moderate"; }
    else if (negativeCount > positiveCount * 2) { bias = "Bearish"; strength = "Strong"; }
    else if (negativeCount > positiveCount) { bias = "Bearish"; strength = "Moderate"; }
    else { bias = "Neutral"; strength = "Weak"; }

    const score = (positiveCount / total) * 100;

    drivers.push({
      driverId: "sector-rotation",
      driverTitle: "Sector Rotation",
      categoryId: "sector-rotation",
      categoryTitle: "Sector Rotation",
      bias,
      strength,
      score: Math.round(score),
      confidence: 70,
      weight: 0.10,
      currentDataValue: `${positiveCount} sectors positive, ${negativeCount} sectors negative`,
      reason: `Sector rotation is ${bias.toLowerCase()} with ${positiveCount}/${total} sectors positive`,
    });
  }

  if (dataset.sectors?.performances) {
    const perfs = dataset.sectors.performances;
    const positiveCount = perfs.filter((s) => s.change > 0).length;
    const negativeCount = perfs.filter((s) => s.change < 0).length;
    const total = perfs.length || 1;

    let bias: DriverBias;
    if (positiveCount > negativeCount * 2) bias = "Bullish";
    else if (positiveCount > negativeCount) bias = "Bullish";
    else if (negativeCount > positiveCount * 2) bias = "Bearish";
    else if (negativeCount > positiveCount) bias = "Bearish";
    else bias = "Neutral";

    const score = (positiveCount / total) * 100;

    drivers.push({
      driverId: "sector-performance",
      driverTitle: "Sector Performance",
      categoryId: "breadth",
      categoryTitle: "Market Breadth",
      bias,
      strength: "Moderate",
      score: Math.round(score),
      confidence: 70,
      weight: 0.05,
      currentDataValue: `${positiveCount}/${total} sectors positive`,
      reason: `Sector performance bias is ${bias.toLowerCase()}`,
    });
  }
}

function addMarketDataDrivers(drivers: ResearchDriver[], dataset: ResearchDataset): void {
  if (dataset.currentPrice !== undefined && dataset.indexValue !== undefined) {
    const change = dataset.indexChangePercent ?? 0;
    let bias: DriverBias;
    let strength: DriverStrength;
    if (change > 1) { bias = "Bullish"; strength = "Strong"; }
    else if (change > 0.3) { bias = "Bullish"; strength = "Moderate"; }
    else if (change < -1) { bias = "Bearish"; strength = "Strong"; }
    else if (change < -0.3) { bias = "Bearish"; strength = "Moderate"; }
    else { bias = "Neutral"; strength = "Weak"; }

    drivers.push({
      driverId: "price-action",
      driverTitle: "Price Action",
      categoryId: "technical",
      categoryTitle: "Technical",
      bias,
      strength,
      score: Math.round(50 + change * 10),
      confidence: 85,
      weight: 0.10,
      currentDataValue: `Price: ${dataset.currentPrice}, Change: ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
      reason: `Price action is ${bias.toLowerCase()} with ${change >= 0 ? "+" : ""}${change.toFixed(2)}% change`,
    });
  }
}
