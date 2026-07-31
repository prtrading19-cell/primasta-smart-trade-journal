import type { SectorData } from "@/types/institutional";

export interface SectorValidationResult {
  valid: boolean;
  data: SectorData | null;
  reason?: string;
}

export function validateSectorData(
  data: SectorData
): SectorValidationResult {
  if (!data.sectors || data.sectors.length === 0) {
    return { valid: false, data: null, reason: "No sector records" };
  }

  for (const s of data.sectors) {
    if (!s.etf || !s.sector) {
      return { valid: false, data: null, reason: `Invalid sector record: ${s.etf || "missing etf"}` };
    }
    if (isNaN(s.changePercent)) {
      return { valid: false, data: null, reason: `Invalid changePercent for ${s.etf}` };
    }
  }

  return { valid: true, data };
}
