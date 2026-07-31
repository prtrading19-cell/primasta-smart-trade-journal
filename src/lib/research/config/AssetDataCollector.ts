import type { ResearchAsset } from "../ResearchTypes";
import type { ResearchDataset } from "../models";
import { getConfig } from "./AssetRegistryLoader";

type DatasetConverter = (raw: unknown) => ResearchDataset;

const converterRegistry = new Map<string, DatasetConverter>();

export function registerDatasetConverter(assetId: string, converter: DatasetConverter): void {
  converterRegistry.set(assetId, converter);
}

export function getDatasetConverter(assetId: string): DatasetConverter | undefined {
  return converterRegistry.get(assetId);
}

export async function collectAssetData(assetId: ResearchAsset): Promise<ResearchDataset | null> {
  const config = getConfig(assetId);
  const converter = getDatasetConverter(assetId);
  if (!converter) return null;

  const endpoint = getDataEndpoint(assetId);
  if (!endpoint) return null;

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) return null;
    const raw = await response.json();
    return converter(raw);
  } catch {
    return null;
  }
}

function getDataEndpoint(assetId: ResearchAsset): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  switch (assetId) {
    case "gold": return `${baseUrl}/api/gold/data`;
    case "us100": return `${baseUrl}/api/us100/data`;
    default: return null;
  }
}
