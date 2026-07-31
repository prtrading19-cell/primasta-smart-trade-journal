import type { COTReportData } from "@/types/institutional";

export interface COTValidationResult {
  valid: boolean;
  data: COTReportData;
  reason?: string;
}

export function validateCOTData(data: COTReportData): COTValidationResult {
  if (!data.reportDate) {
    return { valid: false, data, reason: "Missing report date" };
  }

  if (data.totalOpenInterest <= 0) {
    return { valid: false, data, reason: "Open interest is zero or negative" };
  }

  if (data.commercials.long < 0 || data.commercials.short < 0) {
    return {
      valid: false,
      data,
      reason: "Commercial positions contain negative values",
    };
  }

  if (data.nonCommercials.long < 0 || data.nonCommercials.short < 0) {
    return {
      valid: false,
      data,
      reason: "Non-commercial positions contain negative values",
    };
  }

  return { valid: true, data };
}
