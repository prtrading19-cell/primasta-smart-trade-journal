import type { ResearchSnapshot } from "./types";

export interface ProviderAnalyticsRecord {
  providerId: string;
  totalRefreshes: number;
  uptime: number;
  failures: number;
  successRate: number;
  averageLatency: number;
  lastLatency: number;
  latencyTrend: "improving" | "declining" | "stable";
  averageConfidenceContribution: number;
}

export function computeProviderAnalytics(snapshots: ResearchSnapshot[]): ProviderAnalyticsRecord[] {
  const providerMap = new Map<string, {
    refreshes: number;
    failures: number;
    latencies: number[];
    confidenceContributions: number[];
    lastLatency: number;
    lastFailure?: string;
  }>();

  for (const s of snapshots) {
    for (const [providerId, health] of Object.entries(s.providerHealth)) {
      const record = providerMap.get(providerId) ?? {
        refreshes: 0,
        failures: 0,
        latencies: [],
        confidenceContributions: [],
        lastLatency: 0,
      };

      record.refreshes++;
      record.latencies.push(health.averageLatency);
      record.lastLatency = health.averageLatency;

      if (health.lastFailure) {
        record.failures++;
        record.lastFailure = health.lastFailure;
      }

      record.confidenceContributions.push(health.successRate);
      providerMap.set(providerId, record);
    }
  }

  const results: ProviderAnalyticsRecord[] = [];

  for (const [providerId, data] of providerMap) {
    const avgLatency = data.latencies.length > 0
      ? Math.round(data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length)
      : 0;

    const half = Math.floor(data.latencies.length / 2);
    const firstHalf = data.latencies.slice(0, half);
    const secondHalf = data.latencies.slice(half);
    const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;

    const avgContribution = data.confidenceContributions.length > 0
      ? Math.round(data.confidenceContributions.reduce((a, b) => a + b, 0) / data.confidenceContributions.length)
      : 0;

    const successRate = data.refreshes > 0
      ? Math.round(((data.refreshes - data.failures) / data.refreshes) * 100)
      : 100;

    results.push({
      providerId,
      totalRefreshes: data.refreshes,
      uptime: successRate,
      failures: data.failures,
      successRate,
      averageLatency: avgLatency,
      lastLatency: data.lastLatency,
      latencyTrend: secondAvg < firstAvg - 10 ? "improving" : secondAvg > firstAvg + 10 ? "declining" : "stable",
      averageConfidenceContribution: avgContribution,
    });
  }

  return results.sort((a, b) => b.totalRefreshes - a.totalRefreshes);
}
