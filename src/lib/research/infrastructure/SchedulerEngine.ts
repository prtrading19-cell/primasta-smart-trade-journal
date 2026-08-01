import type { SchedulerEngineStatus, SchedulerMetricsSnapshot, RefreshPriority, AssetRefreshRecord, AssetRefreshStatus } from "./types";
import { ProviderRegistry } from "./ProviderRegistry";
import { ProviderCache } from "./ProviderCache";
import { ProviderHealthEngine } from "./ProviderHealthEngine";
import { ProviderLogger } from "./ProviderLogger";
import { RefreshQueue } from "./RefreshQueue";
import { DependencyGraph } from "./DependencyGraph";
import { SchedulerMetrics } from "./SchedulerMetrics";
import { SchedulerEvents } from "./SchedulerEvents";
import { CacheLifecycleLayer } from "./CacheLifecycleLayer";
import { ResearchRepository } from "../repository/ResearchRepository";
import { getSharedSingleton } from "./singleton";

export class SchedulerEngine {
  private status: SchedulerEngineStatus = "stopped";
  private mainInterval: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs = 10000;

  private queue = new RefreshQueue();
  private deps = new DependencyGraph();
  private metrics = new SchedulerMetrics();
  private events = new SchedulerEvents();
  private cacheLifecycle = new CacheLifecycleLayer();
  private assetRecords = new Map<string, AssetRefreshRecord>();
  private providerRecords = new Map<string, AssetRefreshRecord>();

  static getInstance(): SchedulerEngine {
    return getSharedSingleton("SchedulerEngine", () => new SchedulerEngine());
  }

  getStatus(): SchedulerEngineStatus {
    return this.status;
  }

  getMetrics(): SchedulerMetricsSnapshot {
    return this.metrics.snapshot(this.queue.size, this.queue.active);
  }

  getEvents(): SchedulerEvents {
    return this.events;
  }

  getDependencyGraph(): DependencyGraph {
    return this.deps;
  }

  getCacheLifecycle(): CacheLifecycleLayer {
    return this.cacheLifecycle;
  }

  getAssetRecord(assetId: string): AssetRefreshRecord | undefined {
    return this.assetRecords.get(assetId);
  }

  getAllAssetRecords(): AssetRefreshRecord[] {
    return Array.from(this.assetRecords.values());
  }

  getProviderRecord(providerId: string): AssetRefreshRecord | undefined {
    return this.providerRecords.get(providerId);
  }

  getAllProviderRecords(): AssetRefreshRecord[] {
    return Array.from(this.providerRecords.values());
  }

  getQueue(): RefreshQueue {
    return this.queue;
  }

  /* ── Lifecycle ── */

  start(): void {
    if (this.status === "running") return;

    this.status = "running";
    this.metrics.markStart();

    const cache = ProviderCache.getInstance();
    cache.startAutoCleanup();

    this.mainInterval = setInterval(() => this.tick(), this.intervalMs);

    this.warmAll();
  }

  stop(): void {
    this.status = "stopped";
    this.metrics.markStop();
    if (this.mainInterval) {
      clearInterval(this.mainInterval);
      this.mainInterval = null;
    }
    this.queue.clear();
  }

  pause(): void {
    if (this.status !== "running") return;
    this.status = "paused";
    this.metrics.markPause();
  }

  resume(): void {
    if (this.status !== "paused") return;
    this.status = "running";
    this.metrics.markResume();
  }

  /* ── Manual Refresh Controls ── */

  async runOnce(): Promise<void> {
    await this.processQueue(true);
  }

  async runProvider(providerId: string, priority: RefreshPriority = "normal"): Promise<void> {
    this.queue.enqueue("provider", providerId, priority);
    this.events.emit({ type: "refreshStart", timestamp: Date.now(), providerId });
    await this.processQueue(true);
  }

