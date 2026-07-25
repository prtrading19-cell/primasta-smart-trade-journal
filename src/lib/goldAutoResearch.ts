import {
  GOLD_PERSONAL_RULE,
  type GoldAutoDriverName,
  type GoldAutoFillResponse,
  type GoldAutoFullSummary,
  type GoldAutoImpact,
  type GoldAutoOverallBias,
  type GoldAutoPreTradeVerdict,
  type GoldAutoResearchSection
} from "@/types/goldResearch";

export const GOLD_AUTO_DRIVER_NAMES: GoldAutoDriverName[] = [
  "DXY / US Dollar Check",
  "US Yields Check",
  "Real Yields Check",
  "Fed Tone / FOMC Check",
  "CPI / PCE Inflation Check",
  "NFP / Jobs Check",
  "Geopolitics / Risk Sentiment Check",
  "ETF / Central Bank Demand Check",
  "Gold Technical Structure Check",
  "Economic Growth Check",
  "Gold ETF Flows Check",
  "Central Bank Demand Check",
  "Market Sentiment Check",
  "Crowd Positioning Check",
  "Liquidity Conditions Check",
  "Seasonality Check",
  "Position Risk Check"
];

export function getAutoDriverNames(): GoldAutoDriverName[] {
  return [...GOLD_AUTO_DRIVER_NAMES];
}

export function getAutoDriverCount(): number {
  return GOLD_AUTO_DRIVER_NAMES.length;
}

const AUTO_IMPACTS: GoldAutoImpact[] = ["Bullish Gold", "Bearish Gold", "Neutral", "Mixed-Wait"];
const OVERALL_BIASES: GoldAutoOverallBias[] = ["Bullish", "Bearish", "Neutral", "Mixed-Wait"];
const PRE_TRADE_VERDICTS: GoldAutoPreTradeVerdict[] = ["Trade Allowed", "Wait", "Avoid Before News", "Manage Existing Trade Only"];

export function normalizeAutoFillResponse(value: unknown): GoldAutoFillResponse {
  const source = isRecord(value) ? value : {};
  const rawSections = Array.isArray(source.sections) ? source.sections : [];
  const sections = GOLD_AUTO_DRIVER_NAMES.map((driver) => normalizeAutoSection(driver, rawSections.find((section) => isRecord(section) && section.driver === driver)));
  const summary = normalizeAutoSummary(source.fullSummary, sections);

  return {
    date: stringValue(source.date) || today(),
    goldCurrentPrice: stringValue(source.goldCurrentPrice),
    sections,
    fullSummary: summary,
    warning: stringValue(source.warning) || undefined
  };
}

