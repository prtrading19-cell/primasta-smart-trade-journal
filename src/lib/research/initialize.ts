import { registerProfile } from "./ResearchRegistry";
import { GOLD_PROFILE } from "./profiles/GoldProfile";

let initialized = false;

export function initializeResearchProfiles(): void {
  if (initialized) return;
  registerProfile(GOLD_PROFILE);
  initialized = true;
}

initializeResearchProfiles();
