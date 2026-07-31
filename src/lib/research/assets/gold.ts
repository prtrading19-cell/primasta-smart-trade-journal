import type { AssetConfiguration } from "../asset/types";

export const GOLD_ASSET_CONFIG: AssetConfiguration = {
  id: "gold",
  name: "Gold",
  displayName: "Gold",
  assetClass: "commodity",
  baseCurrency: "XAU",
  quoteCurrency: "USD",
  description: "XAU/USD — Institutional gold research",
  enabled: true,

  providers: [
    { id: "twelvedata", name: "Twelve Data", enabled: true, priority: 1, cacheTtlMs: 60000 },
    { id: "macro", name: "Macro Indicators", enabled: true, priority: 2, cacheTtlMs: 300000 },
    { id: "volatility", name: "Volatility Data", enabled: true, priority: 3, cacheTtlMs: 120000 },
    { id: "etf", name: "ETF Holdings", enabled: true, priority: 4, cacheTtlMs: 3600000 },
    { id: "cot", name: "COT Reports", enabled: true, priority: 5, cacheTtlMs: 86400000 },
    { id: "open-interest", name: "Open Interest", enabled: true, priority: 6, cacheTtlMs: 3600000 },
    { id: "breadth", name: "Market Breadth", enabled: true, priority: 7, cacheTtlMs: 300000 },
    { id: "sectors", name: "Sector Rotation", enabled: true, priority: 8, cacheTtlMs: 300000 },
  ],

  categories: [
    {
      id: "macro", title: "Macro Environment",
      description: "DXY, yields, Fed policy, and macro environment.",
      driverIds: ["dxy-us-dollar", "us-yields", "real-yields", "fed-tone-fomc"],
      weight: 0.05, color: "#D4AF37",
    },
    {
      id: "inflation", title: "Inflation",
      description: "CPI, PCE, and inflation expectations.",
      driverIds: ["cpi-pce"],
      weight: 0.15, color: "#EA3943",
    },
    {
      id: "employment", title: "Employment",
      description: "NFP, unemployment, wages, labor market.",
      driverIds: ["nfp-jobs"],
      weight: 0.10, color: "#16C784",
    },
    {
      id: "growth", title: "Economic Growth",
      description: "GDP, PMI, ISM, economic activity.",
      driverIds: ["economic-growth"],
      weight: 0.10, color: "#3B82F6",
    },
    {
      id: "institutional", title: "Institutional Activity",
      description: "ETF flows, central bank demand.",
      driverIds: ["etf-flows", "central-bank-demand"],
      weight: 0.20, color: "#8B5CF6",
    },
    {
      id: "sentiment", title: "Market Sentiment",
      description: "Risk appetite, VIX, crowd positioning.",
      driverIds: ["market-sentiment", "crowd-positioning"],
      weight: 0.10, color: "#F59E0B",
    },
    {
      id: "geopolitics", title: "Geopolitical Risk",
      description: "Geopolitical events, safe-haven demand.",
      driverIds: ["geopolitics"],
      weight: 0.05, color: "#EF4444",
    },
    {
      id: "technical", title: "Technical Analysis",
      description: "Price structure, trend, and setup.",
      driverIds: ["gold-technical-structure"],
      weight: 0.20, color: "#06B6D4",
    },
    {
      id: "liquidity", title: "Liquidity Conditions",
      description: "Market liquidity, funding conditions.",
      driverIds: ["liquidity-conditions"],
      weight: 0.05, color: "#10B981",
    },
    {
      id: "seasonality", title: "Seasonality",
      description: "Seasonal patterns and position risk.",
      driverIds: ["seasonality", "position-risk"],
      weight: 0.05, color: "#EC4899",
    },
    {
      id: "custom", title: "Custom Analysis",
      description: "Manual news and custom entries.",
      driverIds: ["custom-news"],
      weight: 0.0, color: "#6B7280",
    },
  ],

  prompts: {
    systemPrompt: `You are an institutional analyst specialising in Gold (XAUUSD). Your role is to enhance and validate research data for a professional trader. Always maintain an objective, data-driven tone. Focus on actionable analysis.`,
    analystInstruction: `You are PRIMASTA TradeOS Gold Research. Analyze the provided data and research inputs for XAUUSD. Provide structured, evidence-based analysis.`,
    summaryPrompt: `Summarize the gold research analysis with key drivers, risks, and actionable insights.`,
  },

  dashboard: {
    defaultTimeframe: "4h",
    positionSizing: { baseRiskPercent: 1.0, maxRiskPercent: 2.5, volatilityAdjustment: true },
    impactLabels: { bullish: "Bullish Gold", bearish: "Bearish Gold", neutral: "Neutral", mixed: "Mixed-Wait" },
    biasLabels: { bullish: "Bullish", bearish: "Bearish", neutral: "Neutral", mixed: "Mixed-Wait" },
    preTradeLabels: {
      tradeAllowed: "Trade Allowed", wait: "Wait",
      avoidBeforeNews: "Avoid Before News",
      manageExisting: "Manage Existing Trade Only",
    },
    personalRule: `I only trade Gold when liquidity, market drivers, technical structure, risk, and psychology agree on direction.`,
    supportedSections: [
      "DXY / US Dollar Check", "US Yields Check", "Real Yields Check",
      "Fed Tone / FOMC Check", "CPI / PCE Inflation Check", "NFP / Jobs Check",
      "Geopolitics / Risk Sentiment Check", "ETF / Central Bank Demand Check",
      "Gold Technical Structure Check", "Economic Growth Check",
      "Gold ETF Flows Check", "Central Bank Demand Check",
      "Market Sentiment Check", "Crowd Positioning Check",
      "Liquidity Conditions Check", "Seasonality Check", "Position Risk Check",
    ],
  },

  settings: {
    priceSource: "twelvedata",
    volatilityIndex: "gvz",
    defaultTimeframe: "4h",
    trackedSymbols: ["XAUUSD"],
  },
};
