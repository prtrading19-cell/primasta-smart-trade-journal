import type { DriverRegistryEntry } from "@/types/goldResearchConfig";
import {
  DRIVER_NAME_TO_ID,
  AUTO_DRIVER_NAME_TO_ID,
  ID_TO_DRIVER_NAME,
  ID_TO_AUTO_DRIVER_NAME,
  type GoldDriverName,
  type GoldAutoDriverName,
  type GoldDriverFields
} from "@/types/goldResearch";

export const DRIVER_REGISTRY: DriverRegistryEntry[] = [
  {
    id: "dxy-us-dollar",
    title: "DXY / US Dollar",
    shortTitle: "DXY",
    category: "macro",
    order: 1,
    source: "twelvedata",
    enabled: true,
    weight: 0.25,
    defaultWeight: 0.25,
    supportsTrend: true,
    supportsHistory: true,
    supportsEconomicSurprise: false,
    supportsInstitutionalFlow: false,
    supportsTechnicalBias: false,
    icon: "DollarSign",
    description: "Dollar pressure, DXY direction, and chart context.",
    detailPlaceholder: "Enter DXY direction, level, and analysis"
  },
  {
    id: "us-yields",
    title: "US Yields",
    shortTitle: "Yields",
    category: "macro",
    order: 2,
    source: "fred",
    enabled: true,
    weight: 0.25,
    defaultWeight: 0.25,
    supportsTrend: true,
    supportsHistory: true,
    supportsEconomicSurprise: false,
    supportsInstitutionalFlow: false,
    supportsTechnicalBias: false,
    icon: "TrendingUp",
    description: "10Y and 2Y Treasury direction, yield levels, and news reaction.",
    detailPlaceholder: "Enter yield directions and analysis"
  },
  {
    id: "real-yields",
    title: "Real Yields",
    shortTitle: "Real Yields",
    category: "macro",
    order: 3,
    source: "fred",
    enabled: true,
    weight: 0.25,
    defaultWeight: 0.25,
    supportsTrend: true,
    supportsHistory: true,
    supportsEconomicSurprise: false,
    supportsInstitutionalFlow: false,
    supportsTechnicalBias: false,
    icon: "Minus",
    description: "Real-yield pressure and inflation-expectation direction.",
    detailPlaceholder: "Enter real yields direction and analysis"
  },
  {
    id: "fed-tone-fomc",
    title: "Fed Tone / FOMC",
    shortTitle: "Fed",
    category: "macro",
    order: 4,
    source: "news-api",
    enabled: true,
    weight: 0.25,
    defaultWeight: 0.25,
    supportsTrend: false,
    supportsHistory: false,
    supportsEconomicSurprise: false,
    supportsInstitutionalFlow: false,
    supportsTechnicalBias: false,
    icon: "Landmark",
    description: "Fed tone, rate expectations, speakers, and key quote.",
    detailPlaceholder: "Enter Fed tone, rate expectation, and analysis"
  },
  {
    id: "cpi-pce",
    title: "CPI / PCE",
    shortTitle: "CPI/PCE",
    category: "inflation",
    order: 1,
    source: "fred",
    enabled: true,
    weight: 1.0,
    defaultWeight: 1.0,
    supportsTrend: true,
    supportsHistory: true,
    supportsEconomicSurprise: true,
    supportsInstitutionalFlow: false,
    supportsTechnicalBias: false,
    icon: "Flame",
    description: "Inflation surprise, actual/forecast/previous, and market reaction.",
    detailPlaceholder: "Enter inflation data and analysis"
  },
  {
    id: "nfp-jobs",
    title: "NFP / Jobs",
    shortTitle: "Jobs",
    category: "employment",
    order: 1,
    source: "fred",
    enabled: true,
    weight: 1.0,
    defaultWeight: 1.0,
    supportsTrend: true,
    supportsHistory: true,
    supportsEconomicSurprise: true,
    supportsInstitutionalFlow: false,
    supportsTechnicalBias: false,
    icon: "Users",
    description: "Payrolls, unemployment, wages, and labor-market reaction.",
    detailPlaceholder: "Enter jobs data and analysis"
  },
  {
    id: "economic-growth",
    title: "Economic Growth",
    shortTitle: "Growth",
    category: "growth",
    order: 1,
    source: "fred",
    enabled: true,
    weight: 1.0,
    defaultWeight: 1.0,
    supportsTrend: true,
    supportsHistory: true,
    supportsEconomicSurprise: true,
    supportsInstitutionalFlow: false,
    supportsTechnicalBias: false,
    icon: "BarChart3",
    description: "GDP, PMI, ISM, and broader economic activity analysis.",
    detailPlaceholder: "Enter growth data and analysis"
  },
  {
    id: "etf-flows",
    title: "Gold ETF Flows",
    shortTitle: "ETF",
    category: "institutional",
    order: 1,
    source: "world-gold-council",
    enabled: true,
    weight: 0.25,
    defaultWeight: 0.25,
    supportsTrend: true,
    supportsHistory: true,
    supportsEconomicSurprise: false,
    supportsInstitutionalFlow: true,
    supportsTechnicalBias: false,
    icon: "ArrowUpDown",
    description: "Gold ETF inflows and outflows analysis.",
    detailPlaceholder: "Enter ETF flow data and analysis"
  },
  {
    id: "central-bank-demand",
    title: "Central Bank Demand",
    shortTitle: "CB Demand",
    category: "institutional",
    order: 2,
    source: "world-gold-council",
    enabled: true,
    weight: 0.25,
    defaultWeight: 0.25,
    supportsTrend: true,
    supportsHistory: true,
    supportsEconomicSurprise: false,
    supportsInstitutionalFlow: true,
    supportsTechnicalBias: false,
    icon: "Building2",
    description: "Central bank gold buying and selling activity.",
    detailPlaceholder: "Enter central bank data and analysis"
  },
  {
    id: "market-sentiment",
    title: "Market Sentiment",
    shortTitle: "Sentiment",
    category: "sentiment",
    order: 1,
    source: "composite",
    enabled: true,
    weight: 0.5,
    defaultWeight: 0.5,
    supportsTrend: true,
    supportsHistory: false,
    supportsEconomicSurprise: false,
    supportsInstitutionalFlow: false,
    supportsTechnicalBias: false,
    icon: "Heart",
    description: "Risk appetite, VIX, fear/greed, and market sentiment analysis.",
    detailPlaceholder: "Enter sentiment data and analysis"
  },
  {
    id: "crowd-positioning",
    title: "Crowd Positioning",
    shortTitle: "Crowd",
    category: "sentiment",
    order: 2,
    source: "composite",
    enabled: true,
    weight: 0.5,
    defaultWeight: 0.5,
    supportsTrend: true,
    supportsHistory: false,
    supportsEconomicSurprise: false,
    supportsInstitutionalFlow: true,
    supportsTechnicalBias: false,
    icon: "Group",
    description: "Retail positioning and crowd behavior analysis.",
    detailPlaceholder: "Enter crowd positioning data and analysis"
  },
  {
    id: "geopolitics",
    title: "Geopolitics",
    shortTitle: "Geopolitics",
    category: "geopolitics",
    order: 1,
    source: "news-api",
    enabled: true,
    weight: 1.0,
    defaultWeight: 1.0,
    supportsTrend: false,
    supportsHistory: false,
    supportsEconomicSurprise: false,
    supportsInstitutionalFlow: false,
    supportsTechnicalBias: false,
    icon: "Globe",
    description: "Risk level, event type, DXY reaction, and safe-haven demand.",
    detailPlaceholder: "Enter geopolitical risk level and analysis"
  },
  {
    id: "gold-technical-structure",
    title: "Gold Technical Structure",
    shortTitle: "Technical",
    category: "technical",
    order: 1,
    source: "twelvedata",
    enabled: true,
    weight: 1.0,
    defaultWeight: 1.0,
    supportsTrend: true,
    supportsHistory: false,
    supportsEconomicSurprise: false,
    supportsInstitutionalFlow: false,
    supportsTechnicalBias: true,
    icon: "LineChart",
    description: "Higher timeframe bias, support/resistance, market structure, and setup analysis.",
    detailPlaceholder: "Enter technical structure analysis"
  },
  {
    id: "liquidity-conditions",
    title: "Liquidity Conditions",
    shortTitle: "Liquidity",
    category: "liquidity",
    order: 1,
    source: "fred",
    enabled: true,
    weight: 1.0,
    defaultWeight: 1.0,
    supportsTrend: true,
    supportsHistory: true,
    supportsEconomicSurprise: false,
    supportsInstitutionalFlow: false,
    supportsTechnicalBias: false,
    icon: "Droplets",
    description: "Central bank balance sheet, funding conditions, and liquidity analysis.",
    detailPlaceholder: "Enter liquidity conditions and analysis"
  },
  {
    id: "seasonality",
    title: "Seasonality",
    shortTitle: "Seasonality",
    category: "seasonality",
    order: 1,
    source: "composite",
    enabled: true,
    weight: 0.5,
    defaultWeight: 0.5,
    supportsTrend: false,
    supportsHistory: true,
    supportsEconomicSurprise: false,
    supportsInstitutionalFlow: false,
    supportsTechnicalBias: false,
    icon: "Calendar",
    description: "Historical seasonal patterns for Gold.",
    detailPlaceholder: "Enter seasonal pattern analysis"
  },
  {
    id: "position-risk",
    title: "Position Risk",
    shortTitle: "Position Risk",
    category: "seasonality",
    order: 2,
    source: "composite",
    enabled: true,
    weight: 0.5,
    defaultWeight: 0.5,
    supportsTrend: false,
    supportsHistory: false,
    supportsEconomicSurprise: false,
    supportsInstitutionalFlow: true,
    supportsTechnicalBias: false,
    icon: "AlertOctagon",
    description: "Position risk assessment from crowded trades.",
    detailPlaceholder: "Enter position risk assessment"
  },
  {
    id: "custom-news",
    title: "Custom News",
    shortTitle: "Custom",
    category: "custom",
    order: 1,
    source: "manual",
    enabled: true,
    weight: 1.0,
    defaultWeight: 1.0,
    supportsTrend: false,
    supportsHistory: false,
    supportsEconomicSurprise: false,
    supportsInstitutionalFlow: false,
    supportsTechnicalBias: false,
    icon: "Newspaper",
    description: "Any Gold-related news that does not fit one driver cleanly.",
    detailPlaceholder: "Enter custom news analysis"
  }
];

