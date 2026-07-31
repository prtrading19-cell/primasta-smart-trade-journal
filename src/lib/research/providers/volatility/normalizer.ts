import type { VolatilityData } from "@/types/institutional";
import { buildProviderMeta } from "@/types/institutional";
import type { VolParseRecord } from "./parser";

export function normalizeVolatility(
  records: VolParseRecord[],
  source: string
): VolatilityData {
  const bySymbol = new Map<string, VolParseRecord>();
  for (const r of records) {
    bySymbol.set(r.symbol.toUpperCase(), r);
  }

  const vix = bySymbol.get("^VIX") ?? bySymbol.get("VIX");
  const vxn = bySymbol.get("^VXN") ?? bySymbol.get("VXN");
  const gvz = bySymbol.get("^GVZ") ?? bySymbol.get("GVZ");

  const primary = vxn ?? vix ?? gvz;

  return {
    vix: vix?.price ?? null,
    vixChange: vix?.change ?? null,
    vixChangePercent: vix?.changePercent ?? null,
    vxn: vxn?.price ?? null,
    vxnChange: vxn?.change ?? null,
    vxnChangePercent: vxn?.changePercent ?? null,
    gvz: gvz?.price ?? null,
    gvzChange: gvz?.change ?? null,
    gvzChangePercent: gvz?.changePercent ?? null,
    trend: deriveTrend(primary?.price ?? null),
    riskRating: deriveRiskRating(primary?.price ?? null),
    meta: buildProviderMeta(source, "live"),
  };
}

function deriveTrend(price: number | null): VolatilityData["trend"] {
  if (price === null) return "Normal";
  if (price >= 25) return "Elevated";
  if (price <= 12) return "Low";
  return "Normal";
}

function deriveRiskRating(price: number | null): VolatilityData["riskRating"] {
  if (price === null) return "Moderate";
  if (price >= 35) return "Extreme";
  if (price >= 25) return "High";
  if (price >= 15) return "Moderate";
  return "Low";
}
