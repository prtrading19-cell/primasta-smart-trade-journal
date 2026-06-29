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

export interface GoldAnalysisInput {
  driverName: GoldDriverName;
  headline: string;
  summary: string;
  currentValue: string;
  chartObservation: string;
  sourceLink: string;
  notes: string;
}

export interface GoldDriverAnalysis {
  driverName: GoldDriverName;
  goldBias: GoldBias;
  impactLevel: GoldImpactLevel;
  timeSensitivity: GoldTimeSensitivity;
  confidenceScore: number;
  explanation: string;
  goldMeaning: string;
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
  bullishDriversCount: number;
  bearishDriversCount: number;
  mixedDriversCount: number;
  strongestBullishDriver: string;
  strongestBearishDriver: string;
  mainRisk: string;
  bestSessionToWaitFor: string;
  preTradeVerdict: GoldPreTradeVerdict;
}
