"use client";

import Link from "next/link";
import { Activity, AlertTriangle, BrainCircuit, Database, Download, ExternalLink, FileText, Gauge, History, Layers3, Pencil, RefreshCw, Save, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppData } from "@/context/AppDataContext";
import { buildAutoGoldSummary, createEmptyAutoFillResponse, normalizeAutoFillResponse } from "@/lib/goldAutoResearch";
import { buildGoldBiasSummary, getGoldChecklistResult, hasMeaningfulGoldResearchInput } from "@/lib/goldResearch";
import { exportGoldBiasSummaryPdf, exportGoldResearchCsv, exportGoldResearchPackPdf } from "@/lib/goldResearchExporters";
import { buildManualGoldTradeSetup, calculateGoldSetupRiskReward, enforceGoldTradeSetupRules, normalizeGoldTradeSetupResult } from "@/lib/goldTradeSetup";
import { cn } from "@/lib/format";
import { STRATEGIES } from "@/types/trade";
import {
  DEFAULT_GOLD_RESEARCH_CHECKLIST,
  GOLD_DRIVER_NAMES,
  GOLD_PERSONAL_RULE,
  GOLD_RESEARCH_CHECKLIST_LABELS,
  GOLD_SESSION_WINDOWS,
  type DailyGoldResearchReport,
  type GoldAutoDriverName,
  type GoldAutoFillResponse,
  type GoldAutoResearchSection,
  type GoldAnalysisInput,
  type GoldDriverAnalysis,
  type GoldDriverFields,
  type GoldDriverName,
  type GoldResearchChecklist
} from "@/types/goldResearch";
import {
  DEFAULT_GOLD_TRADE_SETUP_INPUTS,
  type GoldTradeSetup,
  type GoldTradeSetupInputs,
  type GoldTradeSetupResearchSummary,
  type GoldTradeSetupResult
} from "@/types/goldTradeSetup";
import { DRIVER_REGISTRY, getDriverById, getDriversByCategory } from "@/config/driverRegistry";
import { CATEGORY_DEFINITIONS, getCategoryById } from "@/config/categoryConfig";

type DriverFieldType = "text" | "textarea" | "select" | "url";

interface DriverFieldConfig {
  key: string;
  label: string;
  type: DriverFieldType;
  placeholder: string;
  options?: string[];
}

interface DriverFormConfig {
  description: string;
  fields: DriverFieldConfig[];
}

