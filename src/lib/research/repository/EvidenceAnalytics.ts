import type { ResearchSnapshot } from "./types";

export interface BiasAggregation {
  bias: string;
  count: number;
  percentage: string;
}

export interface CategoryBiasBreakdown {
  category: string;
  total: number;
  biases: BiasAggregation[];
}

export interface EvidenceAnalyticsResult {
  totalEvidenceRecords: number;
  breakdownByCategory: CategoryBiasBreakdown[];
  overallBiasDistribution: BiasAggregation[];
}

export function computeEvidenceAnalytics(snapshots: ResearchSnapshot[]): EvidenceAnalyticsResult {
  if (snapshots.length === 0) {
    return { totalEvidenceRecords: 0, breakdownByCategory: [], overallBiasDistribution: [] };
  }

  const categoryBiasCount: Record<string, Record<string, number>> = {};
  let totalRecords = 0;

  for (const s of snapshots) {
    for (const ev of s.result.evidence) {
      totalRecords++;
      const cat = ev.category;
      if (!categoryBiasCount[cat]) categoryBiasCount[cat] = {};
      categoryBiasCount[cat][ev.bias] = (categoryBiasCount[cat][ev.bias] ?? 0) + 1;
    }
  }

  const breakdownByCategory: CategoryBiasBreakdown[] = [];
  const overallCount: Record<string, number> = {};

  for (const [category, biases] of Object.entries(categoryBiasCount)) {
    const totalInCategory = Object.values(biases).reduce((a, b) => a + b, 0);
    const biasEntries: BiasAggregation[] = [];

    for (const [bias, count] of Object.entries(biases)) {
      biasEntries.push({
        bias,
        count,
        percentage: ((count / totalInCategory) * 100).toFixed(1) + "%",
      });
      overallCount[bias] = (overallCount[bias] ?? 0) + count;
    }

    breakdownByCategory.push({
      category,
      total: totalInCategory,
      biases: biasEntries.sort((a, b) => b.count - a.count),
    });
  }

  const overallTotal = Object.values(overallCount).reduce((a, b) => a + b, 0);
  const overallBiasDistribution: BiasAggregation[] = Object.entries(overallCount)
    .map(([bias, count]) => ({
      bias,
      count,
      percentage: ((count / overallTotal) * 100).toFixed(1) + "%",
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalEvidenceRecords: totalRecords,
    breakdownByCategory: breakdownByCategory.sort((a, b) => b.total - a.total),
    overallBiasDistribution,
  };
}
