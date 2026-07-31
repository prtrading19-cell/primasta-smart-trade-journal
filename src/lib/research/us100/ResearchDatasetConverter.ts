import type { ResearchDataset, StockQuote, EarningsEntry, MarketMoversEntry } from "../models";
import type { VolatilityData } from "@/types/institutional";
import type { US100FullDataset } from "./us100DataOrchestrator";
import type { US100Index } from "@/types/us100";

const SECTOR_KEYS = ["technology", "semiconductors", "healthcare", "financials", "industrials", "energy", "utilities", "consumer", "communication"] as const;

export function convertUS100DatasetToResearch(dataset: US100FullDataset): ResearchDataset {
  const effectiveIndex: US100Index = dataset.index.meta.status === "live" ? dataset.index : dataset.derivedIndex;
  const now = dataset.collectedAt;

  const stocks: StockQuote[] = dataset.stocks.map((s) => ({
    symbol: s.symbol ?? "",
    price: s.price ?? 0,
    change: s.change ?? 0,
    changePercent: s.changePercent ?? 0,
    volume: s.volume,
  }));

  const earnings: EarningsEntry[] = (dataset.earnings ?? []).map((e) => ({
    symbol: e.symbol ?? "",
    date: e.earningsDate ?? "",
    eps: e.previousEPS ?? undefined,
    epsEstimated: e.estimateEPS ?? undefined,
  }));

  const sectorChanges: Record<string, number> = {};
  for (const key of SECTOR_KEYS) {
    const val = (dataset.sectors as any)?.[key];
    if (typeof val === "number") sectorChanges[key] = val;
  }

  const movers: { topGainers: MarketMoversEntry[]; topLosers: MarketMoversEntry[] } | undefined =
    dataset.movers ? {
      topGainers: (dataset.movers.topGainers ?? []).map((m) => ({
        symbol: m.symbol ?? "",
        price: m.price ?? 0,
        change: m.change ?? 0,
        changePercent: m.changePercent ?? 0,
        volume: m.volume,
      })),
      topLosers: (dataset.movers.topLosers ?? []).map((m) => ({
        symbol: m.symbol ?? "",
        price: m.price ?? 0,
        change: m.change ?? 0,
        changePercent: m.changePercent ?? 0,
        volume: m.volume,
      })),
    } : undefined;

  return {
    asset: "us100",
    collectedAt: now,
    currentPrice: effectiveIndex.price,
    indexValue: effectiveIndex.price,
    indexChange: effectiveIndex.change,
    indexChangePercent: effectiveIndex.changePercent,

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

    us100: {
      stocks,
      earnings,
      sectorChanges,
      movers,
      volatilityIndex: {
        vix: dataset.volatility.vix ?? undefined,
        vxn: dataset.volatility.vxn ?? undefined,
        meta: dataset.volatility.meta as any,
      },
    },
  };
}