const ICON_MAP: Record<string, string> = Object.fromEntries(
  DRIVER_REGISTRY.map((driver) => [driver.id, driver.icon ?? "CircleDot"])
);

export function getDriverById(id: string): DriverRegistryEntry | undefined {
  return DRIVER_REGISTRY.find((driver) => driver.id === id);
}

export function getDriversByCategory(categoryId: string): DriverRegistryEntry[] {
  return DRIVER_REGISTRY.filter((driver) => driver.category === categoryId && driver.enabled);
}

export function getEnabledDrivers(): DriverRegistryEntry[] {
  return DRIVER_REGISTRY.filter((driver) => driver.enabled);
}

export function getEnabledDriverTitles(): string[] {
  return getEnabledDrivers().map((driver) => driver.title);
}

export function getDriverIdByTitle(title: string): string | undefined {
  return DRIVER_REGISTRY.find((driver) => driver.title === title)?.id;
}

export function getDriverTitleById(id: string): string {
  return DRIVER_REGISTRY.find((driver) => driver.id === id)?.title ?? id;
}

export function getDriverIconById(id: string): string {
  return ICON_MAP[id] ?? "CircleDot";
}

export function getDriverIconByTitle(title: string): string {
  const id = getDriverIdByTitle(title);
  return id ? getDriverIconById(id) : "CircleDot";
}

