import type { WeightConfiguration } from "@/types/goldResearchConfig";
import { DRIVER_REGISTRY, getDriverById } from "./driverRegistry";
import { CATEGORY_DEFINITIONS, getCategoryById } from "./categoryConfig";
import { DEFAULT_WEIGHT_CONFIGURATION, validateWeightConfiguration } from "./defaultWeights";

export interface ResearchEngineConfig {
  drivers: typeof DRIVER_REGISTRY;
  categories: typeof CATEGORY_DEFINITIONS;
  weights: WeightConfiguration;
  version: string;
  lastUpdated: string;
}

export const RESEARCH_ENGINE_CONFIG: ResearchEngineConfig = {
  drivers: DRIVER_REGISTRY,
  categories: CATEGORY_DEFINITIONS,
  weights: DEFAULT_WEIGHT_CONFIGURATION,
  version: "2.0.0",
  lastUpdated: new Date().toISOString(),
};

export function getConfiguredDrivers() {
  return RESEARCH_ENGINE_CONFIG.drivers.filter((driver) => driver.enabled);
}

export function getConfiguredCategories() {
  return RESEARCH_ENGINE_CONFIG.categories.filter(
    (category) => category.defaultWeight > 0
  );
}

export function getDriverConfig(driverId: string) {
  return getDriverById(driverId);
}

export function getCategoryConfig(categoryId: string) {
  return getCategoryById(categoryId);
}

export function isConfigValid(): boolean {
  return validateWeightConfiguration(RESEARCH_ENGINE_CONFIG.weights);
}
