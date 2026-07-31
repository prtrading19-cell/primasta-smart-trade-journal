import type { ResearchDataset } from "../models";
import type { VolatilityData } from "@/types/institutional";
import type { GoldFullDataset } from "./goldDataOrchestrator";

export function convertGoldDatasetToResearch(dataset: GoldFullDataset): ResearchDataset {
  const now = dataset.collectedAt;

  return {
    asset: "gold",
    collectedAt: now,
    currentPrice: dataset.goldPrice,
    indexValue: dataset.goldPrice,
    indexChange: dataset.goldChange,
    indexChangePercent: dataset.goldChangePercent,

    macro: dataset.macro ? {
      indicators: dataset.macro.indicators ?? [],
      meta: dataset.macro.meta,
    } : undefined,

    volatility: dataset.volatilityInstitutional as VolatilityData | undefined,

    etf: dataset.etf ? {
      etfs: dataset.etf.etfs ?? [],
      meta: dataset.etf.meta,
    } : undefined,

    cot: dataset.cot,

    openInterest: dataset.openInterest ? {
      records: dataset.openInterest,
      meta: dataset.openInterest[0]?.meta ?? { source: "open-interest", status: "live", timestamp: now, latency: 0 },
    } : undefined,

    breadth: dataset.breadth && dataset.breadth.length > 0 ? dataset.breadth[0] : undefined,

    sectors: dataset.sectorRotation ? {
      performances: (dataset.sectorRotation as any).sectors ?? (dataset.sectorRotation as any).performances ?? [],
      meta: dataset.sectorRotation.meta,
    } : undefined,

    gold: {
      gvz: dataset.volatilityInstitutional?.gvz != null ? dataset.volatilityInstitutional.gvz : undefined,
    },
  };
}