export function buildAutoGoldSummary(
  sections: GoldAutoResearchSection[],
  engineDecision?: { overallBias: string; overallConfidence: number; decision: string; overallGoldScore: number; alignmentBreakdown?: { overallAlignment: number } } | null
): GoldAutoFullSummary {
  const bullishSections = sections.filter((section) => section.goldImpact === "Bullish Gold");
  const bearishSections = sections.filter((section) => section.goldImpact === "Bearish Gold");
  const mixedSections = sections.filter((section) => section.goldImpact === "Mixed-Wait");
  const neutralSections = sections.filter((section) => section.goldImpact === "Neutral");
  const technicalSection = sections.find((section) => section.driver === "Gold Technical Structure Check");
  const technicalVerdict = technicalSection?.goldTechnicalVerdict || "Wait";
  const hasMajorNewsRisk = sections.some((section) => hasNewsRisk(`${section.newsHeadline} ${section.newsSummary} ${section.reason}`));

  const totalDrivers = sections.length;
  const bullishCount = bullishSections.length;
  const bearishCount = bearishSections.length;
  const mixedCount = mixedSections.length;
  const neutralCount = neutralSections.length;

  const hasEngineDecision = engineDecision && typeof engineDecision.overallBias === "string";
  let overallGoldBias: GoldAutoOverallBias;
  let confidence: number;
  let alignment: string;
  let institutionalScore: number;

  if (hasEngineDecision) {
    const bias = engineDecision.overallBias;
    if (/strong bullish|bullish/i.test(bias)) overallGoldBias = "Bullish";
    else if (/strong bearish|bearish/i.test(bias)) overallGoldBias = "Bearish";
    else if (/neutral/i.test(bias)) overallGoldBias = "Neutral";
    else overallGoldBias = getOverallBias(bullishCount, bearishCount, mixedCount, neutralCount);
    confidence = engineDecision.overallConfidence;
    alignment = engineDecision.alignmentBreakdown
      ? `${engineDecision.alignmentBreakdown.overallAlignment}%`
      : `${calculateHeuristicAlignment(bullishCount, bearishCount, mixedCount, neutralCount, totalDrivers)}%`;
    institutionalScore = engineDecision.overallGoldScore;
  } else {
    overallGoldBias = getOverallBias(bullishCount, bearishCount, mixedCount, neutralCount);
    confidence = calculateHeuristicConfidence(bullishCount, bearishCount, mixedCount, neutralCount, totalDrivers);
    alignment = `${calculateHeuristicAlignment(bullishCount, bearishCount, mixedCount, neutralCount, totalDrivers)}%`;
    institutionalScore = calculateInstitutionalScore(bullishCount, bearishCount, mixedCount, neutralCount, totalDrivers);
  }

  const preTradeVerdict = getPreTradeVerdict(overallGoldBias, technicalVerdict, hasMajorNewsRisk, mixedCount);
  const strongestBullishDriver = strongestDriver(bullishSections);
  const strongestBearishDriver = strongestDriver(bearishSections);

  const engineTradeAction = engineDecision ? mapEngineDecisionToTradeAction(engineDecision.decision) : null;
  const tradeAction = engineTradeAction ?? deriveTradeAction(overallGoldBias, preTradeVerdict, mixedCount, totalDrivers);
  const tradeReason = engineTradeAction
    ? `Engine decision: ${engineDecision!.decision} (${engineDecision!.overallConfidence}% confidence). Bias: ${overallGoldBias}.`
    : deriveTradeReason(tradeAction, overallGoldBias, strongestBullishDriver, strongestBearishDriver, mixedCount, totalDrivers);
  const tradeConfidence = confidence;

  return {
    overallGoldBias,
    bullishDrivers: bullishSections.map((section) => section.driver),
    bearishDrivers: bearishSections.map((section) => section.driver),
    mixedDrivers: mixedSections.map((section) => section.driver),
    neutralDrivers: neutralSections.map((section) => section.driver),
    strongestBullishDriver,
    strongestBearishDriver,
    mainRiskToday: getMainRisk(sections, mixedSections, bearishSections),
    bestSessionToTrade: hasMajorNewsRisk ? "Wait until the major news reaction settles" : "London-New York overlap after technical confirmation",
    preTradeVerdict,
    finalGuidance: getFinalGuidance(overallGoldBias, technicalVerdict, preTradeVerdict, strongestBullishDriver, strongestBearishDriver),
    personalRule: GOLD_PERSONAL_RULE,
    statistics: {
      bullishCount,
      bearishCount,
      mixedCount,
      neutralCount,
      totalDrivers,
      overallBias: overallGoldBias,
      confidence,
      alignment,
      institutionalScore
    },
    tradeRecommendation: {
      action: tradeAction,
      reason: tradeReason,
      confidence: tradeConfidence
    },
    engineDecisionUsed: Boolean(hasEngineDecision)
  };
}

export function calculateInstitutionalResearch(
  sections: GoldAutoResearchSection[],
  engineDecision?: { overallBias: string; overallConfidence: number; decision: string; overallGoldScore: number; alignmentBreakdown?: { overallAlignment: number } } | null
): GoldAutoFullSummary {
  return buildAutoGoldSummary(sections, engineDecision);
}

export function getResearchBiasFromSections(sections: GoldAutoResearchSection[]): GoldAutoOverallBias {
  const bullishCount = sections.filter((s) => s.goldImpact === "Bullish Gold").length;
  const bearishCount = sections.filter((s) => s.goldImpact === "Bearish Gold").length;
  const mixedCount = sections.filter((s) => s.goldImpact === "Mixed-Wait").length;
  const neutralCount = sections.filter((s) => s.goldImpact === "Neutral").length;
  return getOverallBias(bullishCount, bearishCount, mixedCount, neutralCount);
}

export function createEmptyAutoFillResponse(date = today()): GoldAutoFillResponse {
  const sections = GOLD_AUTO_DRIVER_NAMES.map((driver) => createEmptyAutoSection(driver));
  return {
    date,
    goldCurrentPrice: "",
    sections,
    fullSummary: buildAutoGoldSummary(sections)
  };
}

