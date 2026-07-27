import type { DriverAnalysisObject, DriverBias, DriverStrength } from "@/types/goldResearchConfig";
import type { US100FullDataset } from "./us100DataOrchestrator";
import { US100_MEGA_CAP_SYMBOLS } from "@/types/us100";

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

export function mapUS100DataToEngine(dataset: US100FullDataset): DriverAnalysisObject[] {
  const drivers: DriverAnalysisObject[] = [];
  const ts = dataset.collectedAt;

  // ─── Market Overview (7 drivers) ───────────────────────────────────────────────
  if (dataset.index.meta.status === "live") {
    const idx = dataset.index;
    const priceBias = inferBiasFromChange(idx.changePercent);
    drivers.push(buildBase({
      driverId: "us100-price", driverTitle: "US100 Price", categoryId: "market-overview",
      bias: priceBias.bias, biasReason: priceBias.reason,
      strength: inferStrengthFromChange(idx.changePercent),
      confidence: 85, confidenceReason: "Live FMP data",
      technicalObservation: `Current: ${idx.price.toFixed(2)}, Range: ${idx.low.toFixed(2)}–${idx.high.toFixed(2)}`,
      source: "FMP", weight: 1.0, contribution: priceBias.bias.includes("Bullish") ? 1.0 : priceBias.bias.includes("Bearish") ? -1.0 : 0,
      dataFields: { price: String(idx.price), open: String(idx.open), high: String(idx.high), low: String(idx.low), previousClose: String(idx.previousClose) },
    }));
    const dailyBias = inferBiasFromChange(idx.changePercent);
    drivers.push(buildBase({
      driverId: "us100-daily-pct", driverTitle: "Daily %", categoryId: "market-overview",
      bias: dailyBias.bias, biasReason: dailyBias.reason,
      strength: inferStrengthFromChange(idx.changePercent),
      confidence: 90, confidenceReason: "Live calculation from FMP data",
      technicalObservation: `Daily change: ${idx.changePercent >= 0 ? "+" : ""}${idx.changePercent.toFixed(2)}%`,
      source: "FMP", weight: 1.0, contribution: idx.changePercent,
      dataFields: { dailyChange: `${idx.changePercent.toFixed(2)}%`, dailyChangeAbs: String(idx.change) },
    }));
    drivers.push(buildBase({
      driverId: "us100-weekly-pct", driverTitle: "Weekly %", categoryId: "market-overview",
      bias: dailyBias.bias, biasReason: "Derived from daily movement",
      strength: "Weak", confidence: 50, confidenceReason: "Estimated from daily data",
      source: "FMP", weight: 1.0, contribution: 0,
      dataFields: { weeklyChange: "Estimated" },
    }));
    drivers.push(buildBase({
      driverId: "us100-session-high", driverTitle: "Session High", categoryId: "market-overview",
      bias: idx.price >= idx.high * 0.99 ? "Bullish" : "Neutral",
      biasReason: `Session high: ${idx.high.toFixed(2)}`,
      strength: "Weak", confidence: 80, confidenceReason: "Live FMP data",
      source: "FMP", weight: 1.0, contribution: 0,
      dataFields: { sessionHigh: String(idx.high) },
    }));
    drivers.push(buildBase({
      driverId: "us100-session-low", driverTitle: "Session Low", categoryId: "market-overview",
      bias: idx.price <= idx.low * 1.01 ? "Bearish" : "Neutral",
      biasReason: `Session low: ${idx.low.toFixed(2)}`,
      strength: "Weak", confidence: 80, confidenceReason: "Live FMP data",
      source: "FMP", weight: 1.0, contribution: 0,
      dataFields: { sessionLow: String(idx.low) },
    }));
    drivers.push(buildBase({
      driverId: "us100-volume", driverTitle: "Volume", categoryId: "market-overview",
      bias: "Neutral", biasReason: `Volume: ${idx.volume}`,
      strength: "None", confidence: 70, confidenceReason: "Live FMP data",
      source: "FMP", weight: 1.0, contribution: 0,
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

  // ─── Mega Cap Leadership (10 drivers) ──────────────────────────────────────────
  const megaCapMap: Record<string, string> = {
    AAPL: "us100-apple", MSFT: "us100-microsoft", NVDA: "us100-nvidia",
    AMZN: "us100-amazon", META: "us100-meta", GOOGL: "us100-alphabet",
    TSLA: "us100-tesla", AVGO: "us100-broadcom", AMD: "us100-amd", NFLX: "us100-netflix",
  };
  const nameMap: Record<string, string> = {
    AAPL: "Apple", MSFT: "Microsoft", NVDA: "NVIDIA", AMZN: "Amazon",
    META: "Meta", GOOGL: "Alphabet", TSLA: "Tesla", AVGO: "Broadcom", AMD: "AMD", NFLX: "Netflix",
  };

  for (const symbol of US100_MEGA_CAP_SYMBOLS) {
    const stock = dataset.stocks.find((s) => s.symbol === symbol);
    if (stock && stock.meta.status === "live") {
      const stockBias = inferBiasFromChange(stock.changePercent);
      drivers.push(buildBase({
        driverId: megaCapMap[symbol], driverTitle: nameMap[symbol], categoryId: "mega-cap",
        bias: stockBias.bias, biasReason: stockBias.reason,
        strength: inferStrengthFromChange(stock.changePercent),
        confidence: 85, confidenceReason: "Live Twelve Data quote",
        technicalObservation: `${symbol}: $${stock.price.toFixed(2)} (${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent.toFixed(2)}%)`,
        source: "Twelve Data", weight: getDriverWeight(megaCapMap[symbol]),
        contribution: stock.changePercent,
        dataFields: { price: String(stock.price), change: `${stock.changePercent.toFixed(2)}%`, volume: String(stock.volume), marketCap: String(stock.marketCap) },
      }));
    } else {
      drivers.push(buildBase({
        driverId: megaCapMap[symbol], driverTitle: nameMap[symbol], categoryId: "mega-cap",
        bias: "Neutral", biasReason: "Live Data Unavailable",
        strength: "None", confidence: 0, confidenceReason: "No data received",
        source: "Twelve Data", weight: getDriverWeight(megaCapMap[symbol]),
        dataFields: { status: "unavailable" },
      }));
    }
  }

  // ─── Macro Environment (7 drivers) — placeholders for data not yet available ─────
  const macroDrivers = [
    { id: "us100-fed", title: "Federal Reserve", source: "news-api" },
    { id: "us100-dxy", title: "DXY", source: "twelvedata" },
    { id: "us100-treasury-yields", title: "Treasury Yields", source: "twelvedata" },
    { id: "us100-inflation", title: "Inflation", source: "news-api" },
    { id: "us100-employment", title: "Employment", source: "news-api" },
    { id: "us100-gdp", title: "GDP", source: "news-api" },
    { id: "us100-econ-calendar", title: "Economic Calendar", source: "news-api" },
  ];
  for (const m of macroDrivers) {
    drivers.push(buildBase({
      driverId: m.id, driverTitle: m.title, categoryId: "macro",
      bias: "Neutral", biasReason: "Awaiting macro data provider integration",
      strength: "None", confidence: 20, confidenceReason: "Placeholder — no live data yet",
      source: m.source as DriverAnalysisObject["source"], weight: getDriverWeight(m.id),
      dataFields: { status: "awaiting_integration" },
    }));
  }

  // ─── Earnings (5 drivers) ──────────────────────────────────────────────────────
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

  // ─── Breadth (4 drivers) — placeholders ────────────────────────────────────────
  const breadthDrivers = [
    { id: "us100-ad", title: "Advance/Decline" },
    { id: "us100-new-highs", title: "New Highs" },
    { id: "us100-new-lows", title: "New Lows" },
    { id: "us100-breadth-score", title: "Breadth Score" },
  ];
  for (const b of breadthDrivers) {
    drivers.push(buildBase({
      driverId: b.id, driverTitle: b.title, categoryId: "breadth",
      bias: "Neutral", biasReason: "Awaiting breadth data provider integration",
      strength: "None", confidence: 15, confidenceReason: "Placeholder — no live data yet",
      source: "composite", weight: 1.0, dataFields: { status: "awaiting_integration" },
    }));
  }

  // ─── Volatility (3 drivers) ────────────────────────────────────────────────────
  const vol = dataset.volatility;
  if (vol.meta.status === "live") {
    const vixBias: DriverBias = (vol.vix ?? 0) > 25 ? "Bearish" : (vol.vix ?? 0) > 20 ? "Mixed-Wait" as unknown as DriverBias : "Bullish";
    drivers.push(buildBase({
      driverId: "us100-vix", driverTitle: "VIX", categoryId: "volatility",
      bias: vixBias, biasReason: `VIX at ${vol.vix ?? "N/A"}, trend: ${vol.trend}`,
      strength: vol.riskRating === "Extreme" || vol.riskRating === "High" ? "Strong" : "Moderate",
      confidence: 85, confidenceReason: "Live FMP VIX data",
      source: "FMP", weight: 1.0, contribution: vixBias.includes("Bearish") ? -1.5 : 1.0,
      dataFields: { vix: String(vol.vix), vixChange: String(vol.vixChange), trend: vol.trend },
    }));
    const vxnBias: DriverBias = (vol.vxn ?? 0) > 28 ? "Bearish" : (vol.vxn ?? 0) > 22 ? "Mixed-Wait" as unknown as DriverBias : "Bullish";
    drivers.push(buildBase({
      driverId: "us100-vxn", driverTitle: "VXN", categoryId: "volatility",
      bias: vxnBias, biasReason: `VXN at ${vol.vxn ?? "N/A"}, trend: ${vol.trend}`,
      strength: vol.riskRating === "Extreme" || vol.riskRating === "High" ? "Strong" : "Moderate",
      confidence: 85, confidenceReason: "Live FMP VXN data",
      source: "FMP", weight: 1.0, contribution: vxnBias.includes("Bearish") ? -1.5 : 1.0,
      dataFields: { vxn: String(vol.vxn), vxnChange: String(vol.vxnChange), trend: vol.trend },
    }));
    const riskBias: DriverBias = vol.riskRating === "Extreme" || vol.riskRating === "High" ? "Bearish" : vol.riskRating === "Moderate" ? "Neutral" : "Bullish";
    drivers.push(buildBase({
      driverId: "us100-risk-rating", driverTitle: "Risk Rating", categoryId: "volatility",
      bias: riskBias, biasReason: `Risk: ${vol.riskRating}, Trend: ${vol.trend}`,
      strength: vol.riskRating === "Extreme" ? "Strong" : "Moderate",
      confidence: 80, confidenceReason: "Composite from VIX/VXN",
      source: "composite", weight: 1.0, contribution: riskBias.includes("Bearish") ? -2 : 0,
      dataFields: { riskRating: vol.riskRating, trend: vol.trend },
    }));
  }

  // ─── ETF Flow (4 drivers) — placeholders ───────────────────────────────────────
  const etfDrivers = [
    { id: "us100-qqq", title: "QQQ" },
    { id: "us100-tqqq", title: "TQQQ" },
    { id: "us100-sqqq", title: "SQQQ" },
    { id: "us100-net-flow", title: "Net Flow" },
  ];
  for (const e of etfDrivers) {
    drivers.push(buildBase({
      driverId: e.id, driverTitle: e.title, categoryId: "etf-flow",
      bias: "Neutral", biasReason: "Awaiting ETF flow data provider integration",
      strength: "None", confidence: 15, confidenceReason: "Placeholder — no live data yet",
      source: "composite", weight: 1.0, dataFields: { status: "awaiting_integration" },
    }));
  }

  // ─── Sector Rotation (9 drivers) ───────────────────────────────────────────────
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
        confidence: 80, confidenceReason: "FMP sector ETF data",
        source: "FMP", weight, contribution: change,
        dataFields: { dailyChange: `${change.toFixed(2)}%`, etf: dataset.sectors.meta.source },
      }));
    }
  }

  // ─── Technical (6 drivers) — placeholders ──────────────────────────────────────
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

  // ─── Sentiment (1 driver) ──────────────────────────────────────────────────────
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
  }
  const vol = dataset.volatility;
  if (vol.meta.status === "live") {
    lines.push(`VIX: ${vol.vix ?? "N/A"} | VXN: ${vol.vxn ?? "N/A"} | Risk: ${vol.riskRating}`);
  }
  if (dataset.stocks.length > 0) {
    const topGainer = [...dataset.stocks].filter((s) => s.meta.status === "live").sort((a, b) => b.changePercent - a.changePercent)[0];
    const topLoser = [...dataset.stocks].filter((s) => s.meta.status === "live").sort((a, b) => a.changePercent - b.changePercent)[0];
    if (topGainer) lines.push(`Top Gainer: ${topGainer.symbol} +${topGainer.changePercent.toFixed(2)}%`);
    if (topLoser) lines.push(`Top Loser: ${topLoser.symbol} ${topLoser.changePercent.toFixed(2)}%`);
  }
  return lines.join(" | ");
}
