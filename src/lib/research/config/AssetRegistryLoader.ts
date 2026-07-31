import { registerAsset, getAssetConfig } from "../asset/AssetRegistry";
import { GOLD_ASSET_CONFIG } from "../assets/gold";
import { US100_ASSET_CONFIG } from "../assets/us100";

let loaded = false;

export function ensureAssetRegistryLoaded(): void {
  if (loaded) return;
  registerAsset(GOLD_ASSET_CONFIG);
  registerAsset(US100_ASSET_CONFIG);
  loaded = true;
}

export function getConfig(assetId: string) {
  ensureAssetRegistryLoaded();
  return getAssetConfig(assetId as any);
}
