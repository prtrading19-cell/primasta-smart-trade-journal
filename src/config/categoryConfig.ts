import type { CategoryDefinition } from "@/types/goldResearchConfig";

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    id: "macro",
    title: "Macro Environment",
    description: "DXY, yields, real yields, Fed policy, and broader macroeconomic environment.",
    driverIds: ["dxy-us-dollar", "us-yields", "real-yields", "fed-tone-fomc"],
    defaultWeight: 0.05,
    color: "#D4AF37"
  },
  {
    id: "inflation",
    title: "Inflation",
    description: "CPI, PCE, and inflation expectation analysis.",
    driverIds: ["cpi-pce"],
    defaultWeight: 0.15,
    color: "#EA3943"
  },
  {
    id: "employment",
    title: "Employment",
    description: "NFP, unemployment, wages, and labor market analysis.",
    driverIds: ["nfp-jobs"],
    defaultWeight: 0.10,
    color: "#16C784"
  },
  {
    id: "growth",
    title: "Economic Growth",
    description: "GDP, PMI, ISM, and broader economic activity analysis.",
    driverIds: ["economic-growth"],
    defaultWeight: 0.10,
    color: "#3B82F6"
  },
  {
    id: "institutional",
    title: "Institutional Activity",
    description: "ETF flows, central bank buying, and institutional flow analysis.",
    driverIds: ["etf-flows", "central-bank-demand"],
    defaultWeight: 0.20,
    color: "#8B5CF6"
  },
  {
    id: "sentiment",
    title: "Market Sentiment",
    description: "Risk appetite, fear/greed, VIX, and crowd positioning analysis.",
    driverIds: ["market-sentiment", "crowd-positioning"],
    defaultWeight: 0.10,
    color: "#F59E0B"
  },
  {
    id: "geopolitics",
    title: "Geopolitical Risk",
    description: "Geopolitical events, conflict, sanctions, and safe-haven demand analysis.",
    driverIds: ["geopolitics"],
    defaultWeight: 0.05,
    color: "#EF4444"
  },
  {
    id: "technical",
    title: "Technical Analysis",
    description: "Multi-timeframe price structure, trend, and setup analysis.",
    driverIds: ["gold-technical-structure"],
    defaultWeight: 0.20,
    color: "#06B6D4"
  },
  {
    id: "liquidity",
    title: "Liquidity Conditions",
    description: "Market liquidity, central bank balance sheet, and funding conditions.",
    driverIds: ["liquidity-conditions"],
    defaultWeight: 0.05,
    color: "#10B981"
  },
  {
    id: "seasonality",
    title: "Seasonality",
    description: "Historical seasonal patterns and position risk assessment.",
    driverIds: ["seasonality", "position-risk"],
    defaultWeight: 0.05,
    color: "#EC4899"
  },
  {
    id: "custom",
    title: "Custom Analysis",
    description: "Manual news and custom analysis entries.",
    driverIds: ["custom-news"],
    defaultWeight: 0.0,
    color: "#6B7280"
  }
];

export function getCategoryById(id: string): CategoryDefinition | undefined {
  return CATEGORY_DEFINITIONS.find((category) => category.id === id);
}

export function getCategoryByDriverId(driverId: string): CategoryDefinition | undefined {
  return CATEGORY_DEFINITIONS.find((category) => category.driverIds.includes(driverId));
}

export function getActiveCategories(): CategoryDefinition[] {
  return CATEGORY_DEFINITIONS.filter((category) => category.defaultWeight > 0);
}
