import type { AssetConfiguration } from "../asset/types";

export const US100_ASSET_CONFIG: AssetConfiguration = {
  id: "us100",
  name: "US100",
  displayName: "US100 (Nasdaq)",
  assetClass: "index",
  baseCurrency: "USD",
  description: "Nasdaq-100 — Institutional research",
  enabled: true,

  providers: [
    { id: "index", name: "US100 Index", enabled: true, priority: 1, cacheTtlMs: 60000 },
    { id: "stocks", name: "Stock Quotes", enabled: true, priority: 2, cacheTtlMs: 60000 },
    { id: "earnings", name: "Earnings Data", enabled: true, priority: 3, cacheTtlMs: 3600000 },
    { id: "sectors", name: "Sector Data", enabled: true, priority: 4, cacheTtlMs: 300000 },
    { id: "movers", name: "Market Movers", enabled: true, priority: 5, cacheTtlMs: 60000 },
    { id: "volatility", name: "Volatility Data", enabled: true, priority: 6, cacheTtlMs: 120000 },
    { id: "profiles", name: "Company Profiles", enabled: true, priority: 7, cacheTtlMs: 86400000 },
    { id: "breadth", name: "Market Breadth", enabled: true, priority: 8, cacheTtlMs: 300000 },
    { id: "macro", name: "Macro Indicators", enabled: true, priority: 9, cacheTtlMs: 300000 },
    { id: "etf", name: "ETF Holdings", enabled: true, priority: 10, cacheTtlMs: 3600000 },
    { id: "cot", name: "COT Reports", enabled: true, priority: 11, cacheTtlMs: 86400000 },
  ],

  categories: [
    {
      id: "market-overview", title: "Market Overview",
      description: "Index price action, trend, and key levels.",
      driverIds: ["market-overview-price", "market-overview-volume"],
      weight: 0.10, color: "#3B82F6",
    },
    {
      id: "mega-cap", title: "Mega Cap Leadership",
      description: "Top mega-cap stock performance and leadership.",
      driverIds: ["mega-cap-aapl", "mega-cap-msft", "mega-cap-nvda", "mega-cap-amzn", "mega-cap-meta", "mega-cap-googl"],
      weight: 0.15, color: "#8B5CF6",
    },
    {
      id: "macro", title: "Macro Environment",
      description: "DXY, yields, Fed, economic data.",
      driverIds: ["macro-dxy", "macro-yields", "macro-fed", "macro-cpi", "macro-nfp", "macro-gdp", "macro-pmi"],
      weight: 0.10, color: "#D4AF37",
    },
    {
      id: "earnings", title: "Corporate Earnings",
      description: "Earnings results, beats, misses.",
      driverIds: ["earnings-surprises", "earnings-guidance", "earnings-growth"],
      weight: 0.10, color: "#16C784",
    },
    {
      id: "breadth", title: "Market Breadth",
      description: "Advance/decline, new highs/lows.",
      driverIds: ["breadth-ad", "breadth-high-low", "breadth-volume"],
      weight: 0.10, color: "#F59E0B",
    },
    {
      id: "volatility", title: "Volatility",
      description: "VIX, VXN, risk regime.",
      driverIds: ["volatility-vix", "volatility-vxn", "volatility-risk"],
      weight: 0.10, color: "#EF4444",
    },
    {
      id: "etf-flow", title: "ETF Flow",
      description: "QQQ/TQQQ/SQQQ flows.",
      driverIds: ["etf-qqq", "etf-tqqq", "etf-sqqq", "etf-net-flow"],
      weight: 0.10, color: "#06B6D4",
    },
    {
      id: "sector-rotation", title: "Sector Rotation",
      description: "Sector performance and rotation.",
      driverIds: ["sector-tech", "sector-semicon", "sector-health", "sector-finance"],
      weight: 0.10, color: "#10B981",
    },
    {
      id: "technical", title: "Technical Analysis",
      description: "Trend, momentum, structure.",
      driverIds: ["technical-trend", "technical-momentum"],
      weight: 0.10, color: "#EC4899",
    },
    {
      id: "sentiment", title: "Market Sentiment",
      description: "COT, institutional positioning.",
      driverIds: ["sentiment-cot", "sentiment-oi"],
      weight: 0.05, color: "#8B5CF6",
    },
  ],

  prompts: {
    systemPrompt: `You are an institutional analyst specialising in the Nasdaq-100 (US100). Your role is to enhance and validate research data for a professional trader. Always maintain an objective, data-driven tone. Focus on actionable analysis of mega-cap tech stocks, sector rotation, and macro impacts.`,
    analystInstruction: `You are PRIMASTA TradeOS US100 Research. Analyze the provided data and research inputs for the Nasdaq-100. Provide structured, evidence-based analysis.`,
    summaryPrompt: `Summarize the US100 research analysis with key drivers, risks, and actionable insights.`,
  },

  dashboard: {
    defaultTimeframe: "1d",
    positionSizing: { baseRiskPercent: 1.0, maxRiskPercent: 2.0, volatilityAdjustment: true },
    impactLabels: { bullish: "Bullish US100", bearish: "Bearish US100", neutral: "Neutral", mixed: "Mixed-Wait" },
    biasLabels: { bullish: "Bullish", bearish: "Bearish", neutral: "Neutral", mixed: "Mixed-Wait" },
    preTradeLabels: {
      tradeAllowed: "Trade Allowed", wait: "Wait",
      avoidBeforeNews: "Avoid Before Earnings",
      manageExisting: "Manage Existing Trade Only",
    },
    personalRule: `I only trade US100 when mega cap leadership, macro environment, technical structure, breadth, volatility, and ETF flows agree on direction.`,
    supportedSections: [
      "Market Overview", "Mega Cap Leadership", "Macro Environment",
      "Corporate Earnings", "Market Breadth", "Volatility", "ETF Flow",
      "Sector Rotation", "Technical Analysis", "Institutional Summary",
    ],
  },

  settings: {
    priceSource: "twelvedata",
    volatilityIndex: "vix",
    defaultTimeframe: "1d",
    trackedSymbols: ["AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "AVGO", "TSLA"],
  },
};
