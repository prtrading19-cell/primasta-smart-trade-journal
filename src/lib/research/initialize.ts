import { registerProfile } from "./ResearchRegistry";
import { GOLD_PROFILE } from "./profiles/GoldProfile";
import { US100_PROFILE } from "./profiles/US100Profile";
import { ensureAssetRegistryLoaded } from "./config/AssetRegistryLoader";
import { registerDatasetConverter } from "./config/AssetDataCollector";
import { convertGoldDatasetToResearch } from "./gold/ResearchDatasetConverter";
import { convertUS100DatasetToResearch } from "./us100/ResearchDatasetConverter";

let initialized = false;

export function initializeResearchProfiles(): void {
  if (initialized) return;
  registerProfile(GOLD_PROFILE);
  registerProfile(US100_PROFILE);
  ensureAssetRegistryLoaded();
  registerDatasetConverter("gold", (raw) => convertGoldDatasetToResearch(raw as any));
  registerDatasetConverter("us100", (raw) => convertUS100DatasetToResearch(raw as any));
  initialized = true;
}

initializeResearchProfiles();
