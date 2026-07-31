import type { BreadthData } from "@/types/institutional";

export interface BreadthValidationResult {
  valid: boolean;
  data: BreadthData | null;
  reason?: string;
}

export function validateBreadthData(
  data: BreadthData
): BreadthValidationResult {
  if (data.advances < 0 || data.declines < 0) {
    return { valid: false, data: null, reason: "Negative advances or declines" };
  }

  if (data.advances === 0 && data.declines === 0) {
    return { valid: false, data: null, reason: "Zero advances and declines" };
  }

  if (!data.exchange) {
    return { valid: false, data: null, reason: "Missing exchange" };
  }

  return { valid: true, data };
}
