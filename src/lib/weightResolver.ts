import type {
  WeightConfiguration,
  CategoryWeightConfig,
  DriverWeightConfig
} from "@/types/goldResearchConfig";
import { CATEGORY_DEFINITIONS } from "@/config/categoryConfig";
import { DRIVER_REGISTRY } from "@/config/driverRegistry";
import { DEFAULT_WEIGHT_CONFIGURATION } from "@/config/defaultWeights";

export interface ResolvedCategoryWeight {
  categoryId: string;
  categoryTitle: string;
  weight: number;
  isDefault: boolean;
  driverWeights: ResolvedDriverWeight[];
}

export interface ResolvedDriverWeight {
  driverId: string;
  driverTitle: string;
  weight: number;
  isDefault: boolean;
  isEnabled: boolean;
}

export interface WeightResolutionResult {
  categories: ResolvedCategoryWeight[];
  totalCategoryWeight: number;
  isValid: boolean;
  warnings: string[];
}

export function resolveWeights(config?: WeightConfiguration): WeightResolutionResult {
  const effectiveConfig = config ?? DEFAULT_WEIGHT_CONFIGURATION;
  const warnings: string[] = [];
  const categories: ResolvedCategoryWeight[] = [];

  const activeCategoryDefs = CATEGORY_DEFINITIONS.filter(
    (c) => c.defaultWeight > 0
  );

  for (const catDef of activeCategoryDefs) {
    const weightConfig = effectiveConfig.categoryWeights.find(
      (cw) => cw.categoryId === catDef.id
    );

    const isDefault = !weightConfig || weightConfig.weight === catDef.defaultWeight;
    const weight = weightConfig?.weight ?? catDef.defaultWeight;

    const driverWeights = resolveDriverWeights(catDef.id, weightConfig);

    if (weight <= 0) {
      warnings.push(`Category "${catDef.title}" has zero or negative weight.`);
    }

    categories.push({
      categoryId: catDef.id,
      categoryTitle: catDef.title,
      weight,
      isDefault,
      driverWeights
    });
  }

  const totalCategoryWeight = categories.reduce(
    (sum, c) => sum + c.weight,
    0
  );

  const isValid = validateResolution(categories, totalCategoryWeight, warnings);

  return {
    categories,
    totalCategoryWeight,
    isValid,
    warnings
  };
}

export function resolveCategoryWeight(
  categoryId: string,
  config?: WeightConfiguration
): ResolvedCategoryWeight | undefined {
  const result = resolveWeights(config);
  return result.categories.find((c) => c.categoryId === categoryId);
}

export function resolveDriverWeight(
  categoryId: string,
  driverId: string,
  config?: WeightConfiguration
): ResolvedDriverWeight | undefined {
  const category = resolveCategoryWeight(categoryId, config);
  if (!category) return undefined;
  return category.driverWeights.find((dw) => dw.driverId === driverId);
}

export function normalizeWeights(config: WeightConfiguration): WeightConfiguration {
  const totalCategoryWeight = config.categoryWeights.reduce(
    (sum, cw) => sum + cw.weight,
    0
  );

  if (totalCategoryWeight <= 0) {
    return DEFAULT_WEIGHT_CONFIGURATION;
  }

  const categoryWeights = config.categoryWeights.map((cw) => {
    const normalizedCategoryWeight = cw.weight / totalCategoryWeight;

    const totalDriverWeight = cw.driverWeights.reduce(
      (sum, dw) => sum + dw.weight,
      0
    );

    const driverWeights = totalDriverWeight > 0
      ? cw.driverWeights.map((dw) => ({
          ...dw,
          weight: dw.weight / totalDriverWeight
        }))
      : cw.driverWeights;

    return {
      ...cw,
      weight: normalizedCategoryWeight,
      driverWeights
    };
  });

  return { categoryWeights };
}

export function buildDefaultWeightsForCategories(categoryIds: string[]): WeightConfiguration {
  const categoryWeights: CategoryWeightConfig[] = [];

  for (const categoryId of categoryIds) {
    const catDef = CATEGORY_DEFINITIONS.find((c) => c.id === categoryId);
    if (!catDef || catDef.defaultWeight <= 0) continue;

    const categoryDrivers = DRIVER_REGISTRY.filter(
      (driver) => catDef.driverIds.includes(driver.id) && driver.enabled
    );

    const driverWeights: DriverWeightConfig[] = categoryDrivers.map((driver) => ({
      driverId: driver.id,
      weight: driver.defaultWeight
    }));

    categoryWeights.push({
      categoryId: catDef.id,
      weight: catDef.defaultWeight,
      driverWeights
    });
  }

  return { categoryWeights };
}

export function getEffectiveDriverWeight(
  categoryId: string,
  driverId: string,
  config?: WeightConfiguration
): number {
  const resolved = resolveDriverWeight(categoryId, driverId, config);
  if (!resolved || !resolved.isEnabled) return 0;
  return resolved.weight;
}

export function getCategoryWeightPercentage(
  categoryId: string,
  config?: WeightConfiguration
): number {
  const result = resolveWeights(config);
  if (result.totalCategoryWeight <= 0) return 0;
  const cat = result.categories.find((c) => c.categoryId === categoryId);
  if (!cat) return 0;
  return (cat.weight / result.totalCategoryWeight) * 100;
}

function resolveDriverWeights(
  categoryId: string,
  weightConfig?: CategoryWeightConfig
): ResolvedDriverWeight[] {
  const catDef = CATEGORY_DEFINITIONS.find((c) => c.id === categoryId);
  if (!catDef) return [];

  const allCategoryDrivers = DRIVER_REGISTRY.filter(
    (driver) => catDef.driverIds.includes(driver.id)
  );

  return allCategoryDrivers.map((driver) => {
    const driverWeightConfig = weightConfig?.driverWeights.find(
      (dw) => dw.driverId === driver.id
    );

    const weight = driverWeightConfig?.weight ?? driver.defaultWeight;
    const isDefault = !driverWeightConfig || driverWeightConfig.weight === driver.defaultWeight;

    return {
      driverId: driver.id,
      driverTitle: driver.title,
      weight,
      isDefault,
      isEnabled: driver.enabled
    };
  });
}

function validateResolution(
  categories: ResolvedCategoryWeight[],
  totalCategoryWeight: number,
  warnings: string[]
): boolean {
  if (categories.length === 0) {
    warnings.push("No active categories found.");
    return false;
  }

  if (Math.abs(totalCategoryWeight - 1.0) > 0.05) {
    warnings.push(
      `Total category weight is ${totalCategoryWeight.toFixed(4)}, expected ~1.0. Weights may need normalization.`
    );
  }

  for (const cat of categories) {
    const driverTotal = cat.driverWeights.reduce(
      (sum, dw) => sum + (dw.isEnabled ? dw.weight : 0),
      0
    );

    const enabledDrivers = cat.driverWeights.filter((dw) => dw.isEnabled);

    if (enabledDrivers.length > 0 && Math.abs(driverTotal - 1.0) > 0.05) {
      warnings.push(
        `Category "${cat.categoryTitle}" driver weights sum to ${driverTotal.toFixed(4)}, expected ~1.0.`
      );
    }
  }

  return warnings.length === 0;
}