  async runAsset(assetId: string, priority: RefreshPriority = "normal"): Promise<void> {
    this.queue.enqueue("asset", assetId, priority);
    this.events.emit({ type: "refreshStart", timestamp: Date.now(), assetId });
    await this.processQueue(true);
  }

  async runAllAssets(priority: RefreshPriority = "normal"): Promise<void> {
    const registry = ProviderRegistry.getInstance();
    const assetClasses = new Set(registry.getAll().flatMap((p) =>
      Array.isArray(p.assetClass) ? p.assetClass : [p.assetClass]
    ));
    for (const assetClass of assetClasses) {
      this.queue.enqueue("asset", assetClass, priority);
    }
    await this.processQueue(true);
  }

  /* ── Queue Processing ── */

  private async tick(): Promise<void> {
    if (this.status !== "running") return;
    await this.enqueueScheduled();
    await this.processQueue();
  }

  private async enqueueScheduled(): Promise<void> {
    const registry = ProviderRegistry.getInstance();
    const now = Date.now();

    for (const provider of registry.getEnabled()) {
      const record = this.getOrCreateProviderRecord(provider.id);
      if (record.status === "refreshing") continue;

      const nextRefresh = (record.lastSuccess ?? 0) + provider.refreshIntervalMs;
      if (now >= nextRefresh && !this.queue.hasPending(provider.id)) {
        this.queue.enqueue("provider", provider.id, this.mapPriority(provider.priority));
      }
    }
  }

