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
  "Gold Technical Structure Check"
];

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

export function buildAutoGoldSummary(sections: GoldAutoResearchSection[]): GoldAutoFullSummary {
  const bullishSections = sections.filter((section) => section.goldImpact === "Bullish Gold");
  const bearishSections = sections.filter((section) => section.goldImpact === "Bearish Gold");
  const mixedSections = sections.filter((section) => section.goldImpact === "Mixed-Wait");
  const neutralSections = sections.filter((section) => section.goldImpact === "Neutral");
  const technicalSection = sections.find((section) => section.driver === "Gold Technical Structure Check");
  const technicalVerdict = technicalSection?.goldTechnicalVerdict || "Wait";
  const hasMajorNewsRisk = sections.some((section) => hasNewsRisk(`${section.newsHeadline} ${section.newsSummary} ${section.reason}`));
  const overallGoldBias = getOverallBias(bullishSections.length, bearishSections.length, mixedSections.length, neutralSections.length);
  const preTradeVerdict = getPreTradeVerdict(overallGoldBias, technicalVerdict, hasMajorNewsRisk, mixedSections.length);
  const strongestBullishDriver = strongestDriver(bullishSections);
  const strongestBearishDriver = strongestDriver(bearishSections);

  return {
    overallGoldBias,
    bullishDrivers: bullishSections.map((section) => section.driver),
    bearishDrivers: bearishSections.map((section) => section.driver),
    mixedDrivers: [...mixedSections, ...neutralSections].map((section) => section.driver),
    strongestBullishDriver,
    strongestBearishDriver,
    mainRiskToday: getMainRisk(sections, mixedSections, bearishSections),
    bestSessionToTrade: hasMajorNewsRisk ? "Wait until the major news reaction settles" : "London-New York overlap after technical confirmation",
    preTradeVerdict,
    finalGuidance: getFinalGuidance(overallGoldBias, technicalVerdict, preTradeVerdict, strongestBullishDriver, strongestBearishDriver),
    personalRule: GOLD_PERSONAL_RULE
  };
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
    reason: stringValue(source.reason)
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
    strongestBullishDriver: stringValue(value.strongestBullishDriver) || fallback.strongestBullishDriver,
    strongestBearishDriver: stringValue(value.strongestBearishDriver) || fallback.strongestBearishDriver,
    mainRiskToday: stringValue(value.mainRiskToday) || fallback.mainRiskToday,
    bestSessionToTrade: stringValue(value.bestSessionToTrade) || fallback.bestSessionToTrade,
    preTradeVerdict: includesValue(PRE_TRADE_VERDICTS, value.preTradeVerdict) ? value.preTradeVerdict : fallback.preTradeVerdict,
    finalGuidance: stringValue(value.finalGuidance) || fallback.finalGuidance,
    personalRule: stringValue(value.personalRule) || GOLD_PERSONAL_RULE
  };
}

function normalizeAutoImpact(value: unknown): GoldAutoImpact {
  return includesValue(AUTO_IMPACTS, value) ? value : "Mixed-Wait";
}

function getOverallBias(bullish: number, bearish: number, mixed: number, neutral: number): GoldAutoOverallBias {
  if (bullish >= 5 && bearish <= 2 && mixed <= 2) return "Bullish";
  if (bearish >= 5 && bullish <= 2 && mixed <= 2) return "Bearish";
  if (neutral >= 5 && bullish <= 2 && bearish <= 2) return "Neutral";
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
