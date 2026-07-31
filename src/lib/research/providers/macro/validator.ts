import type { MacroData } from "@/types/institutional";

export interface MacroValidationResult {
  valid: boolean;
  data: MacroData | null;
  reason?: string;
}

export function validateMacroData(
  data: MacroData
): MacroValidationResult {
  if (!data.indicators || data.indicators.length === 0) {
    return { valid: false, data: null, reason: "No macro indicators" };
  }

  for (const ind of data.indicators) {
    if (!ind.name) {
      return { valid: false, data: null, reason: "Indicator missing name" };
    }

    if (isNaN(ind.value)) {
      return { valid: false, data: null, reason: `Invalid value for ${ind.name}` };
    }

    if (!ind.releaseDate) {
      return { valid: false, data: null, reason: `Missing release date for ${ind.name}` };
    }
  }

  return { valid: true, data };
}