  private async processQueue(force = false): Promise<void> {
    while (force || this.status === "running") {
      const item = this.queue.dequeue();
      if (!item) break;

      try {
        if (item.type === "provider") {
          await this.refreshProvider(item.targetId);
          this.queue.complete(item.id);
        } else if (item.type === "asset") {
          await this.refreshAsset(item.targetId);
          this.queue.complete(item.id);
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.queue.complete(item.id, error);
        this.metrics.recordRefresh(item.type, 0, 0, false, error);
        this.events.emit({
          type: "refreshFailure",
          timestamp: Date.now(),
          providerId: item.type === "provider" ? item.targetId : undefined,
          assetId: item.type === "asset" ? item.targetId : undefined,
          error,
        });
      }
    }
  }

  /* ── Provider Refresh ── */

  private async refreshProvider(providerId: string): Promise<void> {
    const logger = ProviderLogger.getInstance();
    const health = ProviderHealthEngine.getInstance();
    const cache = ProviderCache.getInstance();
    const registry = ProviderRegistry.getInstance();
    const provider = registry.get(providerId);
    if (!provider) return;

    const record = this.getOrCreateProviderRecord(providerId);
    record.status = "refreshing";
    this.cacheLifecycle.markRefreshing(providerId);

    const start = Date.now();
    const execStart = Date.now();

    try {
      const { executeProvider } = await import("./ProviderExecution");
      const executors: Record<string, () => Promise<unknown>> = {
        "volatility-institutional": () => executeProvider("volatility-institutional", {}),
        "macro-institutional": () => executeProvider("macro-institutional", {}),
        "cot-institutional": () => executeProvider("cot-institutional", {}),
        "etf-institutional": () => executeProvider("etf-institutional", {}),
        "open-interest-institutional": () => executeProvider("open-interest-institutional", {}),
        "breadth-institutional": () => executeProvider("breadth-institutional", {}),
        "sectors-institutional": () => executeProvider("sectors-institutional", {}),
        "gold-price-twelve": () => executeProvider("gold-price-twelve", {}),
        "market-index-fmp": () => executeProvider("market-index-fmp", {}),
        "stock-quotes-twelve": () => executeProvider("stock-quotes-twelve", {}),
        "earnings-fmp": () => executeProvider("earnings-fmp", {}),
        "sectors-fmp": () => executeProvider("sectors-fmp", {}),
        "movers-fmp": () => executeProvider("movers-fmp", {}),
        "volatility-fmp": () => executeProvider("volatility-fmp", {}),
        "company-profiles-fmp": () => executeProvider("company-profiles-fmp", {}),
      };

      const executor = executors[providerId];
      if (executor) {
        await executor();
      }

      const latency = Date.now() - execStart;
      const duration = Date.now() - start;

      health.recordSuccess(providerId, latency);
      this.cacheLifecycle.markComplete(providerId, true);
      this.metrics.recordRefresh("provider", latency, duration, true);

      record.status = "fresh";
      record.lastRefresh = start;
      record.lastSuccess = start;
      record.consecutiveFailures = 0;
      record.refreshDuration = duration;

      const assetInfo = Array.isArray(provider.assetClass) ? provider.assetClass.join(",") : provider.assetClass;
      logger.log({
        providerId,
        asset: assetInfo,
        timestamp: start,
        latency,
        success: true,
        failureReason: null,
        responseSize: 0,
        cacheHit: false,
        cacheMiss: true,
      });

      this.events.emit({ type: "refreshComplete", timestamp: Date.now(), providerId, latency });

      const deps = this.deps.getDownstream(providerId);
      for (const depId of deps.providerIds) {
        this.cacheLifecycle.markStale(depId);
        this.deps.markStale(providerId);
      }

    } catch (err) {
      const duration = Date.now() - start;
      const error = err instanceof Error ? err.message : String(err);

      health.recordFailure(providerId, duration, error);
      this.cacheLifecycle.markComplete(providerId, false, error);
      this.metrics.recordRefresh("provider", duration, duration, false, error);

      record.status = "stale";
      record.lastFailure = start;
      record.lastError = error;
      record.consecutiveFailures++;

      logger.log({
        providerId,
        asset: Array.isArray(provider.assetClass) ? provider.assetClass.join(",") : provider.assetClass,
        timestamp: start,
        latency: duration,
        success: false,
        failureReason: error,
        responseSize: 0,
        cacheHit: false,
        cacheMiss: true,
      });

      this.events.emit({ type: "refreshFailure", timestamp: Date.now(), providerId, error });
      throw err;
    }
  }

  /* ── Asset Refresh ── */

  private async refreshAsset(assetId: string): Promise<void> {
    const record = this.getOrCreateAssetRecord(assetId);
    record.status = "refreshing";

    const start = Date.now();

    try {
      const { runFullAssetPipeline } = await import("../config/AssetPipelineRunner");
      const result = await runFullAssetPipeline(assetId as any);
      const duration = Date.now() - start;

      this.metrics.recordRefresh("asset", duration, duration, true);

      record.status = "fresh";
      record.lastRefresh = start;
      record.lastSuccess = start;
      record.consecutiveFailures = 0;
      record.refreshDuration = duration;

      this.events.emit({
        type: "refreshComplete",
        timestamp: Date.now(),
        assetId,
        latency: duration,
      });

      /* Save snapshot to ResearchRepository */
      const pipeline = result.pipelineResult;
      if (pipeline) {
        const { runDecisionIntelligence } = await import("../decision/DecisionIntelligenceEngine");
        const healthEngine = ProviderHealthEngine.getInstance();
        const allProviders = healthEngine.getAll();
        const totalLatencies = allProviders.reduce((s, p) => s + p.averageLatency, 0);
        const avgLatency = allProviders.length > 0 ? Math.round(totalLatencies / allProviders.length) : 0;
        const totalSuccess = allProviders.reduce((s, p) => s + p.successRate, 0);
        const avgSuccessRate = allProviders.length > 0 ? Math.round(totalSuccess / allProviders.length) : 100;

        const diResult = pipeline.decisionIntelligence ?? runDecisionIntelligence({
          asset: typeof assetId === "string" ? assetId : (assetId as any),
          drivers: pipeline.drivers ?? [],
          categories: pipeline.categories ?? [],
          institutional: pipeline.institutional ?? { bias: "Neutral" as const, confidence: 50, score: 50, summary: "" },
          technical: pipeline.technical ?? { bias: "Neutral" as const, confidence: 50, score: 50, summary: "" },
          bias: pipeline.bias ?? { overallBias: "Neutral" as const, overallScore: 50, confidence: 50, alignmentScore: 50, conflictScore: 0 },
          decision: pipeline.decision ?? { action: "WAIT" as const, confidence: 50, reasoning: ["No decision available"], riskRating: "Medium" as const },
          providerHealth: { successRate: avgSuccessRate, averageLatency: avgLatency },
        });

        const repo = ResearchRepository.getInstance();
        const providerVersions: Record<string, string> = {};
        const providerHealthSnap: Record<string, { successRate: number; averageLatency: number; lastFailure?: string }> = {};

        for (const p of allProviders) {
          providerVersions[p.providerId] = "1.0";
          providerHealthSnap[p.providerId] = {
            successRate: p.successRate,
            averageLatency: Math.round(p.averageLatency),
            lastFailure: p.lastErrorMessage ?? undefined,
          };
        }

        repo.saveSnapshot({
          id: `snap-${Date.now()}-${assetId.toString().replace(/[^a-zA-Z0-9]/g, "")}`,
          asset: assetId.toString(),
          timestamp: new Date().toISOString(),
          origin: "scheduler",
          executionDurationMs: duration,
          providerVersions,
          providerHealth: providerHealthSnap,
          result: diResult,
        });
      }

      return result as any;
    } catch (err) {
      const duration = Date.now() - start;
      const error = err instanceof Error ? err.message : String(err);

      this.metrics.recordRefresh("asset", duration, duration, false, error);

      record.status = "unavailable";
      record.lastFailure = start;
      record.lastError = error;
      record.consecutiveFailures++;

      this.events.emit({ type: "refreshFailure", timestamp: Date.now(), assetId, error });
      throw err;
    }
  }

  /* ── Background Cache Warming ── */

  private async warmAll(): Promise<void> {
    const registry = ProviderRegistry.getInstance();
    const cache = ProviderCache.getInstance();

    const sorted = registry.getEnabled().sort((a, b) => a.priority - b.priority);

    for (const provider of sorted) {
      const cacheKey = `exec:${provider.id}`;
      const cached = cache.get(cacheKey);
      if (cached.hit) continue;

      this.queue.enqueue("provider", provider.id, this.mapPriority(provider.priority));
    }

    const assetClasses = new Set(
      registry.getAll().flatMap((p) => (Array.isArray(p.assetClass) ? p.assetClass : [p.assetClass]))
    );
    for (const assetClass of assetClasses) {
      this.queue.enqueue("asset", assetClass, "low");
    }

    this.events.emit({ type: "refreshStart", timestamp: Date.now() });
    await this.processQueue();
  }

  /* ── Helpers ── */

  private getOrCreateProviderRecord(providerId: string): AssetRefreshRecord {
    let record = this.providerRecords.get(providerId);
    if (!record) {
      record = {
        assetId: providerId,
        status: "unavailable",
        lastRefresh: null,
        lastSuccess: null,
        lastFailure: null,
        lastError: null,
        refreshDuration: null,
        consecutiveFailures: 0,
      };
      this.providerRecords.set(providerId, record);
    }
    return record;
  }

  private getOrCreateAssetRecord(assetId: string): AssetRefreshRecord {
    let record = this.assetRecords.get(assetId);
    if (!record) {
      record = {
        assetId,
        status: "unavailable",
        lastRefresh: null,
        lastSuccess: null,
        lastFailure: null,
        lastError: null,
        refreshDuration: null,
        consecutiveFailures: 0,
      };
      this.assetRecords.set(assetId, record);
    }
    return record;
  }

  private mapPriority(providerPriority: number): RefreshPriority {
    if (providerPriority <= 2) return "critical";
    if (providerPriority <= 5) return "high";
    if (providerPriority <= 10) return "normal";
    return "low";
  }
}
