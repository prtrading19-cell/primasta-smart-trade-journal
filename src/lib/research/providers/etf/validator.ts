import type { ETFData } from "@/types/institutional";

export interface ETFValidationResult {
  valid: boolean;
  data: ETFData | null;
  reason?: string;
}

export function validateETFData(
  data: ETFData
): ETFValidationResult {
  if (!data.meta || !data.etfs) {
    return { valid: false, data: null, reason: "Missing meta or etfs" };
  }

  if (data.etfs.length === 0) {
    return { valid: false, data: null, reason: "No ETF holdings returned" };
  }

  for (const h of data.etfs) {
    if (!h.symbol) {
      return { valid: false, data: null, reason: "ETF holding missing symbol" };
    }
    if (h.totalAssets < 0) {
      return { valid: false, data: null, reason: `Negative totalAssets for ${h.symbol}` };
    }
    if (h.netAssetValue < 0) {
      return { valid: false, data: null, reason: `Negative NAV for ${h.symbol}` };
    }
  }

  return { valid: true, data };
}
