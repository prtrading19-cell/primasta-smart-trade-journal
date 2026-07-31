import type { ResearchAsset } from "../ResearchTypes";
import type { ProviderMeta } from "@/types/institutional";

export type AssetClass = "commodity" | "index" | "forex" | "crypto" | "equity";

export interface ProviderEndpoint {
  url: string;
  method?: "GET" | "POST";
  timeoutMs?: number;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

export interface ProviderConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  endpoint?: ProviderEndpoint;
  parameters?: Record<string, unknown>;
  cacheTtlMs?: number;
  dependsOn?: string[];
  fallbackProviderId?: string;
}

export interface DataExtractorConfig {
  providerId: string;
  field: string;
  target: string;
  transform?: string;
  required?: boolean;
  defaultValue?: unknown;
}

export interface DriverConfig {
  id: string;
  title: string;
  shortTitle: string;
  categoryId: string;
  enabled: boolean;
  weight: number;
  order: number;
  icon?: string;
  description: string;
  supportsTrend: boolean;
  supportsHistory: boolean;
  supportsEconomicSurprise: boolean;
  supportsInstitutionalFlow: boolean;
  supportsTechnicalBias: boolean;
  sourceField?: string;
  extractors?: DataExtractorConfig[];
}

export interface CategoryConfig {
  id: string;
  title: string;
  description: string;
  driverIds: string[];
  weight: number;
  color: string;
  icon?: string;
}

export interface PromptConfig {
  systemPrompt: string;
  analystInstruction: string;
  contextTemplate?: string;
  summaryPrompt?: string;
}

export interface DashboardConfig {
  defaultTimeframe: string;
  positionSizing: {
    baseRiskPercent: number;
    maxRiskPercent: number;
    volatilityAdjustment: boolean;
  };
  impactLabels: {
    bullish: string;
    bearish: string;
    neutral: string;
    mixed: string;
  };
  biasLabels: {
    bullish: string;
    bearish: string;
    neutral: string;
    mixed: string;
  };
  preTradeLabels: {
    tradeAllowed: string;
    wait: string;
    avoidBeforeNews: string;
    manageExisting: string;
  };
  personalRule: string;
  supportedSections: string[];
}

export interface AssetConfiguration {
  id: ResearchAsset;
  name: string;
  displayName: string;
  assetClass: AssetClass;
  baseCurrency: string;
  quoteCurrency?: string;
  description: string;
  enabled: boolean;

  providers: ProviderConfig[];
  categories: CategoryConfig[];
  prompts: PromptConfig;
  dashboard: DashboardConfig;

  settings: {
    priceSource: string;
    volatilityIndex: string;
    defaultTimeframe: string;
    trackedSymbols: string[];
  };
}

export interface AssetRegistryEntry {
  config: AssetConfiguration;
  dataCollector?: (assetId: string) => Promise<unknown>;
  datasetConverter?: (raw: unknown) => Promise<unknown>;
}

export type AssetDataCollector = (config: AssetConfiguration) => Promise<Record<string, unknown>>;
export type AssetDatasetFactory = (config: AssetConfiguration, rawData: Record<string, unknown>) => Promise<unknown>;
