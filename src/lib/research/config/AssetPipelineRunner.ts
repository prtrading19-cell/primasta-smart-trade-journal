import type { ResearchAsset } from "../ResearchTypes";
import type { AssetConfiguration } from "../asset/types";
import type { ResearchDataset } from "../models";
import type { PipelineResult } from "../engine/ResearchPipeline";
import { getConfig } from "./AssetRegistryLoader";
import { run as runPipeline } from "../engine/ResearchPipeline";
import { collectAssetData } from "./AssetDataCollector";

export interface AssetPipelineInput {
  assetId: ResearchAsset;
  dataset: ResearchDataset;
}

export interface AssetPipelineOutput {
  assetConfig: AssetConfiguration;
  pipelineResult: PipelineResult;
}

export async function runAssetPipeline(input: AssetPipelineInput): Promise<AssetPipelineOutput> {
  const config = getConfig(input.assetId);

  const pipelineResult = await runPipeline(input.dataset);

  return { assetConfig: config, pipelineResult };
}

export function loadAssetConfig(assetId: ResearchAsset): AssetConfiguration {
  return getConfig(assetId);
}

export async function runFullAssetPipeline(assetId: ResearchAsset): Promise<AssetPipelineOutput> {
  const dataset = await collectAssetData(assetId);
  if (!dataset) {
    throw new Error(`Unable to collect data for asset: ${assetId}`);
  }
  return runAssetPipeline({ assetId, dataset });
}
