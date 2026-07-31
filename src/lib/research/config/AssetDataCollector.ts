import type { ResearchAsset } from "../ResearchTypes";
import type { ResearchDataset } from "../models";
import { getConfig } from "./AssetRegistryLoader";
import { collectGoldFullDataset } from "../gold/goldDataCollector";
import { collectUS100FullDataset } from "../us100/us100DataCollector";

type DatasetConverter = (raw: unknown) => ResearchDataset;

const converterRegistry = new Map<string, DatasetConverter>();

export function registerDatasetConverter(assetId: string, converter: DatasetConverter): void {
  converterRegistry.set(assetId, converter);
}

export function getDatasetConverter(assetId: string): DatasetConverter | undefined {
  return converterRegistry.get(assetId);
}

async function ensureConvertersRegistered(): Promise<void> {
  if (getDatasetConverter("gold") && getDatasetConverter("us100")) return;
  await import("../initialize");
}

export async function collectAssetData(assetId: ResearchAsset): Promise<ResearchDataset | null> {
  const config = getConfig(assetId);
  await ensureConvertersRegistered();
  const converter = getDatasetConverter(assetId);
  if (!converter) return null;

  try {
    const raw = await collectRawDataset(assetId);
    if (raw === null) return null;
    return converter(raw);
  } catch {
    return null;
  }
}

async function collectRawDataset(assetId: ResearchAsset): Promise<unknown> {
  switch (assetId) {
    case "gold":
      return collectGoldFullDataset();
    case "us100":
      return collectUS100FullDataset();
    default:
      return null;
  }
}