function normalizeAutoSection(driver: GoldAutoDriverName, value: unknown): GoldAutoResearchSection {
  const source = isRecord(value) ? value : {};

  return {
    driver,
    currentDataValue: stringValue(source.currentDataValue),
    direction: stringValue(source.direction),
    tenYearYieldDirection: stringValue(source.tenYearYieldDirection),
    twoYearYieldDirection: stringValue(source.twoYearYieldDirection),
    realYieldsDirection: stringValue(source.realYieldsDirection),
    fedTone: stringValue(source.fedTone),
    rateExpectation: stringValue(source.rateExpectation),
    latestInflationData: stringValue(source.latestInflationData),
    inflationResult: stringValue(source.inflationResult),
    latestJobsData: stringValue(source.latestJobsData),
    jobsResult: stringValue(source.jobsResult),
    unemploymentRate: stringValue(source.unemploymentRate),
    wageGrowth: stringValue(source.wageGrowth),
    riskLevel: stringValue(source.riskLevel),
    dxyReaction: stringValue(source.dxyReaction),
    etfFlowDirection: stringValue(source.etfFlowDirection),
    centralBankDemand: stringValue(source.centralBankDemand),
    higherTimeframeBias: stringValue(source.higherTimeframeBias),
    keySupport: stringValue(source.keySupport),
    keyResistance: stringValue(source.keyResistance),
    liquidityArea: stringValue(source.liquidityArea),
    marketStructure: stringValue(source.marketStructure),
    setupPresent: stringValue(source.setupPresent),
    setupType: stringValue(source.setupType),
    newsHeadline: stringValue(source.newsHeadline),
    newsSummary: stringValue(source.newsSummary),
    chartObservation: stringValue(source.chartObservation),
    sourceLink: stringValue(source.sourceLink),
    goldImpact: normalizeAutoImpact(source.goldImpact),
    goldTechnicalVerdict: stringValue(source.goldTechnicalVerdict),
    reason: stringValue(source.reason),
    gdpGrowth: stringValue(source.gdpGrowth),
    pmi: stringValue(source.pmi),
    ism: stringValue(source.ism),
    economicActivity: stringValue(source.economicActivity),
    etfFlowMagnitude: stringValue(source.etfFlowMagnitude),
    cbBuyingVolume: stringValue(source.cbBuyingVolume),
    cbSellingVolume: stringValue(source.cbSellingVolume),
    fearGreedIndex: stringValue(source.fearGreedIndex),
    vixLevel: stringValue(source.vixLevel),
    riskAppetite: stringValue(source.riskAppetite),
    retailPositioning: stringValue(source.retailPositioning),
    institutionalPositioning: stringValue(source.institutionalPositioning),
    crowdedTradeRisk: stringValue(source.crowdedTradeRisk),
    fundingConditions: stringValue(source.fundingConditions),
    balanceSheetSize: stringValue(source.balanceSheetSize),
    repoRate: stringValue(source.repoRate),
    seasonalPattern: stringValue(source.seasonalPattern),
    historicalReturn: stringValue(source.historicalReturn),
    positionCrowding: stringValue(source.positionCrowding),
    shortInterest: stringValue(source.shortInterest),
    cftcNetLong: stringValue(source.cftcNetLong)
  };
}

function createEmptyAutoSection(driver: GoldAutoDriverName): GoldAutoResearchSection {
  return normalizeAutoSection(driver, {
    sourceLink: "Not found",
    goldImpact: "Mixed-Wait",
    goldTechnicalVerdict: driver === "Gold Technical Structure Check" ? "Wait" : ""
  });
}

