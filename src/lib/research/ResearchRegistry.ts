import type { ResearchAsset, ResearchProfile } from "./ResearchTypes";

const profiles = new Map<ResearchAsset, ResearchProfile>();

export function registerProfile(profile: ResearchProfile): void {
  profiles.set(profile.asset, profile);
}

export function getProfile(asset: ResearchAsset): ResearchProfile | undefined {
  return profiles.get(asset);
}

export function listProfiles(): ResearchProfile[] {
  return Array.from(profiles.values());
}

export function hasProfile(asset: ResearchAsset): boolean {
  return profiles.has(asset);
}

export function getRegisteredAssets(): ResearchAsset[] {
  return Array.from(profiles.keys());
}
