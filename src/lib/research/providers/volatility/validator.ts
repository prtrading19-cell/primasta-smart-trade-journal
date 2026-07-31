import type { VolatilityData } from "@/types/institutional";

export interface VolValidationResult {
  valid: boolean;
  data: VolatilityData | null;
  reason?: string;
}

export function validateVolData(
  data: VolatilityData
): VolValidationResult {
  const hasAny = data.vix !== null || data.vxn !== null || data.gvz !== null;

  if (!hasAny) {
    return { valid: false, data: null, reason: "No volatility index values" };
  }

  if (data.vix !== null && data.vix < 0) {
    return { valid: false, data: null, reason: "Negative VIX value" };
  }

  if (data.vxn !== null && data.vxn < 0) {
    return { valid: false, data: null, reason: "Negative VXN value" };
  }

  if (data.gvz !== null && data.gvz < 0) {
    return { valid: false, data: null, reason: "Negative GVZ value" };
  }

  return { valid: true, data };
}