export function isDriverEnabled(title: string): boolean {
  return DRIVER_REGISTRY.some((driver) => driver.title === title && driver.enabled);
}

export function getEnabledDriverNames(): GoldDriverName[] {
  return getEnabledDrivers()
    .map((driver) => ID_TO_DRIVER_NAME[driver.id])
    .filter((name): name is GoldDriverName => Boolean(name));
}

export function getDriverNameFromAutoDriver(autoName: GoldAutoDriverName): GoldDriverName {
  const id = AUTO_DRIVER_NAME_TO_ID[autoName];
  return id ? (ID_TO_DRIVER_NAME[id] ?? "Custom News") : "Custom News";
}

export function getAutoDriverNameFromDriverName(driverName: GoldDriverName): GoldAutoDriverName | undefined {
  const id = DRIVER_NAME_TO_ID[driverName];
  return id ? ID_TO_AUTO_DRIVER_NAME[id] : undefined;
}

export function getCurrentValueFromConfig(driverName: GoldDriverName, fields: GoldDriverFields): string {
  const id = DRIVER_NAME_TO_ID[driverName];
  const driver = id ? getDriverById(id) : undefined;
  if (!driver) return "";

  if (id === "dxy-us-dollar") return fields.dxyCurrentLevel ?? "";
  if (id === "us-yields") return [fields.tenYearYieldValue, fields.twoYearYieldValue].filter(Boolean).join(" / ");
  if (id === "real-yields") return fields.realYieldValue ?? "";
  if (id === "fed-tone-fomc") return [fields.fedTone, fields.rateExpectation, fields.fedSpeakerOrEvent].filter(Boolean).join(" / ");
  if (id === "cpi-pce") return [fields.inflationType, fields.actualValue, fields.forecastValue, fields.previousValue].filter(Boolean).join(" / ");
  if (id === "nfp-jobs") return [fields.nfpActual, fields.nfpForecast, fields.unemploymentRate, fields.wageGrowth].filter(Boolean).join(" / ");
  if (id === "geopolitics") return [fields.geopoliticalRiskLevel, fields.eventType, fields.dxyReaction].filter(Boolean).join(" / ");
  if (id === "etf-flows") return [fields.etfFlowDirection, fields.centralBankDemand, fields.reportPeriod].filter(Boolean).join(" / ");
  if (id === "custom-news") return fields.newsCategory ?? "";
  return "";
}