function normalizeAutoSummary(value: unknown, sections: GoldAutoResearchSection[]): GoldAutoFullSummary {
  const fallback = buildAutoGoldSummary(sections);
  if (!isRecord(value)) return fallback;

  return {
    overallGoldBias: includesValue(OVERALL_BIASES, value.overallGoldBias) ? value.overallGoldBias : fallback.overallGoldBias,
    bullishDrivers: stringArray(value.bullishDrivers),
    bearishDrivers: stringArray(value.bearishDrivers),
    mixedDrivers: stringArray(value.mixedDrivers),
    neutralDrivers: stringArray(value.neutralDrivers),
    strongestBullishDriver: stringValue(value.strongestBullishDriver) || fallback.strongestBullishDriver,
    strongestBearishDriver: stringValue(value.strongestBearishDriver) || fallback.strongestBearishDriver,
    mainRiskToday: stringValue(value.mainRiskToday) || fallback.mainRiskToday,
    bestSessionToTrade: stringValue(value.bestSessionToTrade) || fallback.bestSessionToTrade,
    preTradeVerdict: includesValue(PRE_TRADE_VERDICTS, value.preTradeVerdict) ? value.preTradeVerdict : fallback.preTradeVerdict,
    finalGuidance: stringValue(value.finalGuidance) || fallback.finalGuidance,
    personalRule: stringValue(value.personalRule) || GOLD_PERSONAL_RULE,
    statistics: isRecord(value.statistics) ? {
      bullishCount: typeof value.statistics.bullishCount === "number" ? value.statistics.bullishCount : fallback.statistics.bullishCount,
      bearishCount: typeof value.statistics.bearishCount === "number" ? value.statistics.bearishCount : fallback.statistics.bearishCount,
      mixedCount: typeof value.statistics.mixedCount === "number" ? value.statistics.mixedCount : fallback.statistics.mixedCount,
      neutralCount: typeof value.statistics.neutralCount === "number" ? value.statistics.neutralCount : fallback.statistics.neutralCount,
      totalDrivers: typeof value.statistics.totalDrivers === "number" ? value.statistics.totalDrivers : fallback.statistics.totalDrivers,
      overallBias: stringValue(value.statistics.overallBias) || fallback.statistics.overallBias,
      confidence: typeof value.statistics.confidence === "number" ? value.statistics.confidence : fallback.statistics.confidence,
      alignment: stringValue(value.statistics.alignment) || fallback.statistics.alignment,
      institutionalScore: typeof value.statistics.institutionalScore === "number" ? value.statistics.institutionalScore : fallback.statistics.institutionalScore
    } : fallback.statistics,
    tradeRecommendation: isRecord(value.tradeRecommendation) ? {
      action: (value.tradeRecommendation.action === "BUY" || value.tradeRecommendation.action === "SELL" || value.tradeRecommendation.action === "WAIT") ? value.tradeRecommendation.action : fallback.tradeRecommendation.action,
      reason: stringValue(value.tradeRecommendation.reason) || fallback.tradeRecommendation.reason,
      confidence: typeof value.tradeRecommendation.confidence === "number" ? value.tradeRecommendation.confidence : fallback.tradeRecommendation.confidence
    } : fallback.tradeRecommendation,
    engineDecisionUsed: typeof value.engineDecisionUsed === "boolean" ? value.engineDecisionUsed : fallback.engineDecisionUsed
  };
}

function normalizeAutoImpact(value: unknown): GoldAutoImpact {
  return includesValue(AUTO_IMPACTS, value) ? value : "Mixed-Wait";
}

function calculateHeuristicConfidence(bullish: number, bearish: number, mixed: number, neutral: number, total: number): number {
  if (total === 0) return 0;
  const dominant = Math.max(bullish, bearish, mixed, neutral);
  const base = (dominant / total) * 100;
  const penaltyPerMixed = 3;
  return Math.max(10, Math.min(95, Math.round(base - mixed * penaltyPerMixed)));
}

function calculateHeuristicAlignment(bullish: number, bearish: number, mixed: number, neutral: number, total: number): number {
  if (total === 0) return 0;
  const dominant = Math.max(bullish, bearish);
  return Math.round((dominant / total) * 100);
}

function calculateInstitutionalScore(bullish: number, bearish: number, mixed: number, _neutral: number, total: number): number {
  if (total === 0) return 0;
  const weighted = (bullish * 1.0 + bearish * -1.0 + mixed * 0.0) / total;
  return Math.round(weighted * 50 + 50);
}

function mapEngineDecisionToTradeAction(engineDecision: string): "BUY" | "SELL" | "WAIT" | null {
  const lower = engineDecision.toLowerCase();
  if (lower.includes("strong buy")) return "BUY";
  if (lower.includes("buy")) return "BUY";
  if (lower.includes("strong sell")) return "SELL";
  if (lower.includes("sell")) return "SELL";
  if (lower.includes("wait")) return "WAIT";
  return null;
}

function deriveTradeAction(bias: GoldAutoOverallBias, preTradeVerdict: GoldAutoPreTradeVerdict, mixedCount: number, totalDrivers: number): "BUY" | "SELL" | "WAIT" {
  if (preTradeVerdict === "Avoid Before News" || preTradeVerdict === "Wait") return "WAIT";
  if (mixedCount >= 3) return "WAIT";
  if (totalDrivers < 5) return "WAIT";
  if (bias === "Bullish") return "BUY";
  if (bias === "Bearish") return "SELL";
  return "WAIT";
}

