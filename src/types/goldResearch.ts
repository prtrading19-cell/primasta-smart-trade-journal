export type GoldDriverName =
  | "DXY / US Dollar"
  | "US Yields"
  | "Real Yields"
  | "Fed Tone / FOMC"
  | "CPI / PCE"
  | "NFP / Jobs"
  | "Geopolitics"
  | "ETF / Central Bank Demand"
  | "Custom News";

export type GoldBias = "Bullish Gold" | "Bearish Gold" | "Neutral" | "Mixed / Wait";
export type GoldImpactLevel = "Low" | "Medium" | "High";
export type GoldTimeSensitivity = "Immediate" | "Intraday" | "This Week" | "Longer-term";
export type GoldChecklistEffect = "Supports trade" | "Warns against trade" | "Wait";
export type GoldPreTradeVerdict = "Trade only if setup confirms" | "Wait" | "Avoid trading before news" | "Manage existing trade only";
export type GoldChecklistResult = "Aligned" | "Mixed" | "Not aligned" | "Wait";
export type GoldDriverFields = Record<string, string>;

export interface GoldAnalysisInput {
  driverName: GoldDriverName;
  reportDate?: string;
  headline: string;
  summary: string;
  currentValue: string;
  chartObservation: string;
  sourceLink: string;
  notes: string;
  driverFields: GoldDriverFields;
}

export interface GoldDriverAnalysis {
  driverName: GoldDriverName;
  goldBias: GoldBias;
  impactLevel: GoldImpactLevel;
  timeSensitivity: GoldTimeSensitivity;
  confidenceScore: number;
  headlineSummary: string;
  newsDriverSummary: string;
  chartObservationInterpretation: string;
  explanation: string;
  goldMeaning: string;
  whatThisMeansForGold?: string;
  bullishGoldClues: string[];
  bearishGoldClues: string[];
  keyConflictOrRisk: string;
  checklistEffect: GoldChecklistEffect;
  tradingCaution: string;
  finalGuidance: string;
}

export interface GoldResearchReport extends GoldDriverAnalysis {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  reportDate: string;
  inputHeadline: string;
  inputSummary: string;
  currentValue?: string;
  chartObservation?: string;
  sourceLink?: string;
  notes?: string;
  driverFields?: GoldDriverFields;
}

export interface NewGoldResearchReportInput extends GoldAnalysisInput, GoldDriverAnalysis {
  reportDate: string;
}

export type GoldResearchChecklistKey =
  | "dxySupportsIdea"
  | "yieldsSupportIdea"
  | "fedToneSupportsIdea"
  | "noMajorNewsAhead"
  | "sessionHasLiquidity"
  | "technicalSetupClear"
  | "riskRewardAtLeastTwo"
  | "calmNotChasing"
  | "notRevengeTrading"
  | "willWaitIfMixed";

export type GoldResearchChecklist = Record<GoldResearchChecklistKey, boolean>;

export const GOLD_DRIVER_NAMES: GoldDriverName[] = [
  "DXY / US Dollar",
  "US Yields",
  "Real Yields",
  "Fed Tone / FOMC",
  "CPI / PCE",
  "NFP / Jobs",
  "Geopolitics",
  "ETF / Central Bank Demand",
  "Custom News"
];

export const GOLD_RESEARCH_CHECKLIST_LABELS: Record<GoldResearchChecklistKey, string> = {
  dxySupportsIdea: "DXY direction supports my Gold idea",
  yieldsSupportIdea: "Yields direction supports my Gold idea",
  fedToneSupportsIdea: "Fed tone supports my Gold idea",
  noMajorNewsAhead: "No major news risk directly ahead",
  sessionHasLiquidity: "Session has enough liquidity",
  technicalSetupClear: "Technical setup is clear",
  riskRewardAtLeastTwo: "Risk-to-reward is at least 1:2",
  calmNotChasing: "I am calm and not chasing candles",
  notRevengeTrading: "I am not revenge trading",
  willWaitIfMixed: "I will wait if drivers are mixed"
};

