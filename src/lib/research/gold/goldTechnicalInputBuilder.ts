import type { TechnicalInput, VolatilityLevel } from "@/types/technicalBias";
import type { GoldFullDataset } from "./goldDataOrchestrator";
import type { VolatilityData } from "@/types/institutional";

export function buildGoldTechnicalInput(dataset: GoldFullDataset): TechnicalInput {
  const timestamp = dataset.collectedAt;
  const currentPrice = dataset.meta.status === "live" ? dataset.goldPrice : undefined;

  return {
    timeframe: "D1",
    currentPrice,
    timestamp,
    trend: { direction: "Unknown", strength: "None" },
    volatility: deriveVolatility(dataset),
  };
}

function deriveVolatility(dataset: GoldFullDataset): TechnicalInput["volatility"] {
  const volInst = dataset.volatilityInstitutional;

  if (volInst && volInst.meta.status === "live") {
    const gvz = volInst.gvz ?? 0;
    let level: VolatilityLevel;
    if (gvz > 30) level = "High";
    else if (gvz > 18) level = "Moderate";
    else level = "Low";

    return {
      level,
      atrValue: gvz,
      description: `GVZ: ${gvz.toFixed(2)} | Trend: ${volInst.trend} | Risk: ${volInst.riskRating}`,
    };
  }

  return { level: "Unknown" };
}
