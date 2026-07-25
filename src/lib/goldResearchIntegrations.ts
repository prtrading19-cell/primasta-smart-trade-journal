import type { DriverAnalysisObject, DriverBias, DriverStrength, WeightConfiguration } from "@/types/goldResearchConfig";
import type { GoldAutoFillResponse, GoldAutoResearchSection, GoldDriverAnalysis, GoldResearchReport } from "@/types/goldResearch";
import type { TechnicalInput } from "@/types/technicalBias";
import type { InstitutionalFlowInput } from "@/types/institutionalFlow";
import type { GoldResearchServiceRequest, GoldResearchServiceResponse } from "@/types/goldResearchService";
import type { GoldResearchAnalysis, OrchestratorOptions } from "@/types/goldResearchAnalysis";
import { DRIVER_REGISTRY, getDriverIdByTitle, getEnabledDrivers } from "@/config/driverRegistry";
import { CATEGORY_DEFINITIONS } from "@/config/categoryConfig";
import { analyzeResearch } from "@/lib/goldResearchService";
import { getResearchBiasFromSections } from "@/lib/goldAutoResearch";

const AUTO_DRIVER_TO_REGISTRY_ID: Record<string, string> = {
  "DXY / US Dollar Check": "dxy-us-dollar",
  "US Yields Check": "us-yields",
  "Real Yields Check": "real-yields",
  "Fed Tone / FOMC Check": "fed-tone-fomc",
  "CPI / PCE Inflation Check": "cpi-pce",
  "NFP / Jobs Check": "nfp-jobs",
  "Geopolitics / Risk Sentiment Check": "geopolitics",
  "ETF / Central Bank Demand Check": "etf-flows",
  "Gold Technical Structure Check": "gold-technical-structure",
  "Economic Growth Check": "economic-growth",
  "Gold ETF Flows Check": "etf-flows",
  "Central Bank Demand Check": "central-bank-demand",
  "Market Sentiment Check": "market-sentiment",
  "Crowd Positioning Check": "crowd-positioning",
  "Liquidity Conditions Check": "liquidity-conditions",
  "Seasonality Check": "seasonality",
  "Position Risk Check": "position-risk"
};

export function adaptAutoFillToDriverAnalyses(report: GoldAutoFillResponse): DriverAnalysisObject[] {
  const timestamp = new Date().toISOString();
  const results: DriverAnalysisObject[] = [];
  const seen = new Set<string>();

  for (const section of report.sections) {
    const registryId = AUTO_DRIVER_TO_REGISTRY_ID[section.driver];
    if (!registryId || seen.has(registryId)) continue;
    seen.add(registryId);

    const entry = DRIVER_REGISTRY.find((d) => d.id === registryId);
    if (!entry) continue;

    results.push(sectionToDriverAnalysis(section, entry, timestamp));
  }

  return results;
}

