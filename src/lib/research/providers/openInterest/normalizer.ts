import type { OpenInterestRecord } from "@/types/institutional";
import { buildProviderMeta } from "@/types/institutional";
import type { OIParseRecord } from "./parser";

export function normalizeOIRecord(
  record: OIParseRecord,
  assetId: string,
  source: string
): OpenInterestRecord {
  const change = record.openInterest - record.previousOI;

  return {
    assetId,
    contractName: record.name,
    currentLevel: record.openInterest,
    changeFromPrevious: change,
    highLevel: change > 0,
    lowLevel: change < 0,
    trend: change > 0 ? "Rising" : change < 0 ? "Falling" : "Flat",
    exchange: record.exchange,
    reportDate: record.reportDate,
    meta: buildProviderMeta(source, "live"),
  };
}
