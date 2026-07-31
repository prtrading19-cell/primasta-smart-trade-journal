import type { SectorData, SectorPerformance } from "@/types/institutional";
import { buildProviderMeta } from "@/types/institutional";
import type { SectorParseRecord } from "./parser";
import type { SectorMarketConfig } from "./provider";

export function normalizeSectorData(
  records: SectorParseRecord[],
  configs: SectorMarketConfig[],
  source: string
): SectorData {
  const configMap = new Map(configs.map((c) => [c.symbol, c]));
  const now = new Date().toISOString();

  const sectors: SectorPerformance[] = records
    .filter((r) => configMap.has(r.symbol))
    .map((r) => {
      const cfg = configMap.get(r.symbol)!;
      const strength = computeStrength(r.changePercent);

      return {
        sector: cfg.name,
        etf: r.symbol,
        price: r.price,
        change: r.change,
        changePercent: r.changePercent,
        trend: r.changePercent > 0 ? "Bullish" : r.changePercent < 0 ? "Bearish" : "Neutral",
        strength,
        volume: r.volume,
        timestamp: r.timestamp,
      };
    });

  sectors.sort((a, b) => b.changePercent - a.changePercent);

  const strongest = sectors.length > 0 ? sectors[0].etf : "";
  const weakest = sectors.length > 0 ? sectors[sectors.length - 1].etf : "";

  return {
    sectors,
    strongest,
    weakest,
    exchange: "US",
    timestamp: now,
    meta: buildProviderMeta(source, "live"),
  };
}

function computeStrength(changePercent: number): number {
  if (changePercent >= 3) return 5;
  if (changePercent >= 1) return 4;
  if (changePercent >= 0.3) return 3;
  if (changePercent > 0) return 2;
  if (changePercent === 0) return 1;
  if (changePercent > -0.3) return -2;
  if (changePercent >= -1) return -3;
  if (changePercent >= -3) return -4;
  return -5;
}
