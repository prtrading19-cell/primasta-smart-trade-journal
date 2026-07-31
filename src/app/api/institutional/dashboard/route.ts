import { NextResponse } from "next/server";
import { ProviderRegistry } from "@/lib/research/infrastructure/ProviderRegistry";
import { ProviderHealthEngine } from "@/lib/research/infrastructure/ProviderHealthEngine";
import { ProviderCache } from "@/lib/research/infrastructure/ProviderCache";
import { ProviderLogger } from "@/lib/research/infrastructure/ProviderLogger";
import { SchedulerEngine } from "@/lib/research/infrastructure/SchedulerEngine";
import { initializeProviderRegistry } from "@/lib/research/infrastructure/registerProviders";
import { ResearchRepository } from "@/lib/research/repository/ResearchRepository";
import { computeDecisionAnalytics } from "@/lib/research/repository/DecisionAnalytics";
import { computeProviderAnalytics } from "@/lib/research/repository/ProviderAnalytics";
import { computeEvidenceAnalytics } from "@/lib/research/repository/EvidenceAnalytics";
import { globalTimeline, globalDecisionHistory } from "@/lib/research/decision";

export const dynamic = "force-dynamic";

export async function GET() {
  initializeProviderRegistry();

  const registry = ProviderRegistry.getInstance();
  const health = ProviderHealthEngine.getInstance();
  const cache = ProviderCache.getInstance();
  const logger = ProviderLogger.getInstance();
  const engine = SchedulerEngine.getInstance();
  const repo = ResearchRepository.getInstance();

  const now = Date.now();

  /* Providers */
  const providers = registry.getAll().map((p) => {
    const h = health.get(p.id);
    const logStatsForProvider = logger.getByProvider(p.id, 50);
    const hits = logStatsForProvider.filter((l) => l.cacheHit).length;
    const total = logStatsForProvider.length;
    const cacheHitRate = total > 0 ? Math.round((hits / total) * 100) : 0;

    const cacheEntries = cache.getEntriesForProvider(p.id);
    const cacheAge = cacheEntries.length > 0
      ? now - Math.min(...cacheEntries.map((e) => e.cachedAt))
      : null;
    const lastUpdate = h?.lastSuccessfulFetch ?? null;
    const providerRecord = engine.getProviderRecord(p.id);

    return {
      id: p.id,
      name: p.name,
      source: p.source,
      assetClass: Array.isArray(p.assetClass) ? p.assetClass.join(", ") : p.assetClass,
      type: p.providerType,
      priority: p.priority,
      enabled: p.enabled,
      status: h?.status ?? "unknown",
      latency: Math.round(h?.averageLatency ?? 0),
      health: Math.round(h?.successRate ?? 100),
      failures: h?.failureCount ?? 0,
      successRate: Math.round(h?.successRate ?? 100),
      totalRequests: h?.totalRequests ?? 0,
      cacheHitRate,
      cacheAge,
      ttlMs: p.cacheTtlMs,
      refreshIntervalMs: p.refreshIntervalMs,
      timeoutMs: p.timeoutMs,
      lastUpdate,
      lastErrorMessage: h?.lastErrorMessage ?? null,
      refreshStatus: providerRecord?.status ?? "unknown",
      refreshDuration: providerRecord?.refreshDuration ?? null,
    };
  });

  /* Scheduler */
  const metrics = engine.getMetrics();
  const scheduler = {
    status: metrics.status,
    uptimeMs: metrics.uptimeMs,
    startedAt: metrics.startedAt,
    queueSize: metrics.queueSize,
    activeJobs: metrics.activeJobs,
    pendingJobs: Math.max(0, metrics.queueSize - metrics.activeJobs),
    averageLatency: metrics.averageLatency,
    lastLatency: metrics.lastLatency,
    successfulRefreshCount: metrics.successfulRefreshCount,
    failedRefreshCount: metrics.failedRefreshCount,
    refreshFrequency: metrics.refreshFrequency,
    totalProviderRefreshes: metrics.totalProviderRefreshes,
    totalAssetRefreshes: metrics.totalAssetRefreshes,
    lastRefreshAt: metrics.lastRefreshAt,
    lastError: metrics.lastError,
  };

  const assets = engine.getAllAssetRecords();

  /* Decision intelligence — latest snapshot from repository */
  const latestSnapshot = repo.getLatest();
  const intelligence = latestSnapshot
    ? {
        asset: latestSnapshot.asset,
        timestamp: latestSnapshot.timestamp,
        executionDurationMs: latestSnapshot.executionDurationMs,
        origin: latestSnapshot.origin,
        decision: latestSnapshot.result.decision,
        confidence: latestSnapshot.result.confidence,
        conflicts: latestSnapshot.result.conflicts,
        scenario: latestSnapshot.result.scenario,
        risk: latestSnapshot.result.risk,
        evidence: latestSnapshot.result.evidence,
        aiSummary: latestSnapshot.result.aiSummary,
        providerHealth: latestSnapshot.providerHealth,
      }
    : (() => {
        const latest = globalDecisionHistory.getLatest();
        if (!latest) return null;
        return {
          asset: latest.asset,
          timestamp: latest.timestamp,
          executionDurationMs: null,
          origin: "manual" as const,
          decision: latest.decision,
          confidence: latest.confidence,
          conflicts: latest.conflicts,
          scenario: latest.scenario,
          risk: latest.risk,
          evidence: latest.evidence,
          aiSummary: null,
          providerHealth: {},
        };
      })();

  /* Timeline */
  const timeline = globalTimeline.getRecent(30);

  /* Decision history */
  const decisionHistory = globalDecisionHistory.getRecent(20).map((e) => ({
    id: e.id,
    asset: e.asset,
    timestamp: e.timestamp,
    action: e.decision.action,
    confidence: e.confidence.score,
    risk: e.risk.overallRisk,
    conflict: e.conflicts.score,
    scenario: e.scenario.mostLikely,
  }));

  /* Analytics */
  const repoSnapshots = repo.search({});
  const stats = repo.getStatistics();
  const decisionAnalytics = computeDecisionAnalytics(repoSnapshots);
  const providerAnalytics = computeProviderAnalytics(repoSnapshots);
  const evidenceAnalytics = computeEvidenceAnalytics(repoSnapshots);

  const analytics = {
    totalSnapshots: stats.totalSnapshots,
    totalAssets: stats.totalAssets,
    averageExecutionDuration: stats.averageExecutionDuration,
    snapshotsByAsset: stats.snapshotsByAsset,
    snapshotsByOrigin: stats.snapshotsByOrigin,
    averageConfidence: decisionAnalytics.averageConfidence,
    averageRisk: decisionAnalytics.averageRisk,
    averageConflict: decisionAnalytics.averageConflict,
    decisionDistribution: decisionAnalytics.decisionDistribution,
    confidenceDistribution: decisionAnalytics.confidenceDistribution,
    scenarioDistribution: decisionAnalytics.scenarioDistribution,
    riskDistribution: decisionAnalytics.riskDistribution,
    providerAnalytics,
    evidenceBreakdown: evidenceAnalytics.breakdownByCategory,
    overallBiasDistribution: evidenceAnalytics.overallBiasDistribution,
  };

  /* Log stats */
  const logStats = logger.getStats();

  return NextResponse.json({
    fetchedAt: new Date().toISOString(),
    providers,
    scheduler,
    assets,
    intelligence,
    timeline,
    decisionHistory,
    analytics,
    logStats,
  });
}
