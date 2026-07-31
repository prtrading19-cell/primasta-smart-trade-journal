import type { ETFData, ETFHoldings } from "@/types/institutional";
import { buildProviderMeta } from "@/types/institutional";
import type { ETFParseRecord } from "./parser";

export function normalizeETFRecords(
  records: ETFParseRecord[],
  assetId: string,
  source: string
): ETFData {
  const holdings: ETFHoldings[] = records.map((r) => ({
    symbol: r.symbol,
    name: r.name,
    totalAssets: r.totalAssets,
    netAssetValue: r.netAssetValue,
    sharesOutstanding: r.sharesOutstanding,
    flowDirection: r.flowValue > 0 ? "Inflow" : r.flowValue < 0 ? "Outflow" : "Flat",
    changeFromPrevious: r.flowValue !== 0 ? r.flowValue : undefined,
    period: new Date().toISOString().split("T")[0],
  }));

  return {
    etfs: holdings,
    meta: buildProviderMeta(source, "live"),
  };
}
