import type {
  ResearchAsset,
  ResearchProfile,
  ResearchServiceRequest,
  ResearchServiceResponse,
  ResearchEngineResult,
  ResearchFillResponse,
  ResearchSummary,
  ResearchSection,
} from "./ResearchTypes";
import type { DriverAnalysisObject } from "@/types/goldResearchConfig";
import type { TechnicalInput } from "@/types/technicalBias";
import type { InstitutionalFlowInput } from "@/types/institutionalFlow";
import { getProfile, hasProfile } from "./ResearchRegistry";
import { executeResearchEngine, buildAutoSummary } from "./ResearchEngine";

export function analyzeResearchAsset(request: ResearchServiceRequest): ResearchServiceResponse {
  console.log("[RUNTIME-AUDIT:Service] analyzeResearchAsset called. asset:", request.asset);
  console.log("[RUNTIME-AUDIT:Service] request.technicalInput:", request.technicalInput ? JSON.stringify(request.technicalInput, null, 2) : "undefined/null");
  console.log("[RUNTIME-AUDIT:Service] request.institutionalInput:", request.institutionalInput ? JSON.stringify(request.institutionalInput, null, 2) : "undefined/null");
  console.log("[RUNTIME-AUDIT:Service] request.driverAnalyses.length:", request.driverAnalyses?.length);
  console.log("[RUNTIME-AUDIT:Service] request.currentPrice:", request.currentPrice);

  if (!hasProfile(request.asset)) {
    return { success: false, error: `No profile registered for asset: ${request.asset}` };
  }

  const validation = validateResearchRequest(request);
  if (!validation.isValid) {
    return { success: false, error: validation.errors.join("; "), validation };
  }

  try {
    const analysis = executeResearchEngine(
      {
        asset: request.asset,
        driverAnalyses: request.driverAnalyses,
        currentPrice: request.currentPrice,
        timestamp: request.timestamp,
        options: request.options,
        researchBias: request.researchBias,
      },
      request.technicalInput,
      request.institutionalInput,
      request.weightConfiguration,
    );

    return { success: true, analysis, validation };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Research engine failed",
      validation,
    };
  }
}

export function validateResearchRequest(request: ResearchServiceRequest): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!request.asset) {
    errors.push("Asset is required.");
  }

  if (!hasProfile(request.asset)) {
    errors.push(`No profile registered for asset: ${request.asset}`);
  }

  if (!request.driverAnalyses || request.driverAnalyses.length === 0) {
    warnings.push("No driver analyses provided.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function buildAutoFillSummary(
  asset: ResearchAsset,
  sections: ResearchSection[],
  engineDecision?: { overallBias: string; overallConfidence: number; decision: string; overallGoldScore: number; alignmentBreakdown?: { overallAlignment: number } } | null
): ResearchSummary {
  const profile = getProfile(asset);
  if (!profile) {
    throw new Error(`No profile registered for asset: ${asset}`);
  }
  return buildAutoSummary(asset, sections, profile, engineDecision);
}

export function getResearchProfile(asset: ResearchAsset): ResearchProfile | undefined {
  return getProfile(asset);
}

export function healthCheck(): Record<ResearchAsset, boolean> {
  const assets: ResearchAsset[] = ["gold", "us100"];
  const result: Record<string, boolean> = {};
  for (const asset of assets) {
    result[asset] = hasProfile(asset);
  }
  return result as Record<ResearchAsset, boolean>;
}
