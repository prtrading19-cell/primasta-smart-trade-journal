import type { BreadthData } from "@/types/institutional";
import { buildProviderMeta } from "@/types/institutional";
import type { BreadthParseRecord } from "./parser";

export function normalizeBreadth(
  parsed: BreadthParseRecord,
  source: string
): BreadthData {
  const advDecRatio =
    parsed.declines > 0
      ? Math.round((parsed.advances / parsed.declines) * 100) / 100
      : parsed.advances > 0
        ? parsed.advances
        : 0;

  const total = parsed.advances + parsed.declines;
  const breadthScore =
    total > 0
      ? Math.round(((parsed.advances - parsed.declines) / total) * 1000) / 10
      : 0;

  return {
    advances: parsed.advances,
    declines: parsed.declines,
    aDRatio: advDecRatio,
    newHighs: parsed.newHighs,
    newLows: parsed.newLows,
    upVolume: parsed.upVolume,
    downVolume: parsed.downVolume,
    breadthScore,
    exchange: parsed.exchange,
    timestamp: parsed.timestamp,
    meta: buildProviderMeta(source, "live"),
  };
}
