import type { MacroData, MacroIndicator } from "@/types/institutional";
import { buildProviderMeta } from "@/types/institutional";
import type { MacroParseRecord } from "./parser";

export function normalizeMacroData(
  records: MacroParseRecord[],
  source: string
): MacroData {
  const indicators: MacroIndicator[] = records.map((r) => {
    const change = r.value - r.previous;
    const trend = computeTrend(change, r.id);

    return {
      name: r.name,
      value: r.value,
      previous: r.previous,
      change: Math.round(change * 100) / 100,
      forecast: r.forecast,
      surprise: r.surprise,
      unit: r.unit,
      impact: r.impact,
      trend,
      releaseDate: r.releaseDate,
      nextRelease: r.nextRelease,
      timestamp: new Date().toISOString(),
    };
  });

  return {
    indicators,
    meta: buildProviderMeta(source, "live"),
  };
}

function computeTrend(
  change: number,
  id: string
): MacroIndicator["trend"] {
  const lower = id.toLowerCase();

  const improvingOnRise: string[] = [
    "gdp", "payems", "nfp",
  ];
  const improvingOnFall: string[] = [
    "unrate", "cpi", "ppiaco",
  ];

  if (improvingOnRise.some((k) => lower.includes(k))) {
    if (change > 0) return "Improving";
    if (change < 0) return "Deteriorating";
    return "Stable";
  }

  if (improvingOnFall.some((k) => lower.includes(k))) {
    if (change < 0) return "Improving";
    if (change > 0) return "Deteriorating";
    return "Stable";
  }

  if (change > 0.1) return "Improving";
  if (change < -0.1) return "Deteriorating";
  return "Stable";
}
