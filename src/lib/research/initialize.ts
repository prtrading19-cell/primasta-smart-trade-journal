import { registerProfile } from "./ResearchRegistry";
import { GOLD_PROFILE } from "./profiles/GoldProfile";
import { US100_PROFILE } from "./profiles/US100Profile";

let initialized = false;

export function initializeResearchProfiles(): void {
  if (initialized) return;
  registerProfile(GOLD_PROFILE);
  registerProfile(US100_PROFILE);
  initialized = true;
}

initializeResearchProfiles();
