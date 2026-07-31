import type { TechnicalInput, TrendDirection, TrendStrength, VolatilityLevel } from "@/types/technicalBias";
import type { US100FullDataset } from "./us100DataOrchestrator";
import type { VolatilityData } from "@/types/institutional";

export function buildUS100TechnicalInput(dataset: US100FullDataset): TechnicalInput {
  const timestamp = dataset.collectedAt;
  const effectiveIndex = dataset.index.meta.status === "live" ? dataset.index : dataset.derivedIndex;
  const currentPrice = effectiveIndex.meta.status === "live" ? effectiveIndex.price : undefined;

  return {
    timeframe: "D1",
    currentPrice,
    timestamp,
    trend: deriveTrend(dataset),
    volatility: deriveVolatility(dataset),
  };
}

function deriveTrend(dataset: US100FullDataset): TechnicalInput["trend"] {
  const liveStocks = dataset.stocks.filter((s) => s.meta.status === "live");
  if (liveStocks.length === 0) return { direction: "Unknown", strength: "None" };

  const bullishCount = liveStocks.filter((s) => s.changePercent > 0.5).length;
  const bearishCount = liveStocks.filter((s) => s.changePercent < -0.5).length;
  const total = liveStocks.length;

  const bullishRatio = bullishCount / total;
  const bearishRatio = bearishCount / total;

  let direction: TrendDirection;
  if (bullishRatio >= 0.6) direction = "Bullish";
  else if (bearishRatio >= 0.6) direction = "Bearish";
  else direction = "Sideways";

  const agreement = Math.max(bullishRatio, bearishRatio);
  let strength: TrendStrength;
  if (agreement >= 0.8) strength = "Strong";
  else if (agreement >= 0.6) strength = "Moderate";
  else strength = "Weak";

  const avgChange = liveStocks.reduce((sum, s) => sum + s.changePercent, 0) / total;
  const description = `Mega cap consensus: ${bullishCount} bullish, ${bearishCount} bearish, avg change ${avgChange >= 0 ? "+" : ""}${avgChange.toFixed(2)}%`;

  return { direction, strength, description };
}

function deriveVolatility(dataset: US100FullDataset): TechnicalInput["volatility"] {
  const volInst = dataset.volatilityInstitutional;
  const vol = volInst && volInst.meta.status === "live" ? volInst : dataset.volatility;

  if (vol.meta.status !== "live") {
    return { level: "Unknown" };
  }

  let vix: number;
  let vxn: number | null;
  let trend: string;
  let riskRating: string;

  if ("vix" in vol && typeof (vol as VolatilityData).vix === "number") {
    const vd = vol as VolatilityData;
    vix = vd.vix ?? 0;
    vxn = vd.vxn ?? null;
    trend = vd.trend;
    riskRating = vd.riskRating;
  } else {
    const lv = vol as typeof dataset.volatility;
    vix = lv.vix ?? 0;
    vxn = lv.vxn ?? null;
    trend = lv.trend;
    riskRating = lv.riskRating;
  }

  let level: VolatilityLevel;
  if (vix > 30) level = "High";
  else if (vix > 20) level = "Moderate";
  else level = "Low";

  return {
    level,
    atrValue: vix,
    description: `VIX: ${vix.toFixed(2)} | VXN: ${vxn?.toFixed(2) ?? "N/A"} | Trend: ${trend} | Risk: ${riskRating}`,
  };
}
