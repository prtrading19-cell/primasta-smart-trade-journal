import type { ResearchAsset } from "@/lib/research/ResearchTypes";

export interface AssetMetadata {
  id: ResearchAsset;
  name: string;
  displayName: string;
  icon: string;
  enabled: boolean;
  description: string;
}

export const ASSET_CONFIG: AssetMetadata[] = [
  {
    id: "gold",
    name: "Gold",
    displayName: "Gold",
    icon: "Circle",
    enabled: true,
    description: "XAU/USD — Institutional gold research",
  },
  {
    id: "us100",
    name: "US100",
    displayName: "US100 (Nasdaq)",
    icon: "TrendingUp",
    enabled: false,
    description: "Nasdaq 100 index — Coming Soon",
  },
  {
    id: "spx500",
    name: "SPX500",
    displayName: "SPX500 (S&P 500)",
    icon: "BarChart3",
    enabled: false,
    description: "S&P 500 index — Coming Soon",
  },
  {
    id: "btcusd",
    name: "BTCUSD",
    displayName: "Bitcoin",
    icon: "Bitcoin",
    enabled: false,
    description: "BTC/USD — Coming Soon",
  },
  {
    id: "eurusd",
    name: "EURUSD",
    displayName: "EUR/USD",
    icon: "ArrowLeftRight",
    enabled: false,
    description: "Euro vs US Dollar — Coming Soon",
  },
  {
    id: "gbpusd",
    name: "GBPUSD",
    displayName: "GBP/USD",
    icon: "ArrowLeftRight",
    enabled: false,
    description: "British Pound vs US Dollar — Coming Soon",
  },
  {
    id: "silver",
    name: "Silver",
    displayName: "Silver",
    icon: "Circle",
    enabled: false,
    description: "XAG/USD — Coming Soon",
  },
  {
    id: "oil",
    name: "Oil",
    displayName: "Crude Oil",
    icon: "Fuel",
    enabled: false,
    description: "WTI Crude Oil — Coming Soon",
  },
];

export const DEFAULT_ASSET: ResearchAsset = "gold";

export function getAssetMetadata(id: ResearchAsset): AssetMetadata {
  return ASSET_CONFIG.find((a) => a.id === id) ?? ASSET_CONFIG[0];
}

export function getEnabledAssets(): AssetMetadata[] {
  return ASSET_CONFIG.filter((a) => a.enabled);
}

export function isAssetEnabled(id: ResearchAsset): boolean {
  const asset = ASSET_CONFIG.find((a) => a.id === id);
  return asset?.enabled ?? false;
}