export const DEFAULT_GOLD_RESEARCH_CHECKLIST: GoldResearchChecklist = {
  dxySupportsIdea: false,
  yieldsSupportIdea: false,
  fedToneSupportsIdea: false,
  noMajorNewsAhead: false,
  sessionHasLiquidity: false,
  technicalSetupClear: false,
  riskRewardAtLeastTwo: false,
  calmNotChasing: false,
  notRevengeTrading: false,
  willWaitIfMixed: false
};

export const GOLD_PERSONAL_RULE =
  "I only trade Gold when liquidity, market drivers, technical structure, risk, and psychology agree. If they do not agree, I wait.";

export const GOLD_SESSION_WINDOWS = [
  {
    time: "09:00-11:30 SAST",
    name: "London Open",
    note: "Good movement and setup formation",
    rule: "Accept only clean structure"
  },
  {
    time: "11:30 area SAST",
    name: "London AM Gold Fix area",
    note: "Can bring volatility and liquidity shifts",
    rule: "Do not chase candles"
  },
  {
    time: "14:00-17:30 SAST",
    name: "London-New York Overlap",
    note: "Best main business window for liquidity and movement",
    rule: "Primary trading window"
  },
  {
    time: "14:30 / 15:30 SAST",
    name: "US data release window",
    note: "Major CPI, NFP, jobs, retail sales, PPI can spike Gold",
    rule: "Avoid entries just before news"
  },
  {
    time: "16:00 area SAST",
    name: "London PM Gold Fix area",
    note: "Can create volatility and reversal/continuation moves",
    rule: "Wait for confirmation"
  },
  {
    time: "After 18:00 SAST",
    name: "Late New York",
    note: "Often lower quality, exhaustion, or management zone",
    rule: "Avoid new random trades"
  }
];

export interface GoldBiasSummary {
  overallGoldBias: "Bullish" | "Bearish" | "Neutral" | "Wait";
  bullishDrivers: string;
  bullishDriversCount: number;
  bearishDrivers: string;
  bearishDriversCount: number;
  neutralDrivers: string;
  neutralDriversCount: number;
  mixedDrivers: string;
  mixedDriversCount: number;
  strongestBullishDriver: string;
  strongestBearishDriver: string;
  mainConflict: string;
  mainRisk: string;
  bestSessionToWaitFor: string;
  preTradeVerdict: GoldPreTradeVerdict;
  personalRule: string;
  driverSummaries: GoldBiasSummaryDriver[];
}

export interface GoldBiasSummaryDriver {
  driverName: GoldDriverName;
  newsHeadline: string;
  newsSummary: string;
  chartObservation: string;
  goldBias: GoldBias;
  impactLevel: GoldImpactLevel;
  confidenceScore: number;
  finalGuidance: string;
}

export type GoldAutoDriverName =
  | "DXY / US Dollar Check"
  | "US Yields Check"
  | "Real Yields Check"
  | "Fed Tone / FOMC Check"
  | "CPI / PCE Inflation Check"
  | "NFP / Jobs Check"
  | "Geopolitics / Risk Sentiment Check"
  | "ETF / Central Bank Demand Check"
  | "Gold Technical Structure Check";

export type GoldAutoImpact = "Bullish Gold" | "Bearish Gold" | "Neutral" | "Mixed-Wait";
export type GoldAutoOverallBias = "Bullish" | "Bearish" | "Neutral" | "Mixed-Wait";
export type GoldAutoPreTradeVerdict = "Trade Allowed" | "Wait" | "Avoid Before News" | "Manage Existing Trade Only";

export interface GoldAutoResearchSection {
  driver: GoldAutoDriverName;
  currentDataValue: string;
  direction: string;
  tenYearYieldDirection: string;
  twoYearYieldDirection: string;
  realYieldsDirection: string;
  fedTone: string;
  rateExpectation: string;
  latestInflationData: string;
  inflationResult: string;
  latestJobsData: string;
  jobsResult: string;
  unemploymentRate: string;
  wageGrowth: string;
  riskLevel: string;
  dxyReaction: string;
  etfFlowDirection: string;
  centralBankDemand: string;
  higherTimeframeBias: string;
  keySupport: string;
  keyResistance: string;
  liquidityArea: string;
  marketStructure: string;
  setupPresent: string;
  setupType: string;
  newsHeadline: string;
  newsSummary: string;
  chartObservation: string;
  sourceLink: string;
  goldImpact: GoldAutoImpact;
  goldTechnicalVerdict: string;
  reason: string;
}