export function adaptManualReportsToDriverAnalyses(reports: GoldResearchReport[]): DriverAnalysisObject[] {
  const timestamp = new Date().toISOString();
  const byDriver = new Map<string, GoldResearchReport>();

  for (const report of reports) {
    const existing = byDriver.get(report.driverName);
    if (!existing || new Date(report.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
      byDriver.set(report.driverName, report);
    }
  }

  const results: DriverAnalysisObject[] = [];

  for (const [driverName, report] of byDriver) {
    const registryId = getDriverIdByTitle(driverName);
    const entry = registryId ? DRIVER_REGISTRY.find((d) => d.id === registryId) : undefined;

    results.push(manualReportToDriverAnalysis(report, entry, timestamp));
  }

  return results;
}

export function adaptAutoFillToTechnicalInput(report: GoldAutoFillResponse): TechnicalInput | undefined {
  const technicalSection = report.sections.find(
    (s) => s.driver === "Gold Technical Structure Check"
  );

  if (!technicalSection) return undefined;

  const structure = mapMarketStructure(technicalSection.marketStructure);
  const htfBias = mapTrendDirection(technicalSection.higherTimeframeBias);

  return {
    timestamp: new Date().toISOString(),
    structure: {
      marketStructure: structure,
      higherTimeframeStructure: htfBias ?? "Unknown",
      dailyStructure: htfBias ?? "Unknown",
      supportLevels: technicalSection.keySupport ? [technicalSection.keySupport] : [],
      resistanceLevels: technicalSection.keyResistance ? [technicalSection.keyResistance] : [],
      liquiditySweep: technicalSection.setupPresent === "Yes" ? "Yes" : "No",
      orderBlock: technicalSection.chartObservation || undefined
    },
    trend: { direction: htfBias ?? "Unknown", strength: "Moderate" }
  };
}

export function adaptAutoFillToInstitutionalInput(report: GoldAutoFillResponse): InstitutionalFlowInput | undefined {
  const etfSection = report.sections.find((s) => s.driver === "ETF / Central Bank Demand Check" || s.driver === "Gold ETF Flows Check");
  const cbSection = report.sections.find((s) => s.driver === "Central Bank Demand Check");
  const crowdSection = report.sections.find((s) => s.driver === "Crowd Positioning Check");
  const sentimentSection = report.sections.find((s) => s.driver === "Market Sentiment Check");
  const liquiditySection = report.sections.find((s) => s.driver === "Liquidity Conditions Check");

  const hasData = etfSection || cbSection || crowdSection || sentimentSection;
  if (!hasData) return undefined;

  return {
    timestamp: new Date().toISOString(),
    etfFlows: etfSection
      ? {
          direction: mapFlowDirection(etfSection.etfFlowDirection),
          magnitude: etfSection.etfFlowMagnitude ? "Moderate" : undefined,
          source: etfSection.sourceLink || undefined,
          notes: etfSection.reason || undefined
        }
      : undefined,
    centralBank: cbSection
      ? {
          buyingVolume: cbSection.cbBuyingVolume ? "Moderate" : undefined,
          sellingVolume: cbSection.cbSellingVolume ? "Moderate" : undefined,
          notes: cbSection.centralBankDemand || undefined,
          source: cbSection.sourceLink || undefined
        }
      : undefined,
    crowdPositioning: crowdSection
      ? {
          retailBias: mapPositioningBias(crowdSection.retailPositioning),
          institutionalBias: mapPositioningBias(crowdSection.institutionalPositioning),
          crowdedTradeRisk: mapCrowdingLevel(crowdSection.crowdedTradeRisk),
          notes: crowdSection.reason || undefined,
          source: crowdSection.sourceLink || undefined
        }
      : undefined,
    openInterest: liquiditySection
      ? {
          trend: mapFlowDirection(liquiditySection.fundingConditions),
          notes: liquiditySection.reason || undefined,
          source: liquiditySection.sourceLink || undefined
        }
      : undefined
  };
}

export function buildEnhancedAnalysis(
  report: GoldAutoFillResponse,
  options?: OrchestratorOptions
): GoldResearchAnalysis {
  const driverAnalyses = adaptAutoFillToDriverAnalyses(report);
  const technicalInput = adaptAutoFillToTechnicalInput(report);
  const institutionalInput = adaptAutoFillToInstitutionalInput(report);

  const currentPrice = parsePrice(report.goldCurrentPrice);
  const researchBias = getResearchBiasFromSections(report.sections);

  const serviceRequest: GoldResearchServiceRequest = {
    driverAnalyses,
    technicalInput,
    institutionalInput,
    currentPrice,
    timestamp: new Date().toISOString(),
    notes: `Enhanced from auto-fill report dated ${report.date}`,
    options,
    researchBias
  };

  const response = analyzeResearch(serviceRequest);

  if (response.success && response.analysis) {
    return response.analysis;
  }

  return buildFallbackAnalysis(driverAnalyses, currentPrice);
}

export function buildEnhancedAnalysisFromManual(
  reports: GoldResearchReport[],
  currentPrice?: number,
  options?: OrchestratorOptions
): GoldResearchAnalysis {
  const driverAnalyses = adaptManualReportsToDriverAnalyses(reports);
  const researchBias = getManualReportsBias(reports);

  const serviceRequest: GoldResearchServiceRequest = {
    driverAnalyses,
    currentPrice,
    timestamp: new Date().toISOString(),
    notes: `Enhanced from ${reports.length} manual driver reports`,
    options,
    researchBias
  };

  const response = analyzeResearch(serviceRequest);

  if (response.success && response.analysis) {
    return response.analysis;
  }

  return buildFallbackAnalysis(driverAnalyses, currentPrice);
}

function sectionToDriverAnalysis(
  section: GoldAutoResearchSection,
  entry: { id: string; title: string; category: string; weight: number },
  timestamp: string
): DriverAnalysisObject {
  const bias = mapAutoImpactToBias(section.goldImpact);
  const strength = mapAutoImpactToStrength(section.goldImpact);

  return {
    driverId: entry.id,
    driverTitle: entry.title,
    categoryId: entry.category,
    bias,
    biasReason: section.reason || section.newsSummary || "Auto-fill analysis",
    strength,
    strengthFactors: [section.currentDataValue, section.direction].filter(Boolean),
    confidence: bias === "Neutral" ? 50 : 70,
    confidenceReason: section.reason || "Based on auto-fill data",
    trend: mapAutoDirectionToTrend(section.direction),
    technicalObservation: section.chartObservation || "No chart observation",
    supportingDrivers: [],
    conflictingDrivers: [],
    reason: section.reason || section.newsSummary || "Auto-fill data",
    aiExplanation: section.reason || `${section.driver}: ${section.goldImpact}`,
    source: section.sourceLink || "auto-fill",
    sourceUrl: section.sourceLink || "",
    timestamp,
    weight: entry.weight,
    contribution: 0,
    dataFields: {
      currentDataValue: section.currentDataValue,
      direction: section.direction,
      newsHeadline: section.newsHeadline,
      newsSummary: section.newsSummary
    }
  };
}

function manualReportToDriverAnalysis(
  report: GoldResearchReport,
  entry: { id: string; title: string; category: string; weight: number } | undefined,
  timestamp: string
): DriverAnalysisObject {
  const registryId = entry?.id ?? report.driverName.toLowerCase().replace(/\s+/g, "-");
  const category = entry?.category ?? "macro";
  const bias = mapManualBias(report.goldBias);

  return {
    driverId: registryId,
    driverTitle: report.driverName,
    categoryId: category,
    bias,
    biasReason: report.explanation || report.finalGuidance || "Manual analysis",
    strength: report.impactLevel === "High" ? "Strong" : report.impactLevel === "Medium" ? "Moderate" : "Weak",
    strengthFactors: [...report.bullishGoldClues.slice(0, 3), ...report.bearishGoldClues.slice(0, 3)],
    confidence: report.confidenceScore,
    confidenceReason: report.explanation || "Manual driver analysis",
    technicalObservation: report.chartObservationInterpretation || "No chart observation",
    supportingDrivers: report.bullishGoldClues.slice(0, 3),
    conflictingDrivers: report.bearishGoldClues.slice(0, 3),
    reason: report.finalGuidance || report.explanation || "Manual analysis",
    aiExplanation: report.explanation || report.goldMeaning || "Manual analysis",
    source: report.sourceLink || "manual",
    sourceUrl: report.sourceLink || "",
    timestamp,
    weight: entry?.weight ?? 1.0,
    contribution: 0,
    dataFields: report.driverFields ?? {}
  };
}

function buildFallbackAnalysis(
  driverAnalyses: DriverAnalysisObject[],
  currentPrice?: number
): GoldResearchAnalysis {
  const timestamp = new Date().toISOString();
  return {
    rawInputs: { driverAnalyses, currentPrice },
    driverAnalyses,
    categoryScores: {
      scores: [],
      totalScore: 0,
      overallBias: "Neutral" as DriverBias,
      overallConfidence: 0,
      driverAlignment: 0,
      alignmentStrength: "None" as const,
      hasConflict: false,
      timestamp
    },
    technicalBias: {
      technicalBias: "Neutral" as DriverBias,
      technicalScore: 0,
      confidence: 0,
      strength: "None" as const,
      supportingFactors: [],
      conflictingFactors: ["Insufficient technical data"],
      summary: "Fallback: no technical input available",
      timestamp,
      dataQuality: { score: 0, completeness: 0, hasTrend: false, hasMomentum: false, hasStructure: false, hasVolatility: false, hasMovingAverages: false, missingFields: ["all"] },
      factors: [],
      timeframe: "D1",
      marketStructure: "Unknown",
      setupPresent: false,
      setupType: "None",
      riskLevel: "Unknown"
    },
    institutionalFlow: {
      institutionalBias: "Neutral" as DriverBias,
      institutionalScore: 0,
      confidence: 0,
      strength: "None" as const,
      supportingFactors: [],
      conflictingFactors: ["Insufficient institutional data"],
      concentrationRisks: [],
      summary: "Fallback: no institutional input available",
      timestamp,
      dataQuality: {
        score: 0,
        completeness: 0,
        hasEtfFlows: false,
        hasCentralBank: false,
        hasCotPositioning: false,
        hasOpenInterest: false,
        hasCrowdPositioning: false,
        hasPositionRisk: false,
        availableDrivers: [],
        missingDrivers: ["all"],
        freshness: "Unknown"
      },
      factors: []
    },
    decision: {
      overallGoldScore: 0,
      overallBias: "Neutral" as DriverBias,
      decision: "Wait",
      overallConfidence: 0,
      riskRating: "High",
      alignmentScore: 0,
      conflictScore: 1,
      decisionQuality: "Low",
      supportingDrivers: [],
      conflictingDrivers: ["Insufficient data for decision engine"],
      topContributors: [],
      weakestContributors: [],
      summary: "Fallback analysis used due to insufficient data",
      institutionalExplanation: {
        primaryReason: "Insufficient data for engine analysis",
        supportingReasons: [],
        conflictingReasons: ["Partial data available"],
        riskFactors: ["Low data quality"],
        confidenceFactors: ["Limited driver coverage"],
        sourceSummary: { category: "N/A", technical: "N/A", institutional: "N/A" }
      },
      alignmentBreakdown: {
        categoryAlignment: 0,
        technicalAlignment: 0,
        institutionalAlignment: 0,
        crossSourceAlignment: 0,
        overallAlignment: 0
      },
      conflictBreakdown: {
        categoryConflict: 0,
        technicalConflict: 0,
        institutionalConflict: 0,
        crossSourceConflict: 0,
        overallConflict: 1,
        conflictDrivers: ["Insufficient data"]
      },
      concentrationRisks: ["Low data quality"],
      timestamp,
      schemaVersion: "1.0.0"
    },
    diagnostics: {
      totalExecutionTimeMs: 0,
      stageTimings: {
        validation: 0,
        "category-scoring": 0,
        "technical-bias": 0,
        "institutional-flow": 0,
        "decision-engine": 0,
        diagnostics: 0,
        complete: 0
      },
      engines: [],
      overallStatus: "partial",
      warnings: ["Fallback analysis used"],
      errors: []
    },
    warnings: ["Fallback analysis used due to engine processing errors"],
    executionTimeMs: 0,
    pipelineStatus: "partial",
    schemaVersion: "1.0.0",
    timestamp
  };
}

function mapAutoImpactToBias(impact: string): DriverBias {
  switch (impact) {
    case "Bullish Gold": return "Bullish";
    case "Bearish Gold": return "Bearish";
    case "Neutral": return "Neutral";
    default: return "Neutral";
  }
}

function mapAutoImpactToStrength(impact: string): DriverStrength {
  switch (impact) {
    case "Bullish Gold":
    case "Bearish Gold": return "Moderate";
    default: return "Weak";
  }
}

function mapAutoDirectionToTrend(direction: string): DriverAnalysisObject["trend"] {
  const lower = direction.toLowerCase();
  if (lower.includes("rising") || lower.includes("breaking higher")) return "Rising";
  if (lower.includes("falling") || lower.includes("breaking lower")) return "Falling";
  if (lower.includes("accelerating")) return "Accelerating";
  if (lower.includes("decelerating")) return "Decelerating";
  return "Stable";
}

function mapManualBias(bias: string): DriverBias {
  if (bias.includes("Bullish")) return "Bullish";
  if (bias.includes("Bearish")) return "Bearish";
  return "Neutral";
}

function mapMarketStructure(structure: string): NonNullable<TechnicalInput["structure"]>["marketStructure"] {
  const lower = structure.toLowerCase();
  if (lower.includes("bullish bos")) return "Bullish BOS";
  if (lower.includes("bearish bos")) return "Bearish BOS";
  if (lower.includes("bullish mss")) return "Bullish MSS";
  if (lower.includes("bearish mss")) return "Bearish MSS";
  if (lower.includes("bullish")) return "Bullish BOS";
  if (lower.includes("bearish")) return "Bearish BOS";
  if (lower.includes("ranging")) return "Ranging";
  return "Unknown";
}

function mapTrendDirection(value: string): NonNullable<TechnicalInput["structure"]>["higherTimeframeStructure"] {
  const lower = value.toLowerCase();
  if (lower.includes("bullish")) return "Bullish";
  if (lower.includes("bearish")) return "Bearish";
  return "Unknown";
}

function mapFlowDirection(value?: string): NonNullable<InstitutionalFlowInput["etfFlows"]>["direction"] {
  if (!value) return "Unknown";
  const lower = value.toLowerCase();
  if (lower.includes("inflow") || lower.includes("buying")) return "Inflow";
  if (lower.includes("outflow") || lower.includes("selling")) return "Outflow";
  if (lower.includes("flat")) return "Flat";
  return "Unknown";
}

function mapPositioningBias(value?: string): NonNullable<InstitutionalFlowInput["crowdPositioning"]>["retailBias"] {
  if (!value) return "Unknown";
  const lower = value.toLowerCase();
  if (lower.includes("net long") || lower.includes("long")) return "Net Long";
  if (lower.includes("net short") || lower.includes("short")) return "Net Short";
  if (lower.includes("flat")) return "Flat";
  return "Unknown";
}

function mapCrowdingLevel(value?: string): NonNullable<InstitutionalFlowInput["crowdPositioning"]>["crowdedTradeRisk"] {
  if (!value) return "Unknown";
  const lower = value.toLowerCase();
  if (lower.includes("extreme")) return "Extreme";
  if (lower.includes("high")) return "High";
  if (lower.includes("moderate")) return "Moderate";
  if (lower.includes("low")) return "Low";
  return "Unknown";
}

function parsePrice(priceStr: string): number | undefined {
  const cleaned = priceStr.replace(/[^0-9.,]/g, "").replace(",", "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

function getManualReportsBias(reports: GoldResearchReport[]): string | undefined {
  if (reports.length === 0) return undefined;
  let bullish = 0;
  let bearish = 0;
  let neutral = 0;
  for (const report of reports) {
    const bias = report.goldBias?.toLowerCase() ?? "";
    if (bias.includes("bullish")) bullish++;
    else if (bias.includes("bearish")) bearish++;
    else neutral++;
  }
  const total = reports.length;
  if (bullish > bearish && bullish >= total * 0.4) return "Bullish";
  if (bearish > bullish && bearish >= total * 0.4) return "Bearish";
  return "Neutral";
}

export function getCategoryTitle(categoryId: string): string {
  return CATEGORY_DEFINITIONS.find((c) => c.id === categoryId)?.title ?? categoryId;
}

export function getEngineDecisionLabel(decision: GoldResearchAnalysis["decision"]): string {
  const action = decision.decision;
  const confidence = decision.overallConfidence;
  return `${action} (${confidence}% confidence)`;
}

export function getEngineRiskLabel(riskRating: string): string {
  return riskRating;
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}
