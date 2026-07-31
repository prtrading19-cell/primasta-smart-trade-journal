import type { OpenInterestRecord } from "@/types/institutional";

export interface OIValidationResult {
  valid: boolean;
  data: OpenInterestRecord | null;
  reason?: string;
}

export function validateOIData(
  data: OpenInterestRecord
): OIValidationResult {
  if (!data.reportDate) {
    return { valid: false, data: null, reason: "Missing report date" };
  }

  if (data.currentLevel < 0) {
    return { valid: false, data: null, reason: "Negative open interest" };
  }

  if (!data.contractName) {
    return { valid: false, data: null, reason: "Missing contract name" };
  }

  return { valid: true, data };
}