export interface GoldAutoFullSummary {
  overallGoldBias: GoldAutoOverallBias;
  bullishDrivers: string[];
  bearishDrivers: string[];
  mixedDrivers: string[];
  strongestBullishDriver: string;
  strongestBearishDriver: string;
  mainRiskToday: string;
  bestSessionToTrade: string;
  preTradeVerdict: GoldAutoPreTradeVerdict;
  finalGuidance: string;
  personalRule: string;
}

export interface GoldAutoFillResponse {
  date: string;
  goldCurrentPrice: string;
  sections: GoldAutoResearchSection[];
  fullSummary: GoldAutoFullSummary;
  warning?: string;
}

export interface DailyGoldResearchReport {
  id: string;
  userId: string;
  reportDate: string;
  goldCurrentPrice: string;
  sections: GoldAutoResearchSection[];
  fullSummary: GoldAutoFullSummary;
  overallGoldBias: GoldAutoOverallBias;
  preTradeVerdict: GoldAutoPreTradeVerdict;
  createdAt: string;
  updatedAt: string;
}

export interface NewDailyGoldResearchReportInput {
  reportDate: string;
  goldCurrentPrice: string;
  sections: GoldAutoResearchSection[];
  fullSummary: GoldAutoFullSummary;
  overallGoldBias: GoldAutoOverallBias;
  preTradeVerdict: GoldAutoPreTradeVerdict;
}

export const DRIVER_NAME_TO_ID: Record<GoldDriverName, string> = {
  "DXY / US Dollar": "dxy-us-dollar",
  "US Yields": "us-yields",
  "Real Yields": "real-yields",
  "Fed Tone / FOMC": "fed-tone-fomc",
  "CPI / PCE": "cpi-pce",
  "NFP / Jobs": "nfp-jobs",
  "Geopolitics": "geopolitics",
  "ETF / Central Bank Demand": "etf-flows",
  "Custom News": "custom-news",
};

export const AUTO_DRIVER_NAME_TO_ID: Record<GoldAutoDriverName, string> = {
  "DXY / US Dollar Check": "dxy-us-dollar",
  "US Yields Check": "us-yields",
  "Real Yields Check": "real-yields",
  "Fed Tone / FOMC Check": "fed-tone-fomc",
  "CPI / PCE Inflation Check": "cpi-pce",
  "NFP / Jobs Check": "nfp-jobs",
  "Geopolitics / Risk Sentiment Check": "geopolitics",
  "ETF / Central Bank Demand Check": "etf-flows",
  "Gold Technical Structure Check": "gold-technical-structure",
};

export const ID_TO_DRIVER_NAME: Record<string, GoldDriverName> = Object.fromEntries(
  Object.entries(DRIVER_NAME_TO_ID).map(([name, id]) => [id, name as GoldDriverName])
) as Record<string, GoldDriverName>;

export const ID_TO_AUTO_DRIVER_NAME: Record<string, GoldAutoDriverName> = Object.fromEntries(
  Object.entries(AUTO_DRIVER_NAME_TO_ID).map(([name, id]) => [id, name as GoldAutoDriverName])
) as Record<string, GoldAutoDriverName>;

export function getDriverIdFromName(name: GoldDriverName): string {
  return DRIVER_NAME_TO_ID[name] ?? name;
}

export function getDriverNameFromId(id: string): GoldDriverName {
  return ID_TO_DRIVER_NAME[id] ?? (id as GoldDriverName);
}

export function getAutoDriverIdFromName(name: GoldAutoDriverName): string {
  return AUTO_DRIVER_NAME_TO_ID[name] ?? name;
}

export function getAutoDriverNameFromId(id: string): GoldAutoDriverName {
  return ID_TO_AUTO_DRIVER_NAME[id] ?? (id as GoldAutoDriverName);
}
