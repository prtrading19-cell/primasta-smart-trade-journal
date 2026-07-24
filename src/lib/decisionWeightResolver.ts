export interface SourceWeights {
  categoryScore: number;
  technicalBias: number;
  institutionalFlow: number;
}

export interface ResolvedWeights {
  sources: SourceWeights;
  confidenceMultiplier: number;
  alignmentMultiplier: number;
  conflictPenalty: number;
}

const DEFAULT_SOURCE_WEIGHTS: SourceWeights = {
  categoryScore: 0.45,
  technicalBias: 0.30,
  institutionalFlow: 0.25
};

const DEFAULT_RESOLVED_WEIGHTS: ResolvedWeights = {
  sources: DEFAULT_SOURCE_WEIGHTS,
  confidenceMultiplier: 1.0,
  alignmentMultiplier: 1.0,
  conflictPenalty: 0.15
};

export function resolveWeights(
  overrides?: Partial<SourceWeights>
): ResolvedWeights {
  const sources = {
    ...DEFAULT_SOURCE_WEIGHTS,
    ...overrides
  };

  const total = sources.categoryScore + sources.technicalBias + sources.institutionalFlow;
  const normalized = total > 0
    ? {
        categoryScore: sources.categoryScore / total,
        technicalBias: sources.technicalBias / total,
        institutionalFlow: sources.institutionalFlow / total
      }
    : DEFAULT_SOURCE_WEIGHTS;

  return {
    sources: normalized,
    confidenceMultiplier: 1.0,
    alignmentMultiplier: 1.0,
    conflictPenalty: 0.15
  };
}

export function getSourceWeights(): SourceWeights {
  return { ...DEFAULT_SOURCE_WEIGHTS };
}

export function normalizeSourceWeights(weights: SourceWeights): SourceWeights {
  const total = weights.categoryScore + weights.technicalBias + weights.institutionalFlow;
  if (total <= 0) return { ...DEFAULT_SOURCE_WEIGHTS };

  return {
    categoryScore: weights.categoryScore / total,
    technicalBias: weights.technicalBias / total,
    institutionalFlow: weights.institutionalFlow / total
  };
}

export function calculateWeightedScore(
  categoryScore: number,
  technicalScore: number,
  institutionalScore: number,
  weights: SourceWeights
): number {
  const normalized = normalizeSourceWeights(weights);
  return (
    categoryScore * normalized.categoryScore +
    technicalScore * normalized.technicalBias +
    institutionalScore * normalized.institutionalFlow
  );
}

export function adjustScoreForConfidence(
  score: number,
  confidence: number,
  multiplier: number = 1.0
): number {
  const confidenceFactor = confidence / 100;
  const adjustment = (score - 50) * confidenceFactor * multiplier;
  return 50 + adjustment;
}

export function adjustScoreForAlignment(
  score: number,
  alignmentScore: number,
  multiplier: number = 1.0
): number {
  const alignmentFactor = alignmentScore / 100;
  const deviation = score - 50;
  const dampening = 1 - (1 - alignmentFactor) * multiplier * 0.3;
  return 50 + deviation * dampening;
}

export function adjustScoreForConflict(
  score: number,
  conflictScore: number,
  penalty: number = 0.15
): number {
  const conflictFactor = conflictScore / 100;
  const deviation = score - 50;
  const dampening = 1 - conflictFactor * penalty;
  return 50 + deviation * dampening;
}

export function calculateAlignmentScore(
  categoryBias: number,
  technicalBias: number,
  institutionalBias: number
): number {
  const biases = [categoryBias, technicalBias, institutionalBias].filter(b => b !== 0);
  if (biases.length === 0) return 50;

  const allPositive = biases.every(b => b > 0);
  const allNegative = biases.every(b => b < 0);

  if (allPositive || allNegative) return 100;

  const positiveCount = biases.filter(b => b > 0).length;
  const negativeCount = biases.filter(b => b < 0).length;
  const maxCount = Math.max(positiveCount, negativeCount);

  return Math.round((maxCount / biases.length) * 100);
}

export function calculateConflictScore(
  categoryConflict: boolean,
  technicalConflict: boolean,
  institutionalConflict: boolean,
  crossSourceAlignment: number
): number {
  const sourceConflictCount = [categoryConflict, technicalConflict, institutionalConflict]
    .filter(Boolean).length;

  const sourceConflictScore = (sourceConflictCount / 3) * 50;
  const alignmentConflictScore = (100 - crossSourceAlignment) * 0.5;

  return Math.round(sourceConflictScore + alignmentConflictScore);
}

export function calculateCrossSourceAlignment(
  categoryBias: string,
  technicalBias: string,
  institutionalBias: string
): number {
  const biases = [categoryBias, technicalBias, institutionalBias];
  const nonNeutral = biases.filter(b => b !== "Neutral");

  if (nonNeutral.length === 0) return 100;

  const allBullish = nonNeutral.every(b => b.includes("Bullish"));
  const allBearish = nonNeutral.every(b => b.includes("Bearish"));

  if (allBullish || allBearish) return 100;

  const bullishCount = nonNeutral.filter(b => b.includes("Bullish")).length;
  const bearishCount = nonNeutral.filter(b => b.includes("Bearish")).length;

  return Math.round((Math.max(bullishCount, bearishCount) / nonNeutral.length) * 100);
}
