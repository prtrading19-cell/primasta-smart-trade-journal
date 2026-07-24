import type { WeightConfiguration, CategoryWeightConfig } from "@/types/goldResearchConfig";
import { CATEGORY_DEFINITIONS } from "./categoryConfig";
import { DRIVER_REGISTRY } from "./driverRegistry";

function buildDefaultCategoryWeights(): CategoryWeightConfig[] {
  return CATEGORY_DEFINITIONS.filter((category) => category.defaultWeight > 0).map((category) => {
    const categoryDrivers = DRIVER_REGISTRY.filter(
      (driver) => category.driverIds.includes(driver.id) && driver.enabled
    );

    const driverWeights = categoryDrivers.map((driver) => ({
      driverId: driver.id,
      weight: driver.defaultWeight,
    }));

    return {
      categoryId: category.id,
      weight: category.defaultWeight,
      driverWeights,
    };
  });
}

export const DEFAULT_WEIGHT_CONFIGURATION: WeightConfiguration = {
  categoryWeights: buildDefaultCategoryWeights(),
};

export function getCategoryWeight(categoryId: string, config?: WeightConfiguration): number {
  const weights = config ?? DEFAULT_WEIGHT_CONFIGURATION;
  return weights.categoryWeights.find((cw) => cw.categoryId === categoryId)?.weight ?? 0;
}

export function getDriverWeight(
  categoryId: string,
  driverId: string,
  config?: WeightConfiguration
): number {
  const weights = config ?? DEFAULT_WEIGHT_CONFIGURATION;
  const categoryWeight = weights.categoryWeights.find((cw) => cw.categoryId === categoryId);
  if (!categoryWeight) return 0;

  const driverWeight = categoryWeight.driverWeights.find((dw) => dw.driverId === driverId);
  return driverWeight?.weight ?? 0;
}

export function validateWeightConfiguration(config: WeightConfiguration): boolean {
  const categorySum = config.categoryWeights.reduce((sum, cw) => sum + cw.weight, 0);
  if (Math.abs(categorySum - 1.0) > 0.01) return false;

  for (const categoryWeight of config.categoryWeights) {
    const driverSum = categoryWeight.driverWeights.reduce((sum, dw) => sum + dw.weight, 0);
    if (categoryWeight.driverWeights.length > 0 && Math.abs(driverSum - 1.0) > 0.01) {
      return false;
    }
  }

  return true;
}

export function createWeightOverride(
  baseConfig: WeightConfiguration,
  overrides: Partial<WeightConfiguration>
): WeightConfiguration {
  const config = { ...baseConfig };

  if (overrides.categoryWeights) {
    config.categoryWeights = overrides.categoryWeights.map((override) => {
      const base = config.categoryWeights.find(
        (cw) => cw.categoryId === override.categoryId
      );
      return {
        ...base,
        ...override,
        driverWeights: override.driverWeights ?? base?.driverWeights ?? []
      };
    });
  }

  return config;
}

export function overrideCategoryWeight(
  config: WeightConfiguration,
  categoryId: string,
  newWeight: number
): WeightConfiguration {
  const categoryWeights = config.categoryWeights.map((cw) =>
    cw.categoryId === categoryId ? { ...cw, weight: newWeight } : cw
  );
  return { categoryWeights };
}

export function overrideDriverWeight(
  config: WeightConfiguration,
  categoryId: string,
  driverId: string,
  newWeight: number
): WeightConfiguration {
  const categoryWeights = config.categoryWeights.map((cw) => {
    if (cw.categoryId !== categoryId) return cw;
    const driverWeights = cw.driverWeights.map((dw) =>
      dw.driverId === driverId ? { ...dw, weight: newWeight } : dw
    );
    return { ...cw, driverWeights };
  });
  return { categoryWeights };
}

export function getAllCategoryWeights(config?: WeightConfiguration): Record<string, number> {
  const weights = config ?? DEFAULT_WEIGHT_CONFIGURATION;
  const result: Record<string, number> = {};
  for (const cw of weights.categoryWeights) {
    result[cw.categoryId] = cw.weight;
  }
  return result;
}

export function getAllDriverWeights(
  categoryId: string,
  config?: WeightConfiguration
): Record<string, number> {
  const weights = config ?? DEFAULT_WEIGHT_CONFIGURATION;
  const categoryWeight = weights.categoryWeights.find(
    (cw) => cw.categoryId === categoryId
  );
  if (!categoryWeight) return {};

  const result: Record<string, number> = {};
  for (const dw of categoryWeight.driverWeights) {
    result[dw.driverId] = dw.weight;
  }
  return result;
}

export function getTotalCategoryWeightSum(config: WeightConfiguration): number {
  return config.categoryWeights.reduce((sum, cw) => sum + cw.weight, 0);
}

export function getTotalDriverWeightSum(
  categoryId: string,
  config: WeightConfiguration
): number {
  const categoryWeight = config.categoryWeights.find(
    (cw) => cw.categoryId === categoryId
  );
  if (!categoryWeight) return 0;
  return categoryWeight.driverWeights.reduce((sum, dw) => sum + dw.weight, 0);
}