function deriveTradeReason(
  action: "BUY" | "SELL" | "WAIT",
  bias: GoldAutoOverallBias,
  strongestBullishDriver: string,
  strongestBearishDriver: string,
  mixedCount: number,
  totalDrivers: number
): string {
  if (action === "BUY") {
    return `${bias} bias supported by strongest driver: ${strongestBullishDriver}. Bearish pressure from ${strongestBearishDriver}. Enter only after technical confirmation.`;
  }
  if (action === "SELL") {
    return `${bias} bias supported by strongest driver: ${strongestBearishDriver}. Bullish pressure from ${strongestBullishDriver}. Enter only after technical confirmation.`;
  }
  if (mixedCount >= 3) {
    return `Too many mixed drivers (${mixedCount}/${totalDrivers}). Wait for clearer macro alignment before entering.`;
  }
  return `Bias is ${bias} with ${totalDrivers} drivers analyzed. Wait for stronger directional alignment.`;
}

function getOverallBias(bullish: number, bearish: number, mixed: number, neutral: number): GoldAutoOverallBias {
  const total = bullish + bearish + mixed + neutral;
  if (total === 0) return "Mixed-Wait";
  const netScore = (bullish - bearish) / total;
  if (netScore >= 0.3 && bullish >= 4) return "Bullish";
  if (netScore <= -0.3 && bearish >= 4) return "Bearish";
  if (Math.abs(netScore) < 0.1 && mixed <= 2) return "Neutral";
  return "Mixed-Wait";
}

function getPreTradeVerdict(overallBias: GoldAutoOverallBias, technicalVerdict: string, hasMajorNewsRisk: boolean, mixedCount: number): GoldAutoPreTradeVerdict {
  if (hasMajorNewsRisk) return "Avoid Before News";
  if (mixedCount >= 3 || overallBias === "Mixed-Wait") return "Wait";
  if (technicalVerdict === "Wait" || !technicalVerdict) return "Wait";
  if (overallBias === "Neutral") return "Manage Existing Trade Only";
  return "Trade Allowed";
}

function strongestDriver(sections: GoldAutoResearchSection[]) {
  const highImpact = sections.find((section) => /high/i.test(section.reason) || /high/i.test(section.currentDataValue));
  return highImpact?.driver ?? sections[0]?.driver ?? "None";
}

function getMainRisk(sections: GoldAutoResearchSection[], mixedSections: GoldAutoResearchSection[], bearishSections: GoldAutoResearchSection[]) {
  const sourcedRisk = sections.find((section) => /not verified|not found|uncertain|conflict|risk/i.test(`${section.newsSummary} ${section.reason}`));
  if (sourcedRisk) return `${sourcedRisk.driver}: ${sourcedRisk.reason || sourcedRisk.newsSummary}`;
  if (mixedSections.length) return `Mixed driver alignment: ${mixedSections.map((section) => section.driver).join(", ")}`;
  if (bearishSections.length) return `Bearish pressure from ${bearishSections.map((section) => section.driver).join(", ")}`;
  return "No single dominant risk. Still wait for price structure and liquidity confirmation.";
}

function getFinalGuidance(
  overallBias: GoldAutoOverallBias,
  technicalVerdict: string,
  preTradeVerdict: GoldAutoPreTradeVerdict,
  strongestBullishDriver: string,
  strongestBearishDriver: string
) {
  if (preTradeVerdict === "Avoid Before News") {
    return "Avoid new Gold entries before the major news reaction is clear. Re-check DXY, yields, liquidity, and structure after volatility settles.";
  }

  if (preTradeVerdict === "Trade Allowed") {
    return `${overallBias} Gold bias is acceptable only if the ${technicalVerdict} stays valid. Strongest bullish driver: ${strongestBullishDriver}. Strongest bearish driver: ${strongestBearishDriver}. Do not enter without technical confirmation.`;
  }

  if (preTradeVerdict === "Manage Existing Trade Only") {
    return "The driver mix is not strong enough for a fresh Gold entry. Manage existing exposure and wait for cleaner alignment.";
  }

  return "Wait for technical confirmation. Do not chase Gold until macro drivers, DXY, yields, liquidity, and market structure align.";
}

function hasNewsRisk(value: string) {
  return /cpi|pce|nfp|fomc|powell|fed decision|employment situation|inflation report/i.test(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value).trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => stringValue(item)).filter(Boolean) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function includesValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
