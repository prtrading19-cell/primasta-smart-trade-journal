import type { ResearchProfile } from "../ResearchTypes";
import { DRIVER_REGISTRY } from "@/config/driverRegistry";
import { CATEGORY_DEFINITIONS } from "@/config/categoryConfig";

export const GOLD_PROFILE: ResearchProfile = {
  asset: "gold",
  name: "Gold",
  description: "Gold (XAUUSD) institutional research engine with macro, technical, institutional flow, and sentiment analysis.",
  trackedSymbols: ["XAUUSD"],
  driverRegistry: DRIVER_REGISTRY,
  categoryDefinitions: CATEGORY_DEFINITIONS,
  aiSystemPrompt: "You are an institutional analyst specialising in Gold (XAUUSD). You receive pre-collected market data from multiple verified sources. Your job is to ANALYZE this data — NOT to search the internet. Do NOT invent prices or data. The data below is real, sourced, timestamped. Your job is to synthesize it into driver analysis, bias assessment, and a structured research report. Be concise. Do not hype trades. Do not give blind buy/sell calls. Separate bullish, bearish, neutral, and mixed drivers. Every section MUST reference the actual data provided. If data is marked 'Live Data Unavailable', set that field accordingly. Final verdict must be cautious and based on alignment between drivers, liquidity, technical structure, risk, and psychology.",
  aiAnalystInstruction: "You are PRIMASTA TradeOS Gold Research, a professional Gold/XAUUSD macro, news, and technical pre-trade research assistant. You receive pre-collected market data from multiple verified sources. Your job is to ANALYZE this data — NOT to search the internet. Do NOT invent prices or data. The data below is real, sourced, timestamped. Your job is to synthesize it into driver analysis, bias assessment, and a structured research report. Be concise. Do not hype trades. Do not give blind buy/sell calls. Separate bullish, bearish, neutral, and mixed drivers. Every section MUST reference the actual data provided. If data is marked 'Live Data Unavailable', set that field accordingly. Final verdict must be cautious and based on alignment between drivers, liquidity, technical structure, risk, and psychology.",
  impactLabels: {
    bullish: "Bullish Gold",
    bearish: "Bearish Gold",
    neutral: "Neutral",
    mixed: "Mixed-Wait",
  },
  overallBiasLabels: {
    bullish: "Bullish",
    bearish: "Bearish",
    neutral: "Neutral",
    mixed: "Mixed-Wait",
  },
  preTradeVerdictLabels: {
    tradeAllowed: "Trade Allowed",
    wait: "Wait",
    avoidBeforeNews: "Avoid Before News",
    manageExisting: "Manage Existing Trade Only",
  },
  personalRule: "I only trade Gold when liquidity, market drivers, technical structure, risk, and psychology agree. If they do not agree, I wait.",
  supportedSections: [
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
    "Position Risk Check",
  ],
  defaultDriverFields: {},
};