interface XauusdMarketData {
  status: "success" | "error";
  symbol: string;
  currentPrice: string;
  lastUpdated: string;
  dailyHigh: string;
  dailyLow: string;
  previousDayHigh: string;
  previousDayLow: string;
  recentSwingHigh: string;
  recentSwingLow: string;
  suggestedBuySideLiquidity: string;
  suggestedSellSideLiquidity: string;
  suggestedSupport: string;
  suggestedResistance: string;
  currentPriceLocation: string;
  source: string;
  provider: string;
  message: string;
  verified: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_MARKET_DATA: XauusdMarketData = {
  status: "error",
  symbol: "",
  currentPrice: "",
  lastUpdated: "",
  dailyHigh: "",
  dailyLow: "",
  previousDayHigh: "",
  previousDayLow: "",
  recentSwingHigh: "",
  recentSwingLow: "",
  suggestedBuySideLiquidity: "",
  suggestedSellSideLiquidity: "",
  suggestedSupport: "",
  suggestedResistance: "",
  currentPriceLocation: "Unknown",
  source: "None",
  provider: "None",
  message: "",
  verified: false
};

const CORE_FIELD_KEYS = new Set(["newsHeadline", "newsSummary", "chartObservation", "sourceLink", "notes"]);

const CORE_RESEARCH_FIELDS: DriverFieldConfig[] = [
  { key: "newsHeadline", label: "News Headline", type: "text", placeholder: "Paste the exact headline or write a clear research title" },
  { key: "newsSummary", label: "News Summary", type: "textarea", placeholder: "Summarize the news driver, numbers, reaction, and important context" },
  { key: "chartObservation", label: "My Chart Observation", type: "textarea", placeholder: "Write what price structure shows: resistance, support, supply, demand, rejection, breakout, or liquidity" },
  { key: "sourceLink", label: "Source Link", type: "url", placeholder: "https://..." },
  { key: "notes", label: "Notes", type: "textarea", placeholder: "Optional: extra risk, timing, or confirmation notes" }
];

const DRIVER_FORM_CONFIG: Record<GoldDriverName, DriverFormConfig> = {
  "DXY / US Dollar": {
    description: "Dollar pressure, DXY direction, and chart context.",
    fields: [
      { key: "dxyDirection", label: "DXY current direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Sideways", "Rejecting Resistance", "Breaking Support", "Breaking Resistance"] },
      { key: "dxyCurrentLevel", label: "DXY current level", type: "text", placeholder: "Example: 105.20" },
      { key: "dxySupportResistance", label: "DXY key support/resistance", type: "text", placeholder: "Example: Resistance at 105.50, support at 104.80" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Dollar weakens as rate-cut bets rise" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the Dollar driver in a few lines" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: DXY rejecting resistance on H1" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "US Yields": {
    description: "10Y and 2Y Treasury direction, yield levels, and news reaction.",
    fields: [
      { key: "tenYearYieldDirection", label: "10Y yield direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Sideways", "Rejecting High", "Breaking Higher", "Breaking Lower"] },
      { key: "twoYearYieldDirection", label: "2Y yield direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Sideways", "Rejecting High", "Breaking Higher", "Breaking Lower"] },
      { key: "tenYearYieldValue", label: "Current 10Y yield value", type: "text", placeholder: "Example: 4.47%" },
      { key: "twoYearYieldValue", label: "Current 2Y yield value", type: "text", placeholder: "Example: 3.82%" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Treasury yields jump on higher-for-longer outlook" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the yield move and market reaction" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: 10Y pulling back from recent high" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Real Yields": {
    description: "Real-yield pressure and inflation-expectation direction.",
    fields: [
      { key: "realYieldsDirection", label: "Real yields direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Sideways", "Rejecting High", "Breaking Higher", "Breaking Lower"] },
      { key: "realYieldValue", label: "Current real yield value", type: "text", placeholder: "Example: 2.05%" },
      { key: "inflationExpectationDirection", label: "Inflation expectation direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Stable"] },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Real yields pull back as inflation expectations rise" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the real-yield driver" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: Real yields rejecting recent high" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Fed Tone / FOMC": {
    description: "Fed tone, rate expectations, speakers, and key quote.",
    fields: [
      { key: "fedTone", label: "Fed tone", type: "select", placeholder: "Select tone", options: ["Hawkish", "Dovish", "Neutral", "Mixed"] },
      { key: "rateExpectation", label: "Rate expectation", type: "select", placeholder: "Select expectation", options: ["Cuts Expected", "Hike Expected", "Hold Expected", "Higher For Longer"] },
      { key: "fedSpeakerOrEvent", label: "Fed speaker or event", type: "text", placeholder: "Example: Powell speech, FOMC minutes" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Fed signals fewer cuts this year" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the Fed message" },
      { key: "keyQuote", label: "Key quote or takeaway", type: "textarea", placeholder: "Paste the quote or your main takeaway" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "CPI / PCE": {
    description: "Inflation surprise, actual/forecast/previous, and market reaction.",
    fields: [
      { key: "inflationResult", label: "Inflation result", type: "select", placeholder: "Select result", options: ["Hotter Than Expected", "Softer Than Expected", "In Line", "Mixed"] },
      { key: "inflationType", label: "CPI/PCE type", type: "select", placeholder: "Select type", options: ["CPI", "Core CPI", "PCE", "Core PCE"] },
      { key: "actualValue", label: "Actual value", type: "text", placeholder: "Example: 0.4% m/m" },
      { key: "forecastValue", label: "Forecast value", type: "text", placeholder: "Example: 0.3% m/m" },
      { key: "previousValue", label: "Previous value", type: "text", placeholder: "Example: 0.2% m/m" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: CPI comes in hotter than expected" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the inflation print and reaction" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "NFP / Jobs": {
    description: "Payrolls, unemployment, wages, and labor-market reaction.",
    fields: [
      { key: "jobsResult", label: "Jobs result", type: "select", placeholder: "Select result", options: ["Stronger Than Expected", "Weaker Than Expected", "In Line", "Mixed"] },
      { key: "nfpActual", label: "NFP actual", type: "text", placeholder: "Example: 210K" },
      { key: "nfpForecast", label: "NFP forecast", type: "text", placeholder: "Example: 170K" },
      { key: "unemploymentRate", label: "Unemployment rate", type: "text", placeholder: "Example: 4.1%, unemployment rising" },
      { key: "wageGrowth", label: "Wage growth", type: "text", placeholder: "Example: wages cooling / 0.2% m/m" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Payrolls miss forecast as unemployment rises" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the jobs report and reaction" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  Geopolitics: {
    description: "Risk level, event type, DXY reaction, and safe-haven demand.",
    fields: [
      { key: "geopoliticalRiskLevel", label: "Geopolitical risk level", type: "select", placeholder: "Select risk", options: ["Low", "Medium", "High", "Extreme"] },
      { key: "eventType", label: "Event type", type: "select", placeholder: "Select event", options: ["War", "Conflict", "Sanctions", "Election Risk", "Banking Risk", "Global Uncertainty", "Other"] },
      { key: "dxyReaction", label: "DXY reaction", type: "select", placeholder: "Select reaction", options: ["Rising", "Falling", "Stable", "Unknown"] },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Gold catches safe-haven bid as tensions rise" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the geopolitical event and market reaction" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "ETF / Central Bank Demand": {
    description: "ETF flows, central-bank demand, and longer-term Gold demand.",
    fields: [
      { key: "etfFlowDirection", label: "ETF flow direction", type: "select", placeholder: "Select flow", options: ["Inflows", "Outflows", "Flat", "Unknown"] },
      { key: "centralBankDemand", label: "Central bank demand", type: "select", placeholder: "Select demand", options: ["Strong Buying", "Weak Buying", "Selling", "Unknown"] },
      { key: "reportPeriod", label: "Report period", type: "text", placeholder: "Example: Weekly, May 2026, Q2" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: ETF inflows rise as central banks keep buying" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the demand report" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Custom News": {
    description: "Any Gold-related news that does not fit one driver cleanly.",
    fields: [
      { key: "newsCategory", label: "News category", type: "select", placeholder: "Select category", options: ["Dollar", "Yields", "Fed", "Inflation", "Jobs", "Geopolitics", "Gold Demand", "Other"] },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Gold reacts to mixed macro headlines" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the news and market reaction" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "myInterpretation", label: "My interpretation", type: "textarea", placeholder: "Example: This looks Gold-supportive only if DXY keeps falling" },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  }
};

type AutoFieldType = "text" | "textarea" | "url" | "select";

interface AutoSectionFieldConfig {
  key: keyof GoldAutoResearchSection;
  label: string;
  type?: AutoFieldType;
  options?: string[];
}

const AUTO_IMPACT_OPTIONS = ["Bullish Gold", "Bearish Gold", "Neutral", "Mixed-Wait"];

const AUTO_SECTION_FIELDS: Record<GoldAutoDriverName, AutoSectionFieldConfig[]> = {
  "DXY / US Dollar Check": [
    { key: "currentDataValue", label: "Current Data/Value" },
    { key: "direction", label: "Direction", type: "select", options: ["Rising", "Falling", "Sideways", "Rejecting Resistance", "Breaking Support", "Breaking Resistance", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "US Yields Check": [
    { key: "currentDataValue", label: "Current Data/Value" },
    { key: "tenYearYieldDirection", label: "10Y Yield Direction", type: "select", options: ["Rising", "Falling", "Sideways", "Mixed", "Data not verified"] },
    { key: "twoYearYieldDirection", label: "2Y Yield Direction", type: "select", options: ["Rising", "Falling", "Sideways", "Mixed", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Real Yields Check": [
    { key: "currentDataValue", label: "Current Data/Value" },
    { key: "realYieldsDirection", label: "Real Yields Direction", type: "select", options: ["Rising", "Falling", "Sideways", "Mixed", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Fed Tone / FOMC Check": [
    { key: "fedTone", label: "Fed Tone", type: "select", options: ["Hawkish", "Dovish", "Neutral", "Mixed", "Data not verified"] },
    { key: "rateExpectation", label: "Rate Expectation", type: "select", options: ["Cuts Expected", "Hold Expected", "Hike Expected", "Higher For Longer", "Mixed", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "CPI / PCE Inflation Check": [
    { key: "latestInflationData", label: "Latest Inflation Data" },
    { key: "inflationResult", label: "Inflation Result", type: "select", options: ["Hotter Than Expected", "Softer Than Expected", "In Line", "Mixed", "Data not verified"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "NFP / Jobs Check": [
    { key: "latestJobsData", label: "Latest Jobs Data" },
    { key: "jobsResult", label: "Jobs Result", type: "select", options: ["Stronger Than Expected", "Weaker Than Expected", "In Line", "Mixed", "Data not verified"] },
    { key: "unemploymentRate", label: "Unemployment Rate" },
    { key: "wageGrowth", label: "Wage Growth" },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Geopolitics / Risk Sentiment Check": [
    { key: "riskLevel", label: "Risk Level", type: "select", options: ["Low", "Medium", "High", "Extreme", "Data not verified"] },
    { key: "dxyReaction", label: "DXY Reaction", type: "select", options: ["Rising", "Falling", "Stable", "Unknown"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "ETF / Central Bank Demand Check": [
    { key: "etfFlowDirection", label: "ETF Flow Direction", type: "select", options: ["Inflows", "Outflows", "Flat", "Unknown"] },
    { key: "centralBankDemand", label: "Central Bank Demand", type: "select", options: ["Strong Buying", "Weak Buying", "Selling", "Unknown"] },
    { key: "newsHeadline", label: "News Headline" },
    { key: "newsSummary", label: "News Summary", type: "textarea" },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldImpact", label: "Gold Impact", type: "select", options: AUTO_IMPACT_OPTIONS },
    { key: "reason", label: "Reason", type: "textarea" }
  ],
  "Gold Technical Structure Check": [
    { key: "higherTimeframeBias", label: "Higher Timeframe Bias", type: "select", options: ["Bullish", "Bearish", "Neutral", "Data not verified"] },
    { key: "keySupport", label: "Key Support" },
    { key: "keyResistance", label: "Key Resistance" },
    { key: "liquidityArea", label: "Liquidity Area" },
    { key: "marketStructure", label: "Market Structure", type: "select", options: ["Bullish", "Bearish", "Ranging", "Data not verified"] },
    { key: "setupPresent", label: "Setup Present", type: "select", options: ["Yes", "No", "Unclear"] },
    { key: "setupType", label: "Setup Type", type: "select", options: ["Liquidity Sweep", "BOS", "MSS", "FVG", "OB", "Retest", "Other", "None"] },
    { key: "chartObservation", label: "My Chart Observation", type: "textarea" },
    { key: "sourceLink", label: "Source Link", type: "url" },
    { key: "goldTechnicalVerdict", label: "Gold Technical Verdict", type: "select", options: ["Buy Setup", "Sell Setup", "Wait"] },
    { key: "reason", label: "Reason", type: "textarea" }
  ]
};

const SETUP_SELECT_OPTIONS: Partial<Record<keyof GoldTradeSetupInputs, string[]>> = {
  mode: ["Manual", "Assisted"],
  currentPriceLocation: ["Near support", "Near resistance", "In range", "At liquidity sweep", "After breakout", "Unknown"],
  higherTimeframeBias: ["Bullish", "Bearish", "Neutral"],
  marketStructure: ["Bullish", "Bearish", "Ranging"],
  liquiditySweepHappened: ["Yes", "No", "Not yet"],
  sweepType: ["Buy-side sweep", "Sell-side sweep", "None"],
  marketStructureShiftHappened: ["Yes", "No", "Not yet"],
  breakOfStructureHappened: ["Yes", "No", "Not yet"],
  entryModel: ["Sweep + MSS", "BOS Retest", "FVG Retest", "Order Block Retest", "Liquidity Grab", "Breakout Retest", "Other"],
  setupTimeframe: ["H4", "H1", "M15", "M5"],
  entryTimeframe: ["M15", "M5", "M1"]
};

const SETUP_INPUT_SECTIONS: Array<{ title: string; fields: Array<{ key: keyof GoldTradeSetupInputs; label: string; type?: "text" | "number" | "select" }> }> = [
  {
    title: "Current price and liquidity map",
    fields: [
      { key: "currentGoldPrice", label: "Current Gold/XAUUSD price", type: "number" },
      { key: "buySideLiquidityLevel", label: "Buy-side liquidity level", type: "text" },
      { key: "buySideLiquidityReason", label: "Buy-side liquidity reason", type: "text" },
      { key: "sellSideLiquidityLevel", label: "Sell-side liquidity level", type: "text" },
      { key: "sellSideLiquidityReason", label: "Sell-side liquidity reason", type: "text" },
      { key: "keySupport", label: "Key support", type: "text" },
      { key: "keyResistance", label: "Key resistance", type: "text" },
      { key: "premiumDiscountArea", label: "Premium/discount area", type: "text" },
      { key: "currentPriceLocation", label: "Current price location", type: "select" }
    ]
  },
  {
    title: "Technical structure",
    fields: [
      { key: "higherTimeframeBias", label: "Higher timeframe bias", type: "select" },
      { key: "marketStructure", label: "Market structure", type: "select" },
      { key: "liquiditySweepHappened", label: "Has liquidity sweep happened?", type: "select" },
      { key: "sweepType", label: "Sweep type", type: "select" },
      { key: "marketStructureShiftHappened", label: "Has MSS happened?", type: "select" },
      { key: "breakOfStructureHappened", label: "Has BOS happened?", type: "select" },
      { key: "entryModel", label: "Entry model", type: "select" },
      { key: "setupTimeframe", label: "Setup timeframe", type: "select" },
      { key: "entryTimeframe", label: "Entry timeframe", type: "select" }
    ]
  },
  {
    title: "Risk inputs",
    fields: [
      { key: "possibleEntryPrice", label: "Possible entry price", type: "number" },
      { key: "stopLossPrice", label: "Stop loss price", type: "number" },
      { key: "takeProfit1", label: "Take profit 1", type: "number" },
      { key: "takeProfit2", label: "Take profit 2", type: "number" },
      { key: "minimumRiskReward", label: "Minimum RR required", type: "number" }
    ]
  }
];

export function GoldResearchDesk() {
  const { goldResearchReports, dailyGoldResearchReports, addGoldResearchReport, addDailyGoldResearchReport, addGoldTradeSetup, refreshData } = useAppData();
  const [selectedDriver, setSelectedDriver] = useState<GoldDriverName>("DXY / US Dollar");
  const [reportDate, setReportDate] = useState(today());
  const [driverFields, setDriverFields] = useState<GoldDriverFields>({});
  const [analysis, setAnalysis] = useState<GoldDriverAnalysis | null>(null);
  const [checklist, setChecklist] = useState<GoldResearchChecklist>(DEFAULT_GOLD_RESEARCH_CHECKLIST);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [autoReport, setAutoReport] = useState<GoldAutoFillResponse | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoMessage, setAutoMessage] = useState("");
  const [editingAutoDriver, setEditingAutoDriver] = useState<GoldAutoDriverName | null>(null);
  const [showAutoSummary, setShowAutoSummary] = useState(false);
  const [setupInputs, setSetupInputs] = useState<GoldTradeSetupInputs>({ ...DEFAULT_GOLD_TRADE_SETUP_INPUTS, setupDate: today() });
  const [setupResult, setSetupResult] = useState<GoldTradeSetupResult | null>(null);
  const [savedSetup, setSavedSetup] = useState<GoldTradeSetup | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupMessage, setSetupMessage] = useState("");
  const [loadedDailyResearch, setLoadedDailyResearch] = useState<DailyGoldResearchReport | null>(null);
  const [marketData, setMarketData] = useState<XauusdMarketData | null>(null);
  const [marketDataLoading, setMarketDataLoading] = useState(false);
  const [marketDataMessage, setMarketDataMessage] = useState("");
  const [levelsFromMarketData, setLevelsFromMarketData] = useState(false);
  const [liquidityLevelsConfirmed, setLiquidityLevelsConfirmed] = useState(false);
  const [sections, setSections] = useState<GoldAutoResearchSection[]>(createEmptyAutoFillResponse().sections);

  const formConfig = DRIVER_FORM_CONFIG[selectedDriver];
  const driverSpecificFields = formConfig.fields.filter((fieldConfig) => !CORE_FIELD_KEYS.has(fieldConfig.key));
  const biasSummary = useMemo(() => buildGoldBiasSummary(goldResearchReports), [goldResearchReports]);
  const checklistResult = useMemo(() => getGoldChecklistResult(checklist), [checklist]);
  const todayReports = useMemo(() => goldResearchReports.filter((report) => report.reportDate === today()), [goldResearchReports]);
  const weeklyReports = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return goldResearchReports.filter((report) => new Date(`${report.reportDate}T00:00:00`) >= cutoff);
  }, [goldResearchReports]);
  const latestDailyResearch = dailyGoldResearchReports[0] ?? null;
  const activeDailyResearch = loadedDailyResearch ?? latestDailyResearch;
  const setupResearch = useMemo(() => buildSetupResearchSummary(setupInputs.mode === "Assisted" ? activeDailyResearch : autoReport, biasSummary), [activeDailyResearch, autoReport, biasSummary, setupInputs.mode]);
  const setupRiskReward = useMemo(() => calculateGoldSetupRiskReward(setupInputs), [setupInputs]);
  const showSetupAssistant = Boolean(autoReport || showSummary || goldResearchReports.length);
  const marketDataConnected = marketData?.status === "success";
  const terminalGoldPrice = marketData?.currentPrice || autoReport?.goldCurrentPrice || setupInputs.currentGoldPrice || "Awaiting feed";
  const terminalLastUpdated = marketData?.lastUpdated || autoReport?.date || activeDailyResearch?.reportDate || "Not synced";
  const terminalReportDate = activeDailyResearch?.reportDate || autoReport?.date || reportDate;
  const terminalPriceSource = marketData?.source || "Twelve Data";
  const terminalPriceProvider = marketData?.provider || "Twelve Data";
  const autoImpactCounts = useMemo(() => getAutoImpactCounts(autoReport), [autoReport]);

  useEffect(() => {
    if (!marketData?.currentPrice || marketData.status !== "success") return;
    setSetupInputs((current) => ({ ...current, setupDate: autoReport?.date || today(), currentGoldPrice: current.currentGoldPrice || marketData.currentPrice }));
  }, [marketData, autoReport]);

  async function autoFillGoldResearch() {
    setAutoLoading(true);
    setAutoMessage("Researching current Gold drivers...");

    try {
      const response = await fetch("/api/gold-research/auto-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: reportDate || today() })
      });
      const result = await readJsonResponse(response);

      if (!response.ok) throw new Error(getAutoFillErrorMessage(result));

      const normalized = normalizeAutoFillResponse(result);
      setAutoReport(normalized);
      setSections(normalized.sections);
      setReportDate(normalized.date);
      setShowAutoSummary(true);
      setEditingAutoDriver(null);
      setAutoMessage(normalized.warning ?? "Auto-fill complete. Review and edit the research before saving.");
    } catch (error) {
      setAutoMessage(error instanceof Error ? error.message : "Could not verify fresh sources. Try again later.");
    } finally {
      setAutoLoading(false);
    }
  }

  function updateAutoSectionField(driver: GoldAutoDriverName, key: keyof GoldAutoResearchSection, value: string) {
    setSections((current) => current.map((section) => (section.driver === driver ? { ...section, [key]: value } : section)));
    setAutoReport((current) => {
      if (!current) return current;
      const updatedSections = sections.map((section) => (section.driver === driver ? { ...section, [key]: value } : section));
      return {
        ...current,
        sections: updatedSections,
        fullSummary: buildAutoGoldSummary(updatedSections)
      };
    });
  }

  function generateAutoSummary() {
    const summary = buildAutoGoldSummary(sections);
    setAutoReport((current) => ({
      date: current?.date || reportDate || today(),
      goldCurrentPrice: current?.goldCurrentPrice || "",
      sections,
      fullSummary: summary
    }));
    setShowAutoSummary(true);
    setAutoMessage("Full Gold bias summary generated from the current 9 sections.");
  }

  async function saveDailyGoldResearch() {
    setAutoSaving(true);
    setAutoMessage("");

    try {
      const fullSummary = buildAutoGoldSummary(sections);
      await addDailyGoldResearchReport({
        reportDate: autoReport?.date || reportDate || today(),
        goldCurrentPrice: autoReport?.goldCurrentPrice || "",
        sections,
        fullSummary,
        overallGoldBias: fullSummary.overallGoldBias,
        preTradeVerdict: fullSummary.preTradeVerdict
      });
      setAutoReport((current) => ({
        date: current?.date || reportDate || today(),
        goldCurrentPrice: current?.goldCurrentPrice || "",
        sections,
        fullSummary
      }));
      setShowAutoSummary(true);
      setAutoMessage("Daily Gold research saved to Supabase.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to save daily Gold research.";
      setAutoMessage(
        errorMessage.includes("daily_gold_research_reports")
          ? `${errorMessage}. Run supabase/daily-gold-research-reports.sql in Supabase SQL Editor, then try saving again.`
          : errorMessage
      );
    } finally {
      setAutoSaving(false);
    }
  }

  async function analyzeDriver() {
    const input = buildAnalysisInput(selectedDriver, reportDate, driverFields);
    setMessage("");

    if (!reportDate) {
      setMessage("Choose a report date before analysis.");
      return;
    }

    if (!hasMeaningfulGoldResearchInput(input)) {
      setMessage("Add driver information before analysis.");
      return;
    }

    setAnalyzing(true);

    try {
      const response = await fetch("/api/analyze-gold-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const result = await response.json();

      if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "Unable to analyze this driver.");
      setAnalysis(result as GoldDriverAnalysis);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to analyze this driver.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveReport() {
    if (!analysis) return;
    const input = buildAnalysisInput(selectedDriver, reportDate, driverFields);

    if (!hasMeaningfulGoldResearchInput(input)) {
      setMessage("Add driver information before analysis.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await addGoldResearchReport({
        ...input,
        ...analysis,
        reportDate
      });
      setMessage("Gold research report saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save Gold research.");
    } finally {
      setSaving(false);
    }
  }

  function updateDriverField(key: string, value: string) {
    setDriverFields((current) => ({ ...current, [key]: value }));
    setAnalysis(null);
  }

  function updateSetupInput(key: keyof GoldTradeSetupInputs, value: string) {
    setSetupInputs((current) => ({ ...current, [key]: value }));
    setSavedSetup(null);
    if (isLiquidityLevelField(key)) {
      setLiquidityLevelsConfirmed(false);
      setSetupResult(null);
    }
  }

  async function fetchGoldMarketData() {
    setMarketDataLoading(true);
    setMarketDataMessage("");
    setSetupMessage("");

    try {
      const response = await fetch("/api/market-data/xauusd", { cache: "no-store" });
      const result = await readJsonResponse(response);
      const normalized = normalizeMarketDataResponse(result);

      if (!response.ok || normalized.status !== "success") {
        throw new Error(getMarketDataErrorMessage(result));
      }

      setMarketData(normalized);
      setMarketDataMessage(normalized.message || "Gold market data fetched from Twelve Data.");
      setLevelsFromMarketData(true);
      setLiquidityLevelsConfirmed(false);
      setSavedSetup(null);
      setSetupResult(null);
      setSetupInputs((current) => ({
        ...current,
        currentGoldPrice: normalized.currentPrice || current.currentGoldPrice,
        buySideLiquidityLevel: normalized.suggestedBuySideLiquidity || current.buySideLiquidityLevel,
        buySideLiquidityReason: "Suggested from previous/recent high via market data",
        sellSideLiquidityLevel: normalized.suggestedSellSideLiquidity || current.sellSideLiquidityLevel,
        sellSideLiquidityReason: "Suggested from previous/recent low via market data",
        keySupport: normalized.suggestedSupport || current.keySupport,
        keyResistance: normalized.suggestedResistance || current.keyResistance,
        currentPriceLocation: normalizePriceLocation(normalized.currentPriceLocation) || current.currentPriceLocation
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not fetch XAUUSD data from Twelve Data.";
      setMarketData({ ...EMPTY_MARKET_DATA, message });
      setMarketDataMessage(message);
    } finally {
      setMarketDataLoading(false);
    }
  }

  async function loadLatestGoldResearch() {
    setSetupMessage("");
    await refreshData();
    const latest = latestDailyResearch;

    if (!latest) {
      setLoadedDailyResearch(null);
      setSetupMessage("No saved Gold research found. Generate or save a Gold research report first.");
      return;
    }

    setLoadedDailyResearch(latest);
    setSetupInputs((current) => ({
      ...current,
      setupDate: latest.reportDate,
      currentGoldPrice: current.currentGoldPrice || latest.goldCurrentPrice
    }));
    setSetupMessage(`Loaded latest saved daily Gold research from ${latest.reportDate}.`);
  }

  function getAssistedSetupBlocker() {
    if (setupInputs.mode !== "Assisted") return "";
    if (!activeDailyResearch) return "No saved Gold research found. Generate or save a Gold research report first.";
    if (!setupInputs.currentGoldPrice) return "Enter current Gold/XAUUSD price before generating a setup.";
    if (!setupInputs.buySideLiquidityLevel || !setupInputs.sellSideLiquidityLevel) return "Enter buy-side and sell-side liquidity from your chart before generating a setup.";
    return "";
  }

  async function generateGoldTradeSetup() {
    setSetupLoading(true);
    setSetupMessage("");
    setSavedSetup(null);

    try {
      const assistedBlocker = getAssistedSetupBlocker();
      if (assistedBlocker) {
        setSetupMessage(assistedBlocker);
        return;
      }

      const setupRuleOptions = { levelsFromMarketData, liquidityLevelsConfirmed };

      if (setupInputs.mode === "Manual") {
        setSetupResult(enforceGoldTradeSetupRules(buildManualGoldTradeSetup(setupResearch, setupInputs, STRATEGIES), setupResearch, setupInputs, STRATEGIES, setupRuleOptions));
        setSetupMessage("Manual setup generated. Review the result before saving.");
        return;
      }

      const response = await fetch("/api/gold-research/generate-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ research: setupResearch, inputs: setupInputs, strategies: STRATEGIES, riskReward: setupRiskReward, marketData: setupRuleOptions })
      });
      const result = await readJsonResponse(response);
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Unable to generate Gold trade setup.");
      setSetupResult(enforceGoldTradeSetupRules(normalizeGoldTradeSetupResult(result), setupResearch, setupInputs, STRATEGIES, setupRuleOptions));
      setSetupMessage("Assisted setup generated. Confirm all liquidity levels on your chart.");
    } catch (error) {
      setSetupMessage(error instanceof Error ? error.message : "Unable to generate Gold trade setup.");
    } finally {
      setSetupLoading(false);
    }
  }

  async function saveGoldTradeSetup() {
    if (!setupResult) return;
    setSetupSaving(true);
    setSetupMessage("");

    try {
      const setup = await addGoldTradeSetup({
        ...setupResult,
        researchReportId: undefined,
        setupDate: setupInputs.setupDate || today(),
        status: "Planned"
      });
      setSavedSetup(setup);
      setSetupMessage("Gold trade setup saved.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to save Gold trade setup.";
      setSetupMessage(
        errorMessage.includes("gold_trade_setups")
          ? `${errorMessage}. Run supabase/gold-trade-setups.sql in Supabase SQL Editor, then try again.`
          : errorMessage
      );
    } finally {
      setSetupSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <GoldTerminalHeader
        currentPrice={terminalGoldPrice}
        overallBias={setupResearch.overallGoldBias || "Mixed-Wait"}
        reportDate={terminalReportDate}
        lastUpdated={terminalLastUpdated}
        marketDataConnected={marketDataConnected}
        checklistResult={checklistResult.result}
        bullishCount={autoImpactCounts.bullish}
        bearishCount={autoImpactCounts.bearish}
        mixedCount={autoImpactCounts.mixed}
        priceSource={terminalPriceSource}
        priceProvider={terminalPriceProvider}
      />

      <ResearchEngineStatus
        marketDataConnected={marketDataConnected}
        hasAutoReport={Boolean(autoReport)}
        liquidityConfirmed={liquidityLevelsConfirmed}
        setupResult={setupResult}
        riskRewardPasses={setupRiskReward.passes}
      />

      <section className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">AI Research Layer</p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary">9-Point Gold Pre-Trade Checklist</h2>
            <p className="mt-1 text-sm text-text-secondary">Each Gold driver is reviewed with live data, news, chart observation, and impact assessment. Edit any field directly, then generate the full bias summary.</p>
          </div>
          <button
            type="button"
            onClick={() => void autoFillGoldResearch()}
            disabled={autoLoading}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-gold/30 bg-gold/10 px-5 py-3 text-sm font-semibold text-gold hover:bg-gold/20 disabled:opacity-60"
          >
            {autoLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {autoLoading ? "Researching current Gold drivers..." : "Auto-Fill Today's Gold Data"}
          </button>
        </div>

        <div className="mt-4 flex gap-2 rounded-md border border-gold/20 bg-gold/5 px-4 py-3 text-sm text-gold">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>AI research can make mistakes. Confirm major data, prices, and news before trading.</p>
        </div>

        {autoMessage ? <p className="mt-3 rounded-md bg-surface-panel px-4 py-3 text-sm text-text-secondary">{autoMessage}</p> : null}

        {autoReport ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <AutoMeta label="Report date" value={autoReport.date} />
             <AutoMeta label="Gold current price" value={autoReport.goldCurrentPrice || "Data not verified."} />
            <AutoMeta label="Overall bias" value={autoReport.fullSummary.overallGoldBias} />
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={generateAutoSummary} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-profit/30 bg-profit/10 px-5 py-3 text-sm font-semibold text-profit hover:bg-profit/20">
            <FileText className="h-4 w-4" />
            Generate Full Gold Bias Summary
          </button>
          <button type="button" onClick={() => void saveDailyGoldResearch()} disabled={autoSaving} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-border-subtle bg-surface-panel px-5 py-3 text-sm font-semibold text-text-primary disabled:opacity-60 hover:bg-surface-elevated">
            <Save className="h-4 w-4" />
            {autoSaving ? "Saving..." : "Save Daily Gold Research"}
          </button>
        </div>

        {showAutoSummary && autoReport ? <AutoFullSummaryPanel report={autoReport} /> : null}

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {sections.map((section) => (
            <AutoSectionCard
              key={section.driver}
              section={section}
              editing={editingAutoDriver === section.driver}
              onEdit={() => setEditingAutoDriver((current) => (current === section.driver ? null : section.driver))}
              onChange={(key, value) => updateAutoSectionField(section.driver, key, value)}
            />
          ))}
        </div>
      </section>

      <GoldDriverHeatmap
        report={autoReport}
        selectedDriver={selectedDriver}
        onSelect={(driver) => {
          setSelectedDriver(driver);
          setDriverFields({});
          setAnalysis(null);
          setMessage("");
          setShowSummary(false);
        }}
      />

      {showSetupAssistant ? (
        <section className="rounded-lg border border-stone-800 bg-[#0d0c09] p-5 text-stone-50 shadow-soft">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Execution Readiness Layer</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-white">GOLD TRADE SETUP ASSISTANT</h2>
              <p className="mt-1 text-sm text-stone-400">Build a structured Buy, Sell, Pending Confirmation, or WAIT setup from research, liquidity, structure, strategy, and risk.</p>
            </div>
            <span className={cn("rounded-md px-3 py-1 text-xs font-bold", autoBadgeClass(setupResearch.overallGoldBias))}>{setupResearch.overallGoldBias || "Mixed-Wait"}</span>
          </div>

          <SetupDecisionPanel
            result={setupResult}
            research={setupResearch}
            riskReward={setupRiskReward}
            liquidityConfirmed={liquidityLevelsConfirmed}
            levelsFromMarketData={levelsFromMarketData}
            marketDataConnected={marketDataConnected}
            inputs={setupInputs}
          />

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <InfoBox title="Buy-side liquidity" text="Liquidity resting above highs where buy stops and breakout orders may sit." />
            <InfoBox title="Sell-side liquidity" text="Liquidity resting below lows where sell stops and stop losses may sit." />
            <InfoBox title="Gold liquidity rule" text="Gold often sweeps liquidity before the real move. Wait for confirmation after the sweep." />
          </div>

          <div className="mt-4 grid gap-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100 md:grid-cols-2">
            {[
              "This is not a guaranteed signal.",
              "Only enter after technical confirmation.",
              "Do not trade if risk-to-reward is below 1:2.",
              "Do not trade if liquidity levels are not confirmed on chart.",
              "Do not trade directly before major news."
            ].map((warning) => (
              <div key={warning} className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Field label="Setup mode">
              <SetupInput field={{ key: "mode", label: "Setup mode", type: "select" }} value={setupInputs.mode} onChange={(value) => updateSetupInput("mode", value)} />
            </Field>
            <Field label="Setup date">
              <input type="date" value={setupInputs.setupDate} onChange={(event) => updateSetupInput("setupDate", event.target.value)} className={inputClass} />
            </Field>
            <div className={cn("rounded-md border px-4 py-3", setupRiskReward.passes ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200")}>
              <p className="text-xs font-semibold uppercase">Risk-to-reward</p>
              <p className="mt-1 text-lg font-bold">{setupRiskReward.ratio === null ? "Not ready" : `1:${setupRiskReward.ratio.toFixed(2)}`}</p>
              <p className="mt-1 text-xs">{setupRiskReward.passes ? "Passes trading plan" : "Needs at least 1:2 and valid SL/TP"}</p>
            </div>
          </div>

          {setupInputs.mode === "Assisted" ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-md border border-stone-800 bg-stone-950 p-4 text-sm text-stone-200">
                <p>
                  Assisted Mode uses your latest Gold Research report, the liquidity/price levels you enter from your chart, and your Smart Journal strategy list. It does not invent liquidity levels. If current price, buy-side liquidity, sell-side liquidity, support, resistance, or structure are missing, the setup verdict must be WAIT or Pending Confirmation.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <SourceCard label="Gold Research Source" value={activeDailyResearch ? `Latest saved daily Gold research - ${activeDailyResearch.reportDate}` : "Latest saved daily Gold research"} />
                <SourceCard label="Liquidity Source" value="Manual chart input" />
                <SourceCard label="Strategy Source" value="Smart Journal strategy list" />
                <SourceCard label="Risk Source" value="Entry, SL, and TP fields" />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => void loadLatestGoldResearch()} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-stone-700 px-4 py-3 text-sm font-semibold text-stone-100 hover:bg-stone-900">
                  <RefreshCw className="h-4 w-4" />
                  Load Latest Gold Research
                </button>
                <p className="text-sm text-stone-400">
                  {activeDailyResearch ? `Report date used: ${activeDailyResearch.reportDate}` : "No saved daily research loaded yet."}
                </p>
              </div>
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Liquidity levels require manual chart confirmation unless a market data/chart API is connected.</span>
              </div>
            </div>
          ) : null}

          <MarketDataSourcePanel
            data={marketData}
            loading={marketDataLoading}
            message={marketDataMessage}
            confirmed={liquidityLevelsConfirmed}
            levelsFromMarketData={levelsFromMarketData}
            onFetch={() => void fetchGoldMarketData()}
            onConfirmChange={(checked) => {
              setLiquidityLevelsConfirmed(checked);
              setSetupResult(null);
              setSavedSetup(null);
            }}
          />

          <div className="mt-5 space-y-5">
            {SETUP_INPUT_SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="flex flex-wrap items-center gap-2">
                   <p className="text-xs font-bold uppercase text-text-muted">{section.title}</p>
                  <SourceLabel label={getSetupSectionSource(section.title)} />
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {section.fields.map((field) => (
                    <Field key={field.key} label={field.label}>
                      <SetupInput field={field} value={setupInputs[field.key]} onChange={(value) => updateSetupInput(field.key, value)} />
                    </Field>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 rounded-md border border-stone-800 bg-stone-950 px-4 py-3 text-sm font-medium text-stone-200">{GOLD_PERSONAL_RULE}</p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => void generateGoldTradeSetup()} disabled={setupLoading} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-gold/30 bg-gold/10 px-5 py-3 text-sm font-semibold text-gold hover:bg-gold/20 disabled:opacity-60">
              {setupLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {setupLoading ? "Generating..." : "Generate Gold Trade Setup"}
            </button>
            <button type="button" onClick={() => void saveGoldTradeSetup()} disabled={!setupResult || setupSaving} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-stone-700 px-5 py-3 text-sm font-semibold text-stone-100 disabled:opacity-60">
              <Save className="h-4 w-4" />
              {setupSaving ? "Saving..." : "Save Trade Setup"}
            </button>
            {setupResult ? <UseSetupLink setup={setupResult} savedSetup={savedSetup} /> : null}
          </div>

          {setupMessage ? <p className="mt-3 rounded-md border border-stone-800 bg-stone-950 px-4 py-3 text-sm text-stone-300">{setupMessage}</p> : null}
          {setupResult ? <GoldTradeSetupResultCard result={setupResult} /> : null}
        </section>
      ) : null}

      <section className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-soft">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Manual Driver Lab</p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary">Open a specific Gold driver</h2>
          </div>
          <button type="button" onClick={() => setShowSummary(true)} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-profit/30 bg-profit/10 px-4 py-3 text-sm font-semibold text-profit hover:bg-profit/20">
            <FileText className="h-4 w-4" />
            Generate Full Gold Bias Summary
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {GOLD_DRIVER_NAMES.map((driver) => (
            <button
              key={driver}
              type="button"
              onClick={() => {
                setSelectedDriver(driver);
                setDriverFields({});
                setAnalysis(null);
                setMessage("");
                setShowSummary(false);
              }}
              className={cn(
                "rounded-md border px-4 py-3 text-left text-sm font-semibold transition hover:-translate-y-0.5",
                selectedDriver === driver
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-border-subtle bg-surface-panel hover:bg-surface-elevated text-text-primary"
              )}
            >
              {driver}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{selectedDriver}</h2>
              <p className="mt-1 text-sm text-text-secondary">{formConfig.description}</p>
            </div>
            <input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} className={inputClass} />
          </div>
          <div className="mt-4 space-y-5">
            {driverSpecificFields.length ? (
              <div>
                <p className="text-xs font-bold uppercase text-text-muted">Driver-specific data</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {driverSpecificFields.map((fieldConfig) => (
                    <Field key={fieldConfig.key} label={fieldConfig.label} wide={fieldConfig.type === "textarea"}>
                      <DriverInput config={fieldConfig} value={driverFields[fieldConfig.key] ?? ""} onChange={(value) => updateDriverField(fieldConfig.key, value)} />
                    </Field>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="text-xs font-bold uppercase text-text-muted">Main research inputs</p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {CORE_RESEARCH_FIELDS.map((fieldConfig) => (
                  <Field key={fieldConfig.key} label={fieldConfig.label} wide={fieldConfig.type === "textarea"}>
                    <DriverInput config={fieldConfig} value={driverFields[fieldConfig.key] ?? ""} onChange={(value) => updateDriverField(fieldConfig.key, value)} />
                  </Field>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => void analyzeDriver()} disabled={analyzing} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-gold/30 bg-gold/10 px-5 py-3 text-sm font-semibold text-gold hover:bg-gold/20 disabled:opacity-60">
              <Search className="h-4 w-4" />
              {analyzing ? "Analyzing..." : "Analyze Driver"}
            </button>
            <button type="button" onClick={() => void saveReport()} disabled={!analysis || saving} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-border-subtle bg-surface-panel px-5 py-3 text-sm font-semibold text-text-primary disabled:opacity-60 hover:bg-surface-elevated">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Report"}
            </button>
          </div>
          {message ? <p className="mt-3 rounded-md bg-surface-panel px-4 py-3 text-sm text-text-secondary">{message}</p> : null}
        </div>

        <div className="space-y-4">
          {analysis ? <AnalysisPanel analysis={analysis} /> : <EmptyPanel />}
          {showSummary ? <SummaryPanel summary={biasSummary} /> : null}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-text-primary">Gold Pre-Trade Checklist</h2>
            <span className={cn("rounded-md px-3 py-1 text-xs font-bold", checklistBadgeClass(checklistResult.result))}>
              {checklistResult.result} {checklistResult.score}/{checklistResult.total}
            </span>
          </div>
          <div className="mt-4 grid gap-2">
            {Object.entries(GOLD_RESEARCH_CHECKLIST_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-start gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={checklist[key as keyof GoldResearchChecklist]}
                  onChange={(event) => setChecklist((current) => ({ ...current, [key]: event.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-border text-gold"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-soft">
          <h2 className="text-lg font-semibold text-text-primary">Gold Trading Windows in SAST</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {GOLD_SESSION_WINDOWS.map((window) => (
              <div key={window.time} className="rounded-md border border-border-subtle bg-surface-panel p-4 text-sm">
                <p className="font-semibold text-text-primary">{window.time}</p>
                <p className="mt-1 font-medium text-gold">{window.name}</p>
                <p className="mt-2 text-text-secondary">{window.note}</p>
                <p className="mt-2 text-xs font-semibold uppercase text-text-muted">{window.rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Research Exports</h2>
            <p className="mt-1 text-sm text-text-secondary">{GOLD_PERSONAL_RULE}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportButton onClick={() => void exportGoldResearchPackPdf(todayReports, checklistResult.result, `primasta-gold-research-today-${today()}.pdf`, "Today's Gold Research")} label="Today PDF" />
            <ExportButton onClick={() => void exportGoldResearchPackPdf(weeklyReports, checklistResult.result, `primasta-gold-research-weekly-${today()}.pdf`, "Weekly Gold Research")} label="Weekly PDF" />
            <ExportButton onClick={() => exportGoldResearchCsv(goldResearchReports)} label="All CSV" />
            <ExportButton onClick={() => void exportGoldBiasSummaryPdf(goldResearchReports, checklistResult.result)} label="Bias PDF" />
          </div>
        </div>
      </section>
    </div>
  );
}

function GoldTerminalHeader({
  currentPrice,
  overallBias,
  reportDate,
  lastUpdated,
  marketDataConnected,
  checklistResult,
  bullishCount,
  bearishCount,
  mixedCount,
  priceSource,
  priceProvider
}: {
  currentPrice: string;
  overallBias: string;
  reportDate: string;
  lastUpdated: string;
  marketDataConnected: boolean;
  checklistResult: string;
  bullishCount: number;
  bearishCount: number;
  mixedCount: number;
  priceSource: string;
  priceProvider: string;
}) {
  return (
    <header className="overflow-hidden rounded-lg border border-stone-800 bg-[#0a0907] p-5 text-white shadow-soft">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">PRIMASTA Research Engine</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-bold tracking-tight text-white md:text-4xl">Gold Institutional Command Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-stone-400">Macro drivers, market data, chart confirmation, setup readiness, and risk control in one professional XAUUSD research workflow.</p>
        </div>
        <Link href="/gold-research/history" className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-amber-400/30 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/15">
          <History className="h-4 w-4" />
          History
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <TerminalMetric icon={<Activity className="h-4 w-4" />} label="XAUUSD Price" value={currentPrice} detail={marketDataConnected ? `${priceProvider} connected` : "Awaiting market feed"} tone={marketDataConnected ? "success" : "warning"} />
        <TerminalMetric icon={<BrainCircuit className="h-4 w-4" />} label="Gold Bias" value={overallBias || "Mixed-Wait"} detail={`Report date: ${reportDate}`} tone={biasTone(overallBias)} />
        <TerminalMetric icon={<Layers3 className="h-4 w-4" />} label="Driver Stack" value={`${bullishCount}B / ${bearishCount}S / ${mixedCount}M`} detail="Bullish, bearish, mixed" tone="neutral" />
        <TerminalMetric icon={<ShieldCheck className="h-4 w-4" />} label="Checklist" value={checklistResult} detail="Pre-trade readiness" tone={checklistResult === "Aligned" ? "success" : checklistResult === "Wait" ? "warning" : "neutral"} />
        <TerminalMetric icon={<Database className="h-4 w-4" />} label="Last Sync" value={lastUpdated} detail="Research and market data" tone="neutral" />
      </div>
    </header>
  );
}

function TerminalMetric({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: "success" | "warning" | "danger" | "neutral" }) {
  return (
    <div className="rounded-md border border-stone-800 bg-stone-950/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", terminalToneClass(tone))}>{icon}</span>
      </div>
      <p className="mt-3 text-xl font-bold tracking-tight text-white">{value || "-"}</p>
      <p className="mt-1 text-xs text-stone-500">{detail}</p>
    </div>
  );
}

function ResearchEngineStatus({
  marketDataConnected,
  hasAutoReport,
  liquidityConfirmed,
  setupResult,
  riskRewardPasses
}: {
  marketDataConnected: boolean;
  hasAutoReport: boolean;
  liquidityConfirmed: boolean;
  setupResult: GoldTradeSetupResult | null;
  riskRewardPasses: boolean;
}) {
  const layers = [
    { icon: Database, label: "Market Data Layer", status: marketDataConnected ? "Connected" : "Not connected", tone: marketDataConnected ? "success" : "warning" },
    { icon: BrainCircuit, label: "AI Analysis Layer", status: hasAutoReport ? "Research loaded" : "Awaiting auto-fill", tone: hasAutoReport ? "success" : "neutral" },
    { icon: ShieldCheck, label: "Chart Confirmation Layer", status: liquidityConfirmed ? "Confirmed" : "Needs confirmation", tone: liquidityConfirmed ? "success" : "warning" },
    { icon: Gauge, label: "Execution Readiness", status: setupResult?.setupVerdict ?? (riskRewardPasses ? "Risk ready" : "Risk not ready"), tone: setupResult?.setupVerdict === "Buy Setup" || setupResult?.setupVerdict === "Sell Setup" ? "success" : setupResult?.setupVerdict === "Wait" ? "danger" : riskRewardPasses ? "neutral" : "warning" }
  ] as const;

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {layers.map((layer) => {
        const Icon = layer.icon;
        return (
          <div key={layer.label} className="rounded-lg border border-border-subtle bg-surface-card p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-md", terminalToneClass(layer.tone))}>
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">{layer.label}</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">{layer.status}</p>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function GoldDriverHeatmap({ report, selectedDriver, onSelect }: { report: GoldAutoFillResponse | null; selectedDriver: GoldDriverName; onSelect: (driver: GoldDriverName) => void }) {
  const items = report?.sections.length
    ? report.sections.map((section) => ({
        label: section.driver.replace(" Check", ""),
        driver: getDriverFromAutoDriver(section.driver),
        impact: section.goldImpact,
        summary: section.reason || section.newsHeadline || "Research loaded"
      }))
    : GOLD_DRIVER_NAMES.map((driver) => ({
        label: driver,
        driver,
        impact: "Awaiting data",
        summary: "Run Auto-Fill or enter research manually"
      }));

  return (
    <section className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-soft">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Macro Driver Heatmap</p>
          <h2 className="mt-1 text-lg font-semibold text-text-primary">Gold driver impact stack</h2>
        </div>
        <p className="text-sm text-text-secondary">Click a driver to open its research form.</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelect(item.driver)}
            className={cn(
              "focus-ring min-h-28 rounded-md border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md",
              selectedDriver === item.driver ? "border-gold ring-2 ring-gold/10" : "border-border-subtle",
              heatmapToneClass(item.impact)
            )}
          >
            <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-70">{item.impact}</p>
            <p className="mt-2 text-sm font-semibold">{item.label}</p>
            <p className="mt-2 line-clamp-2 text-xs opacity-75">{item.summary}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function SetupDecisionPanel({
  result,
  research,
  riskReward,
  liquidityConfirmed,
  levelsFromMarketData,
  marketDataConnected,
  inputs
}: {
  result: GoldTradeSetupResult | null;
  research: GoldTradeSetupResearchSummary;
  riskReward: ReturnType<typeof calculateGoldSetupRiskReward>;
  liquidityConfirmed: boolean;
  levelsFromMarketData: boolean;
  marketDataConnected: boolean;
  inputs: GoldTradeSetupInputs;
}) {
  const liquidityReady = Boolean(inputs.buySideLiquidityLevel && inputs.sellSideLiquidityLevel && (!levelsFromMarketData || liquidityConfirmed));
  const structureReady = inputs.marketStructure !== "Ranging" && (inputs.marketStructureShiftHappened === "Yes" || inputs.breakOfStructureHappened === "Yes");
  const verdict = result?.setupVerdict ?? (liquidityReady && riskReward.passes && structureReady ? "Ready to Analyze" : "Pending Confirmation");

  const decisions = [
    { label: "Setup Verdict", value: verdict, tone: verdict === "Buy Setup" || verdict === "Sell Setup" ? "success" : verdict === "Wait" ? "danger" : "warning" },
    { label: "Bias Alignment", value: research.overallGoldBias || "Mixed-Wait", tone: biasTone(research.overallGoldBias) },
    { label: "Liquidity Confirmation", value: liquidityReady ? "Confirmed" : levelsFromMarketData ? "Suggested only" : "Manual check needed", tone: liquidityReady ? "success" : "warning" },
    { label: "Risk-to-Reward", value: riskReward.ratio === null ? "Not ready" : `1:${riskReward.ratio.toFixed(2)}`, tone: riskReward.passes ? "success" : "warning" },
    { label: "Market Data", value: marketDataConnected ? "Connected" : "Not connected", tone: marketDataConnected ? "success" : "neutral" },
    { label: "Structure", value: structureReady ? "MSS/BOS ready" : inputs.marketStructure, tone: structureReady ? "success" : "warning" }
  ] as const;

  return (
    <div className="mt-5 rounded-lg border border-stone-800 bg-stone-950 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Decision Matrix</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Execution readiness summary</h3>
        </div>
        <span className={cn("rounded-md px-3 py-1 text-xs font-bold", autoBadgeClass(verdict))}>{verdict}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {decisions.map((item) => (
          <div key={item.label} className="rounded-md border border-stone-800 bg-[#0d0c09] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">{item.label}</p>
            <p className={cn("mt-2 text-sm font-semibold", decisionToneClass(item.tone))}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-stone-800 bg-stone-950 p-4 text-sm">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-stone-400">{text}</p>
    </div>
  );
}

function SourceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-800 bg-stone-950 px-4 py-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className="mt-1 font-medium text-stone-100">{value}</p>
    </div>
  );
}

function SourceLabel({ label }: { label: string }) {
  return <span className="rounded-md border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[11px] font-bold uppercase text-amber-200">{label}</span>;
}

function getSetupSectionSource(title: string) {
  if (title === "Current price and liquidity map") return "Liquidity Source: Manual chart input";
  if (title === "Technical structure") return "Liquidity Source: Manual chart input";
  if (title === "Risk inputs") return "Risk Source: Entry, SL, and TP fields";
  return "Manual input";
}

function MarketDataSourcePanel({
  data,
  loading,
  message,
  confirmed,
  levelsFromMarketData,
  onFetch,
  onConfirmChange
}: {
  data: XauusdMarketData | null;
  loading: boolean;
  message: string;
  confirmed: boolean;
  levelsFromMarketData: boolean;
  onFetch: () => void;
  onConfirmChange: (checked: boolean) => void;
}) {
  const display = data ?? EMPTY_MARKET_DATA;
  const connected = display.status === "success";

  return (
    <div className="mt-5 rounded-lg border border-stone-800 bg-stone-950 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Market Data Source</p>
          <h3 className="mt-1 text-base font-semibold text-white">Twelve Data XAUUSD levels</h3>
          <p className="mt-1 text-sm text-stone-400">Fetch suggested Gold price, liquidity, support, and resistance, then confirm them on the chart.</p>
        </div>
        <button type="button" onClick={onFetch} disabled={loading} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-gold/30 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold hover:bg-gold/20 disabled:opacity-60">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? "Fetching Gold data..." : "Fetch Gold Market Data"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MarketDataMetric label="Provider" value={display.provider || "Twelve Data"} />
        <MarketDataMetric label="Status" value={connected ? "Connected" : "Not connected"} tone={connected ? "success" : "neutral"} />
        <MarketDataMetric label="Last updated" value={display.lastUpdated || "Not fetched"} />
        <MarketDataMetric label="Current Gold price" value={display.currentPrice || "Not fetched"} />
        <MarketDataMetric label="Price location" value={display.currentPriceLocation || "Unknown"} tag={connected ? "Suggested from market data" : ""} />
        <MarketDataMetric label="Suggested buy-side liquidity" value={display.suggestedBuySideLiquidity || "Not fetched"} tag={connected ? "Suggested from market data" : ""} />
        <MarketDataMetric label="Suggested sell-side liquidity" value={display.suggestedSellSideLiquidity || "Not fetched"} tag={connected ? "Suggested from market data" : ""} />
        <MarketDataMetric label="Suggested support" value={display.suggestedSupport || "Not fetched"} tag={connected ? "Suggested from market data" : ""} />
        <MarketDataMetric label="Suggested resistance" value={display.suggestedResistance || "Not fetched"} tag={connected ? "Suggested from market data" : ""} />
      </div>

      {message ? <p className="mt-3 rounded-md border border-stone-800 bg-[#0d0c09] px-4 py-3 text-sm text-stone-200">{message}</p> : null}

      <div className="mt-4 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Market data liquidity levels are suggestions. Confirm levels on your broker or TradingView chart before trading.</span>
      </div>

      <label className="mt-4 flex items-start gap-3 rounded-md border border-stone-800 bg-[#0d0c09] px-4 py-3 text-sm font-medium text-stone-200">
        <input type="checkbox" checked={confirmed} onChange={(event) => onConfirmChange(event.target.checked)} className="mt-1 h-4 w-4 rounded border-border text-gold" />
        <span>
          I confirm these liquidity levels on my chart.
          {levelsFromMarketData && !confirmed ? <span className="block text-xs font-normal text-stone-500">Until confirmed, generated setups must stay Pending Confirmation or WAIT.</span> : null}
        </span>
      </label>

      <div className="mt-5 overflow-hidden rounded-lg border border-stone-800 bg-[#0d0c09]">
        <div className="flex flex-col gap-1 border-b border-stone-800 px-4 py-3">
          <p className="text-sm font-semibold text-white">TradingView confirmation chart</p>
          <p className="text-xs text-stone-500">Use this chart to confirm the suggested liquidity levels before entering a trade.</p>
        </div>
        <iframe
          title="TradingView OANDA XAUUSD chart"
          src="https://s.tradingview.com/widgetembed/?symbol=OANDA%3AXAUUSD&interval=60&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=f1f3f6&studies=%5B%5D&theme=light&style=1&timezone=Africa%2FJohannesburg&withdateranges=1&hideideas=1&locale=en"
          className="h-[420px] w-full border-0"
          loading="lazy"
          allowFullScreen
        />
      </div>
    </div>
  );
}

function MarketDataMetric({ label, value, tag, tone = "neutral" }: { label: string; value: string; tag?: string; tone?: "success" | "neutral" }) {
  return (
    <div className="rounded-md border border-stone-800 bg-[#0d0c09] px-4 py-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</p>
      <p className={cn("mt-1 font-semibold", tone === "success" ? "text-emerald-300" : "text-stone-100")}>{value}</p>
      {tag ? <p className="mt-2 text-[11px] font-bold uppercase text-amber-300/80">{tag}</p> : null}
    </div>
  );
}

function SetupInput({
  field,
  value,
  onChange
}: {
  field: { key: keyof GoldTradeSetupInputs; label: string; type?: "text" | "number" | "select" };
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "select") {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {(SETUP_SELECT_OPTIONS[field.key] ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return <input type={field.type === "number" ? "number" : "text"} step="any" value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />;
}

function GoldTradeSetupResultCard({ result }: { result: GoldTradeSetupResult }) {
  return (
    <div className="mt-5 rounded-lg border border-border-subtle bg-surface-panel p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-text-muted">Setup Verdict</p>
          <h3 className="text-2xl font-bold tracking-tight text-text-primary">{result.setupVerdict}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={cn("rounded-md px-3 py-1 text-xs font-bold", autoBadgeClass(result.setupVerdict))}>{result.setupVerdict}</span>
          <span className="rounded-md bg-surface-elevated px-3 py-1 text-xs font-bold text-text-secondary">{result.confidence} confidence</span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
        <ResultRow label="Current Gold Price" value={result.currentGoldPrice} />
        <ResultRow label="Overall Gold Bias" value={result.overallGoldBias} />
        <ResultRow label="Selected Strategy" value={result.selectedStrategy} />
        <ResultRow label="Strategy Reason" value={result.strategyReason} />
        <ResultRow label="Buy-side Liquidity" value={result.buySideLiquidity} />
        <ResultRow label="Sell-side Liquidity" value={result.sellSideLiquidity} />
        <ResultRow label="Liquidity Target" value={result.liquidityTarget} />
        <ResultRow label="Entry Area" value={result.entryArea} />
        <ResultRow label="Stop Loss Area" value={result.stopLossArea} />
        <ResultRow label="Take Profit Area" value={result.takeProfitArea} />
        <ResultRow label="Risk-to-Reward" value={result.riskRewardRatio} />
        <ResultRow label="Invalidation Level" value={result.invalidationLevel} />
        <ResultRow label="Confirmation Needed" value={result.confirmationNeeded} />
        <ResultRow label="Main Risk" value={result.mainRisk} />
        <ResultRow label="Final Guidance" value={result.finalGuidance} />
      </div>
    </div>
  );
}

function UseSetupLink({ setup, savedSetup }: { setup: GoldTradeSetupResult; savedSetup: GoldTradeSetup | null }) {
  if (setup.setupVerdict === "Wait" || setup.setupVerdict === "Pending Confirmation") {
    return (
      <button type="button" disabled className="focus-ring inline-flex items-center justify-center rounded-md border border-border-subtle bg-surface-panel px-5 py-3 text-sm font-semibold text-text-muted opacity-60">
        Setup is not confirmed. Trade entry is not allowed from this setup.
      </button>
    );
  }

  const params = new URLSearchParams({
    pair: "XAUUSD",
    tradeType: inferTradeType(setup),
    strategy: setup.selectedStrategy,
    entryReason: `${setup.setupVerdict}: ${setup.strategyReason} ${setup.finalGuidance}`,
    entryPrice: extractFirstNumber(setup.entryArea),
    stopLoss: extractFirstNumber(setup.stopLossArea),
    takeProfit: extractFirstNumber(setup.takeProfitArea)
  });

  if (savedSetup?.id) params.set("goldTradeSetupId", savedSetup.id);

  return (
    <Link href={`/new-trade?${params.toString()}`} className="focus-ring inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
      Use Setup in New Trade
    </Link>
  );
}

function AutoMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-panel px-4 py-3 text-sm">
      <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
      <p className="mt-1 font-semibold text-text-primary">{value}</p>
    </div>
  );
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    const value = await response.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function normalizeMarketDataResponse(value: Record<string, unknown>): XauusdMarketData {
  return {
    status: value.status === "success" ? "success" : "error",
    symbol: marketDataString(value.symbol),
    currentPrice: marketDataString(value.currentPrice),
    lastUpdated: marketDataString(value.lastUpdated),
    dailyHigh: marketDataString(value.dailyHigh),
    dailyLow: marketDataString(value.dailyLow),
    previousDayHigh: marketDataString(value.previousDayHigh),
    previousDayLow: marketDataString(value.previousDayLow),
    recentSwingHigh: marketDataString(value.recentSwingHigh),
    recentSwingLow: marketDataString(value.recentSwingLow),
    suggestedBuySideLiquidity: marketDataString(value.suggestedBuySideLiquidity),
    suggestedSellSideLiquidity: marketDataString(value.suggestedSellSideLiquidity),
    suggestedSupport: marketDataString(value.suggestedSupport),
    suggestedResistance: marketDataString(value.suggestedResistance),
    currentPriceLocation: normalizePriceLocation(marketDataString(value.currentPriceLocation)) || "Unknown",
    source: marketDataString(value.source) || "None",
    provider: marketDataString(value.provider) || marketDataString(value.source) || "None",
    message: marketDataString(value.message),
    verified: Boolean(value.verified)
  };
}

function getMarketDataErrorMessage(result: Record<string, unknown>) {
  const message = marketDataString(result.message);
  if (/not configured|api key/i.test(message)) return "Twelve Data API key is not configured. Add TWELVE_DATA_API_KEY in Vercel Environment Variables and redeploy.";
  if (/rate limit|credits|quota/i.test(message)) return "Free market data rate limit reached. Try again later.";
  if (/could not fetch|symbol|xauusd/i.test(message)) return "Could not fetch XAUUSD data from Twelve Data.";
  return message || "Could not fetch XAUUSD data from Twelve Data.";
}

function marketDataString(value: unknown) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value).trim() : "";
}

function normalizePriceLocation(value: string) {
  const allowed = ["Near support", "Near resistance", "In range", "At liquidity sweep", "After breakout", "Unknown"];
  return allowed.includes(value) ? value : "";
}

function isLiquidityLevelField(key: keyof GoldTradeSetupInputs) {
  return (
    key === "currentGoldPrice" ||
    key === "buySideLiquidityLevel" ||
    key === "buySideLiquidityReason" ||
    key === "sellSideLiquidityLevel" ||
    key === "sellSideLiquidityReason" ||
    key === "keySupport" ||
    key === "keyResistance"
  );
}

function getAutoFillErrorMessage(result: Record<string, unknown>) {
  const code = typeof result.code === "string" ? result.code : "";
  const error = typeof result.error === "string" ? result.error : "";

  if (code === "missing_api_key" || /api key/i.test(error)) return "OpenAI API key is missing in Vercel.";
  if (code === "billing_or_quota" || /billing|quota|credit/i.test(error)) return "OpenAI billing or credits issue. Check OpenAI usage/billing.";
  if (code === "json_parse_error" || /format|json|parse/i.test(error)) return "AI response format error. Please retry or check server logs.";
  if (code === "web_search_failed" || /source|search|verify/i.test(error)) return "Could not verify fresh sources. Try again later.";
  return error || "Could not verify fresh sources. Try again later.";
}

function AutoFullSummaryPanel({ report }: { report: GoldAutoFillResponse }) {
  const summary = report.fullSummary;

  return (
    <div className="mt-5 rounded-lg border border-profit/30 bg-profit/5 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-text-primary">Full Gold Bias Summary</h3>
        <span className={cn("rounded-md px-3 py-1 text-xs font-bold", autoBadgeClass(summary.overallGoldBias))}>{summary.overallGoldBias}</span>
        <span className={cn("rounded-md px-3 py-1 text-xs font-bold", autoBadgeClass(summary.preTradeVerdict))}>{summary.preTradeVerdict}</span>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <ResultRow label="Bullish drivers" value={summary.bullishDrivers.length ? summary.bullishDrivers.join("; ") : "None"} />
        <ResultRow label="Bearish drivers" value={summary.bearishDrivers.length ? summary.bearishDrivers.join("; ") : "None"} />
        <ResultRow label="Mixed drivers" value={summary.mixedDrivers.length ? summary.mixedDrivers.join("; ") : "None"} />
        <ResultRow label="Strongest bullish driver" value={summary.strongestBullishDriver} />
        <ResultRow label="Strongest bearish driver" value={summary.strongestBearishDriver} />
        <ResultRow label="Main risk today" value={summary.mainRiskToday} />
        <ResultRow label="Best session to trade" value={summary.bestSessionToTrade} />
        <ResultRow label="Final guidance" value={summary.finalGuidance} />
        <ResultRow label="Personal rule" value={summary.personalRule} />
      </div>
    </div>
  );
}

function AutoSectionCard({
  section,
  editing,
  onEdit,
  onChange
}: {
  section: GoldAutoResearchSection;
  editing: boolean;
  onEdit: () => void;
  onChange: (key: keyof GoldAutoResearchSection, value: string) => void;
}) {
  const fields = AUTO_SECTION_FIELDS[section.driver];
  const badgeValue = section.driver === "Gold Technical Structure Check" ? section.goldTechnicalVerdict || section.goldImpact : section.goldImpact;

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-text-primary">{section.driver}</h3>
          <span className={cn("mt-2 inline-flex rounded-md px-3 py-1 text-xs font-bold", autoBadgeClass(badgeValue))}>{badgeValue || "Mixed-Wait"}</span>
        </div>
        <button type="button" onClick={onEdit} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-border-subtle bg-surface-panel px-3 py-2 text-sm font-semibold text-text-primary hover:bg-surface-elevated">
          <Pencil className="h-4 w-4" />
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {fields.map((field) => (
          <div key={String(field.key)} className="rounded-md bg-surface-panel px-4 py-3">
            <p className="text-xs font-semibold uppercase text-text-muted">{field.label}</p>
            <div className="mt-1">
              {editing ? (
                <AutoFieldInput config={field} value={String(section[field.key] ?? "")} onChange={(value) => onChange(field.key, value)} />
              ) : (
                <AutoFieldValue label={field.label} value={String(section[field.key] ?? "")} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AutoFieldInput({ config, value, onChange }: { config: AutoSectionFieldConfig; value: string; onChange: (value: string) => void }) {
  if (config.type === "select") {
    const options = config.options ?? [];
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        <option value="">Select value</option>
        {value && !options.includes(value) ? <option value={value}>{value}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (config.type === "textarea") {
    return <textarea value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} min-h-24`} />;
  }

  return <input type={config.type === "url" ? "url" : "text"} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />;
}

function AutoFieldValue({ label, value }: { label: string; value: string }) {
  if (label === "Source Link" && isUrl(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all font-medium text-gold underline underline-offset-4">
        {value}
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>
    );
  }

  return <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{value || "Data not verified."}</p>;
}

function DriverInput({ config, value, onChange }: { config: DriverFieldConfig; value: string; onChange: (value: string) => void }) {
  if (config.type === "select") {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        <option value="">{config.placeholder}</option>
        {config.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (config.type === "textarea") {
    return <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={config.placeholder} className={`${inputClass} min-h-28`} />;
  }

  return <input type={config.type === "url" ? "url" : "text"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={config.placeholder} className={inputClass} />;
}

function AnalysisPanel({ analysis }: { analysis: GoldDriverAnalysis }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-text-primary">{analysis.driverName}</h2>
        <span className={cn("rounded-md px-3 py-1 text-xs font-bold", biasClass(analysis.goldBias))}>{analysis.goldBias}</span>
        <span className="rounded-md bg-surface-elevated px-3 py-1 text-xs font-bold text-text-secondary">{analysis.confidenceScore}%</span>
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <ResultRow label="Impact" value={analysis.impactLevel} />
        <ResultRow label="Time sensitivity" value={analysis.timeSensitivity} />
        <ResultRow label="Summary of the news headline" value={analysis.headlineSummary} />
        <ResultRow label="Summary of the news driver" value={analysis.newsDriverSummary} />
        <ResultRow label="Chart observation interpretation" value={analysis.chartObservationInterpretation} />
        <ResultRow label="Bullish Gold clues" value={formatClues(analysis.bullishGoldClues)} />
        <ResultRow label="Bearish Gold clues" value={formatClues(analysis.bearishGoldClues)} />
        <ResultRow label="Key conflict or risk" value={analysis.keyConflictOrRisk} />
        <ResultRow label="Checklist effect" value={analysis.checklistEffect} />
        <ResultRow label="Explanation" value={analysis.explanation} />
        <ResultRow label="What this means for Gold" value={analysis.goldMeaning} />
        <ResultRow label="Trading caution" value={analysis.tradingCaution} />
        <ResultRow label="Final guidance" value={analysis.finalGuidance} />
      </div>
    </div>
  );
}

function SummaryPanel({ summary }: { summary: ReturnType<typeof buildGoldBiasSummary> }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-text-primary">Full Gold Bias Summary</h2>
        <span className={cn("rounded-md px-3 py-1 text-xs font-bold", overallBiasClass(summary.overallGoldBias))}>{summary.overallGoldBias}</span>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <ResultRow label="Bullish drivers" value={`${summary.bullishDriversCount}: ${summary.bullishDrivers}`} />
        <ResultRow label="Bearish drivers" value={`${summary.bearishDriversCount}: ${summary.bearishDrivers}`} />
        <ResultRow label="Neutral drivers" value={`${summary.neutralDriversCount}: ${summary.neutralDrivers}`} />
        <ResultRow label="Mixed drivers" value={`${summary.mixedDriversCount}: ${summary.mixedDrivers}`} />
        <ResultRow label="Strongest bullish driver" value={summary.strongestBullishDriver} />
        <ResultRow label="Strongest bearish driver" value={summary.strongestBearishDriver} />
        <ResultRow label="Main conflict" value={summary.mainConflict} />
        <ResultRow label="Main risk" value={summary.mainRisk} />
        <ResultRow label="Best session to wait for" value={summary.bestSessionToWaitFor} />
        <ResultRow label="Pre-trade verdict" value={summary.preTradeVerdict} />
        <ResultRow label="Personal Gold rule" value={summary.personalRule} />
        {summary.driverSummaries.map((driverSummary) => (
          <ResultRow
            key={driverSummary.driverName}
            label={`Driver: ${driverSummary.driverName}`}
            value={`News Headline: ${driverSummary.newsHeadline} | News Summary: ${driverSummary.newsSummary} | Chart Observation: ${driverSummary.chartObservation} | Gold Bias: ${driverSummary.goldBias} | Impact: ${driverSummary.impactLevel} | Confidence: ${driverSummary.confidenceScore}% | Final Guidance: ${driverSummary.finalGuidance}`}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-card p-8 text-center shadow-soft">
      <FileText className="mx-auto h-8 w-8 text-text-muted" />
      <p className="mt-3 text-sm text-text-secondary">Choose a driver, add research notes, then analyze.</p>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-panel px-4 py-3">
      <p className="text-xs font-semibold uppercase text-text-muted">{label}</p>
      <p className="mt-1 text-text-primary">{value}</p>
    </div>
  );
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="focus-ring inline-flex items-center gap-2 rounded-md border border-border-subtle bg-surface-panel px-3 py-2 text-sm font-semibold text-text-primary hover:bg-surface-elevated">
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={cn("block text-sm font-medium text-text-primary", wide ? "md:col-span-2" : "")}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function buildAnalysisInput(driverName: GoldDriverName, reportDate: string, driverFields: GoldDriverFields): GoldAnalysisInput {
  return {
    driverName,
    reportDate,
    headline: driverFields.newsHeadline ?? "",
    summary: driverFields.newsSummary ?? "",
    currentValue: getCurrentValue(driverName, driverFields),
    chartObservation: driverFields.chartObservation ?? "",
    sourceLink: driverFields.sourceLink ?? "",
    notes: driverFields.notes ?? "",
    driverFields
  };
}

function getCurrentValue(driverName: GoldDriverName, fields: GoldDriverFields) {
  if (driverName === "DXY / US Dollar") return fields.dxyCurrentLevel ?? "";
  if (driverName === "US Yields") return [fields.tenYearYieldValue, fields.twoYearYieldValue].filter(Boolean).join(" / ");
  if (driverName === "Real Yields") return fields.realYieldValue ?? "";
  if (driverName === "Fed Tone / FOMC") return [fields.fedTone, fields.rateExpectation, fields.fedSpeakerOrEvent].filter(Boolean).join(" / ");
  if (driverName === "CPI / PCE") return [fields.inflationType, fields.actualValue, fields.forecastValue, fields.previousValue].filter(Boolean).join(" / ");
  if (driverName === "NFP / Jobs") return [fields.nfpActual, fields.nfpForecast, fields.unemploymentRate, fields.wageGrowth].filter(Boolean).join(" / ");
  if (driverName === "Geopolitics") return [fields.geopoliticalRiskLevel, fields.eventType, fields.dxyReaction].filter(Boolean).join(" / ");
  if (driverName === "ETF / Central Bank Demand") return [fields.etfFlowDirection, fields.centralBankDemand, fields.reportPeriod].filter(Boolean).join(" / ");
  return fields.newsCategory ?? "";
}

function formatClues(clues: string[]) {
  return clues.length ? clues.join("; ") : "None detected yet";
}

function buildSetupResearchSummary(report: DailyGoldResearchReport | GoldAutoFillResponse | null, manualSummary: ReturnType<typeof buildGoldBiasSummary>): GoldTradeSetupResearchSummary {
  if (report) {
    return {
      overallGoldBias: report.fullSummary.overallGoldBias,
      bullishDrivers: report.fullSummary.bullishDrivers,
      bearishDrivers: report.fullSummary.bearishDrivers,
      mixedDrivers: report.fullSummary.mixedDrivers,
      strongestBullishDriver: report.fullSummary.strongestBullishDriver,
      strongestBearishDriver: report.fullSummary.strongestBearishDriver,
      mainRiskToday: report.fullSummary.mainRiskToday,
      preTradeVerdict: report.fullSummary.preTradeVerdict,
      finalGuidance: report.fullSummary.finalGuidance
    };
  }

  return {
    overallGoldBias: manualSummary.overallGoldBias,
    bullishDrivers: splitDriverList(manualSummary.bullishDrivers),
    bearishDrivers: splitDriverList(manualSummary.bearishDrivers),
    mixedDrivers: splitDriverList(manualSummary.mixedDrivers),
    strongestBullishDriver: manualSummary.strongestBullishDriver,
    strongestBearishDriver: manualSummary.strongestBearishDriver,
    mainRiskToday: manualSummary.mainRisk,
    preTradeVerdict: manualSummary.preTradeVerdict,
    finalGuidance: manualSummary.mainConflict
  };
}

function splitDriverList(value: string) {
  return value && value !== "None" ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function getAutoImpactCounts(report: GoldAutoFillResponse | null) {
  const counts = { bullish: 0, bearish: 0, mixed: 0 };
  report?.sections.forEach((section) => {
    if (section.goldImpact === "Bullish Gold") counts.bullish += 1;
    else if (section.goldImpact === "Bearish Gold") counts.bearish += 1;
    else counts.mixed += 1;
  });
  return counts;
}

function getDriverFromAutoDriver(driver: GoldAutoDriverName): GoldDriverName {
  if (driver === "DXY / US Dollar Check") return "DXY / US Dollar";
  if (driver === "US Yields Check") return "US Yields";
  if (driver === "Real Yields Check") return "Real Yields";
  if (driver === "Fed Tone / FOMC Check") return "Fed Tone / FOMC";
  if (driver === "CPI / PCE Inflation Check") return "CPI / PCE";
  if (driver === "NFP / Jobs Check") return "NFP / Jobs";
  if (driver === "Geopolitics / Risk Sentiment Check") return "Geopolitics";
  if (driver === "ETF / Central Bank Demand Check") return "ETF / Central Bank Demand";
  return "Custom News";
}

function inferTradeType(setup: GoldTradeSetupResult) {
  if (setup.setupVerdict === "Sell Setup" || /bearish|sell/i.test(`${setup.overallGoldBias} ${setup.finalGuidance}`)) return "Sell";
  return "Buy";
}

function extractFirstNumber(value: string) {
  return value.match(/\d+(?:\.\d+)?/)?.[0] ?? "";
}

function isUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function autoBadgeClass(value: string) {
  if (value === "Bullish" || value === "Bullish Gold" || value === "Buy Setup" || value === "Trade Allowed") return "bg-profit/15 text-profit";
  if (value === "Bearish" || value === "Bearish Gold" || value === "Sell Setup") return "bg-loss/15 text-loss";
  if (value === "Mixed-Wait" || value === "Wait" || value === "Avoid Before News") return "bg-gold/15 text-gold";
  return "bg-surface-elevated text-text-secondary";
}

function biasTone(value: string): "success" | "warning" | "danger" | "neutral" {
  if (/bullish/i.test(value)) return "success";
  if (/bearish/i.test(value)) return "danger";
  if (/mixed|wait|neutral/i.test(value)) return "warning";
  return "neutral";
}

function terminalToneClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "bg-emerald-400/10 text-emerald-300";
  if (tone === "danger") return "bg-red-400/10 text-red-300";
  if (tone === "warning") return "bg-amber-300/10 text-amber-300";
  return "bg-stone-800 text-stone-300";
}

function decisionToneClass(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "success") return "text-emerald-300";
  if (tone === "danger") return "text-red-300";
  if (tone === "warning") return "text-amber-300";
  return "text-stone-200";
}

function heatmapToneClass(impact: string) {
  if (impact === "Bullish Gold") return "bg-profit/10 text-profit";
  if (impact === "Bearish Gold") return "bg-loss/10 text-loss";
  if (impact === "Mixed-Wait") return "bg-gold/10 text-gold";
  return "bg-surface-panel text-text-primary";
}

function biasClass(value: string) {
  if (value === "Bullish Gold") return "bg-profit/15 text-profit";
  if (value === "Bearish Gold") return "bg-loss/15 text-loss";
  if (value === "Mixed / Wait") return "bg-gold/15 text-gold";
  return "bg-surface-elevated text-text-secondary";
}

function overallBiasClass(value: string) {
  if (value === "Bullish") return "bg-profit/15 text-profit";
  if (value === "Bearish") return "bg-loss/15 text-loss";
  if (value === "Wait") return "bg-gold/15 text-gold";
  return "bg-surface-elevated text-text-secondary";
}

function checklistBadgeClass(value: string) {
  if (value === "Aligned") return "bg-profit/15 text-profit";
  if (value === "Mixed" || value === "Wait") return "bg-gold/15 text-gold";
  return "bg-loss/15 text-loss";
}

const inputClass =
  "w-full rounded-md border border-border-subtle bg-surface-panel px-3 py-2 text-sm text-text-primary shadow-sm outline-none transition placeholder:text-text-muted focus:border-gold focus:ring-2 focus:ring-gold/10";
