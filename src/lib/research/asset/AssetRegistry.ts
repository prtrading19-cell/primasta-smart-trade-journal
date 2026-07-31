import type { ResearchAsset } from "../ResearchTypes";
import type { AssetConfiguration, AssetClass } from "./types";

const registry = new Map<ResearchAsset, AssetConfiguration>();

export function registerAsset(config: AssetConfiguration): void {
  registry.set(config.id, config);
}

export function getAssetConfig(assetId: ResearchAsset): AssetConfiguration {
  const config = registry.get(assetId);
  if (!config) {
    throw new Error(`Asset not registered: ${assetId}`);
  }
  return config;
}

export function getRegisteredAssets(): AssetConfiguration[] {
  return Array.from(registry.values());
}

export function getEnabledAssets(): AssetConfiguration[] {
  return getRegisteredAssets().filter((a) => a.enabled);
}

export function getAssetClass(assetId: ResearchAsset): AssetClass {
  return getAssetConfig(assetId).assetClass;
}

export function getAssetDrivers(assetId: ResearchAsset) {
  const config = getAssetConfig(assetId);
  return config.providers.flatMap((p) =>
    (config as any).drivers?.filter((d: any) => d.sourceField === p.id) ?? []
  );
}

export function getAssetCategories(assetId: ResearchAsset) {
  return getAssetConfig(assetId).categories;
}

export function getAssetPrompts(assetId: ResearchAsset) {
  return getAssetConfig(assetId).prompts;
}

export function getAssetDashboard(assetId: ResearchAsset) {
  return getAssetConfig(assetId).dashboard;
}

export function getAssetTrackedSymbols(assetId: ResearchAsset): string[] {
  return getAssetConfig(assetId).settings.trackedSymbols;
}
