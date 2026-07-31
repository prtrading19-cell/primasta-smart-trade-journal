import { ProviderRegistry } from "./ProviderRegistry";
import type { ProviderRegistration } from "./types";

const VOLATILITY_TTL_MS = 60_000;
const ETF_TTL_MS = 300_000;
const BREADTH_TTL_MS = 300_000;
const SECTOR_TTL_MS = 300_000;
const MACRO_TTL_MS = 3_600_000;
const COT_TTL_MS = 604_800_000;
const OPEN_INTEREST_TTL_MS = 300_000;
const MARKET_DATA_TTL_MS = 60_000;
const EARNINGS_TTL_MS = 300_000;
const PROFILES_TTL_MS = 3_600_000;

const DEFAULT_TIMEOUT_MS = 10000;
const FMP_TIMEOUT_MS = 8000;
const COT_TIMEOUT_MS = 15000;

const registrations: ProviderRegistration[] = [
  {
    id: "market-index-fmp",
    name: "Market Index (FMP)",
    assetClass: "us100",
    providerType: "market-data",
    priority: 1,
    source: "Financial Modeling Prep",
    refreshIntervalMs: MARKET_DATA_TTL_MS,
    timeoutMs: FMP_TIMEOUT_MS,
    cacheTtlMs: MARKET_DATA_TTL_MS,
    enabled: true,
  },
  {
    id: "stock-quotes-twelve",
    name: "Stock Quotes (Twelve Data)",
    assetClass: "us100",
    providerType: "market-data",
    priority: 2,
    source: "Twelve Data",
    refreshIntervalMs: MARKET_DATA_TTL_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    cacheTtlMs: MARKET_DATA_TTL_MS,
    enabled: true,
  },
  {
    id: "earnings-fmp",
    name: "Earnings (FMP)",
    assetClass: "us100",
    providerType: "earnings",
    priority: 1,
    source: "Financial Modeling Prep",
    refreshIntervalMs: EARNINGS_TTL_MS,
    timeoutMs: FMP_TIMEOUT_MS,
    cacheTtlMs: EARNINGS_TTL_MS,
    enabled: true,
  },
  {
    id: "sectors-fmp",
    name: "Sectors (FMP)",
    assetClass: "us100",
    providerType: "sectors",
    priority: 1,
    source: "Financial Modeling Prep",
    refreshIntervalMs: SECTOR_TTL_MS,
    timeoutMs: FMP_TIMEOUT_MS,
    cacheTtlMs: SECTOR_TTL_MS,
    enabled: true,
  },
  {
    id: "movers-fmp",
    name: "Market Movers (FMP)",
    assetClass: "us100",
    providerType: "market-data",
    priority: 1,
    source: "Financial Modeling Prep",
    refreshIntervalMs: MARKET_DATA_TTL_MS,
    timeoutMs: FMP_TIMEOUT_MS,
    cacheTtlMs: MARKET_DATA_TTL_MS,
    enabled: true,
  },
  {
    id: "volatility-fmp",
    name: "Volatility (FMP)",
    assetClass: "us100",
    providerType: "volatility",
    priority: 1,
    source: "Financial Modeling Prep",
    refreshIntervalMs: VOLATILITY_TTL_MS,
    timeoutMs: FMP_TIMEOUT_MS,
    cacheTtlMs: VOLATILITY_TTL_MS,
    enabled: true,
  },
  {
    id: "company-profiles-fmp",
    name: "Company Profiles (FMP)",
    assetClass: "us100",
    providerType: "profiles",
    priority: 1,
    source: "Financial Modeling Prep",
    refreshIntervalMs: PROFILES_TTL_MS,
    timeoutMs: FMP_TIMEOUT_MS,
    cacheTtlMs: PROFILES_TTL_MS,
    enabled: true,
  },
  {
    id: "volatility-institutional",
    name: "Volatility (Institutional)",
    assetClass: ["gold", "us100"],
    providerType: "volatility",
    priority: 2,
    source: "Twelve Data",
    refreshIntervalMs: VOLATILITY_TTL_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    cacheTtlMs: VOLATILITY_TTL_MS,
    enabled: true,
  },
  {
    id: "breadth-institutional",
    name: "Market Breadth (Institutional)",
    assetClass: ["gold", "us100"],
    providerType: "breadth",
    priority: 1,
    source: "Financial Modeling Prep",
    refreshIntervalMs: BREADTH_TTL_MS,
    timeoutMs: FMP_TIMEOUT_MS,
    cacheTtlMs: BREADTH_TTL_MS,
    enabled: true,
  },
  {
    id: "sectors-institutional",
    name: "Sector Rotation (Institutional)",
    assetClass: ["gold", "us100"],
    providerType: "sectors",
    priority: 2,
    source: "Twelve Data",
    refreshIntervalMs: SECTOR_TTL_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    cacheTtlMs: SECTOR_TTL_MS,
    enabled: true,
  },
  {
    id: "macro-institutional",
    name: "Macro (Institutional)",
    assetClass: ["gold", "us100"],
    providerType: "macro",
    priority: 1,
    source: "Twelve Data / FRED",
    refreshIntervalMs: MACRO_TTL_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    cacheTtlMs: MACRO_TTL_MS,
    enabled: true,
  },
  {
    id: "cot-institutional",
    name: "COT (Institutional)",
    assetClass: ["gold", "us100"],
    providerType: "cot",
    priority: 1,
    source: "CFTC",
    refreshIntervalMs: COT_TTL_MS,
    timeoutMs: COT_TIMEOUT_MS,
    cacheTtlMs: COT_TTL_MS,
    enabled: true,
  },
  {
    id: "etf-institutional",
    name: "ETF Flows (Institutional)",
    assetClass: ["gold", "us100"],
    providerType: "etf",
    priority: 1,
    source: "Financial Modeling Prep",
    refreshIntervalMs: ETF_TTL_MS,
    timeoutMs: FMP_TIMEOUT_MS,
    cacheTtlMs: ETF_TTL_MS,
    enabled: true,
  },
  {
    id: "open-interest-institutional",
    name: "Open Interest (Institutional)",
    assetClass: ["gold", "us100"],
    providerType: "open-interest",
    priority: 1,
    source: "Financial Modeling Prep",
    refreshIntervalMs: OPEN_INTEREST_TTL_MS,
    timeoutMs: FMP_TIMEOUT_MS,
    cacheTtlMs: OPEN_INTEREST_TTL_MS,
    enabled: true,
  },
  {
    id: "gold-price-twelve",
    name: "Gold Price (Twelve Data)",
    assetClass: "gold",
    providerType: "market-data",
    priority: 1,
    source: "Twelve Data",
    refreshIntervalMs: MARKET_DATA_TTL_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    cacheTtlMs: MARKET_DATA_TTL_MS,
    enabled: true,
  },
];

export function initializeProviderRegistry(): void {
  const registry = ProviderRegistry.getInstance();
  for (const r of registrations) {
    if (!registry.has(r.id)) {
      registry.register(r);
    }
  }
}
