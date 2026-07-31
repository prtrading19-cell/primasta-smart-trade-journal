"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, AlertTriangle, CheckCircle, Clock, Database, XCircle, RefreshCw, Server, Zap, BarChart3, Shield, Layers, Filter, Download, Play, Square, Pause, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/format";
import { ProviderRegistry } from "@/lib/research/infrastructure/ProviderRegistry";
import { ProviderHealthEngine } from "@/lib/research/infrastructure/ProviderHealthEngine";
import { ProviderCache } from "@/lib/research/infrastructure/ProviderCache";
import { ProviderLogger } from "@/lib/research/infrastructure/ProviderLogger";
import { Scheduler } from "@/lib/research/infrastructure/Scheduler";
import { SchedulerEngine } from "@/lib/research/infrastructure/SchedulerEngine";
import { initializeProviderRegistry } from "@/lib/research/infrastructure/registerProviders";

interface ProviderDisplay {
  id: string;
  name: string;
  source: string;
  assetClass: string;
  type: string;
  status: string;
  latency: number;
  cacheAge: string;
  lastUpdate: string;
  health: number;
  errors: string;
  apiUsed: string;
  timeout: string;
  retryCount: number;
  cacheHitRate: string;
  refreshStatus: string;
}

interface AssetDisplay {
  assetId: string;
  status: string;
  lastRefresh: string;
  lastError: string;
  refreshDuration: string;
}

interface SchedulerDisplayMetrics {
  status: string;
  uptimeMs: number;
  averageLatency: number;
  lastLatency: number;
  successfulRefreshCount: number;
  failedRefreshCount: number;
  queueSize: number;
  activeJobs: number;
  totalProviderRefreshes: number;
  totalAssetRefreshes: number;
}

export default function ResearchInfrastructurePage() {
  const [providers, setProviders] = useState<ProviderDisplay[]>([]);
  const [logStats, setLogStats] = useState({ totalLogs: 0, successRate: 0, averageLatency: 0, cacheHitRate: 0, topErrors: [] as { reason: string; count: number }[] });
  const [healthSummary, setHealthSummary] = useState({ healthy: 0, degraded: 0, down: 0, unknown: 0 });
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAsset, setFilterAsset] = useState<string>("all");
  const [schedulerMetrics, setSchedulerMetrics] = useState<SchedulerDisplayMetrics | null>(null);
  const [assets, setAssets] = useState<AssetDisplay[]>([]);
  const [showScheduler, setShowScheduler] = useState(true);
  const [showAssets, setShowAssets] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [repoStats, setRepoStats] = useState<{ totalSnapshots: number; totalAssets: number; averageExecutionDuration: number; snapshotsByAsset: Record<string, number>; snapshotsByOrigin: Record<string, number> } | null>(null);
  const [decisionDist, setDecisionDist] = useState<Record<string, number> | null>(null);
  const [avgConfidence, setAvgConfidence] = useState<number>(0);
  const [avgRisk, setAvgRisk] = useState<number>(0);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const refresh = useCallback(() => {
    const registry = ProviderRegistry.getInstance();
    const health = ProviderHealthEngine.getInstance();
    const cache = ProviderCache.getInstance();
    const logger = ProviderLogger.getInstance();
    const scheduler = Scheduler.getInstance();
    const engine = SchedulerEngine.getInstance();

    const all = registry.getAll();
    const now = Date.now();

    const display: ProviderDisplay[] = all.map((p) => {
      const h = health.get(p.id);
      const logStatsForProvider = logger.getByProvider(p.id, 50);
      const hits = logStatsForProvider.filter((l) => l.cacheHit).length;
      const total = logStatsForProvider.length;
      const cacheHitRate = total > 0 ? Math.round((hits / total) * 100) : 0;
      const cacheEntries = cache.getEntriesForProvider(p.id);
      const cacheAge = cacheEntries.length > 0
        ? formatDuration(now - Math.min(...cacheEntries.map((e) => e.cachedAt)))
        : "No cache";
      const lastUpdate = h?.lastSuccessfulFetch
        ? formatTimeAgo(h.lastSuccessfulFetch)
        : "Never";
      const errors = h?.lastErrorMessage ?? "None";

      const providerRecord = engine.getProviderRecord(p.id);
      const refreshStatus = providerRecord?.status ?? "unknown";

      return {
        id: p.id,
        name: p.name,
        source: p.source,
        assetClass: Array.isArray(p.assetClass) ? p.assetClass.join(", ") : p.assetClass,
        type: p.providerType,
        status: h?.status ?? "unknown",
        latency: h?.averageLatency ?? 0,
        cacheAge,
        lastUpdate,
        health: Math.round(h?.successRate ?? 100),
        errors,
        apiUsed: p.source,
        timeout: `${p.timeoutMs}ms`,
        retryCount: h?.consecutiveFailures ?? 0,
        cacheHitRate: `${cacheHitRate}%`,
        refreshStatus,
      };
    });

    setProviders(display);
    setLogStats(logger.getStats());
    setHealthSummary(health.getStatusSummary());
    setSchedulerRunning(scheduler.isRunning());

    const metrics = engine.getMetrics();
    setSchedulerMetrics({
      status: metrics.status,
      uptimeMs: metrics.uptimeMs,
      averageLatency: metrics.averageLatency,
      lastLatency: metrics.lastLatency,
      successfulRefreshCount: metrics.successfulRefreshCount,
      failedRefreshCount: metrics.failedRefreshCount,
      queueSize: metrics.queueSize,
      activeJobs: metrics.activeJobs,
      totalProviderRefreshes: metrics.totalProviderRefreshes,
      totalAssetRefreshes: metrics.totalAssetRefreshes,
    });

    const assetRecords = engine.getAllAssetRecords();
    setAssets(assetRecords.map((r) => ({
      assetId: r.assetId,
      status: r.status,
      lastRefresh: r.lastRefresh ? formatTimeAgo(r.lastRefresh) : "Never",
      lastError: r.lastError ?? "None",
      refreshDuration: r.refreshDuration ? `${r.refreshDuration}ms` : "N/A",
    })));

    setLastRefresh(now);

    /* Fetch repository analytics */
    setAnalyticsLoading(true);
    fetch("/api/admin/repository?action=statistics")
      .then((r) => r.json())
      .then((data) => setRepoStats(data))
      .catch(() => {});
    fetch("/api/admin/repository?action=decision-analytics")
      .then((r) => r.json())
      .then((data) => {
        setDecisionDist(data.decisionDistribution ?? null);
        setAvgConfidence(data.averageConfidence ?? 0);
        setAvgRisk(data.averageRisk ?? 0);
      })
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, []);

  useEffect(() => {
    initializeProviderRegistry();
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  const filtered = providers.filter((p) => {
    if (filterType !== "all" && p.type !== filterType) return false;
    if (filterAsset !== "all" && !p.assetClass.includes(filterAsset)) return false;
    return true;
  });

  const types = Array.from(new Set(providers.map((p) => p.type))).sort();
  const assetClasses = Array.from(new Set(providers.flatMap((p) => p.assetClass.split(", ")))).sort();

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">PRIMASTA</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary">Research Infrastructure</h1>
          <p className="mt-1 text-sm text-text-muted">Provider Registry &middot; Health Engine &middot; Cache Layer &middot; Scheduler</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-card px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-border hover:text-text-primary"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard icon={Server} label="Total Providers" value={providers.length} />
        <SummaryCard icon={CheckCircle} label="Healthy" value={healthSummary.healthy} tone="profit" />
        <SummaryCard icon={AlertTriangle} label="Degraded / Down" value={healthSummary.degraded + healthSummary.down} tone={healthSummary.degraded + healthSummary.down > 0 ? "loss" : "profit"} />
        <SummaryCard icon={Activity} label="Total Requests" value={logStats.totalLogs} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard icon={Zap} label="Success Rate" value={`${logStats.successRate.toFixed(1)}%`} tone={logStats.successRate >= 95 ? "profit" : logStats.successRate >= 80 ? "warning" : "loss"} />
        <SummaryCard icon={Clock} label="Avg Latency" value={`${logStats.averageLatency.toFixed(0)}ms`} tone={logStats.averageLatency < 500 ? "profit" : logStats.averageLatency < 2000 ? "warning" : "loss"} />
        <SummaryCard icon={Database} label="Cache Hit Rate" value={logStats.cacheHitRate.toFixed(1) + "%"} tone={logStats.cacheHitRate >= 50 ? "profit" : "neutral"} />
        <SummaryCard icon={BarChart3} label="Scheduler" value={schedulerRunning ? "Running" : "Stopped"} tone={schedulerRunning ? "profit" : "warning"} />
      </div>

      {/* ── Research Analytics Panel ── */}
      {repoStats && repoStats.totalSnapshots > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-card">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex w-full items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-gold" />
              <h2 className="text-base font-bold text-text-primary">Research Analytics</h2>
              <span className="rounded bg-surface-panel px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">{repoStats.totalSnapshots} snapshots</span>
            </div>
            {showAnalytics ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
          </button>
          {showAnalytics && (
            <div className="border-t border-border-subtle px-5 pb-5 pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-surface-panel/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Research Runs</p>
                  <p className="mt-1 text-lg font-black text-text-primary">{repoStats.totalSnapshots}</p>
                </div>
                <div className="rounded-lg bg-surface-panel/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Average Confidence</p>
                  <p className={cn("mt-1 text-lg font-black", avgConfidence >= 70 ? "text-profit" : avgConfidence >= 50 ? "text-warning" : "text-loss")}>{avgConfidence}%</p>
                </div>
                <div className="rounded-lg bg-surface-panel/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Average Risk</p>
                  <p className={cn("mt-1 text-lg font-black", avgRisk <= 35 ? "text-profit" : avgRisk <= 55 ? "text-warning" : "text-loss")}>{avgRisk}/100</p>
                </div>
                <div className="rounded-lg bg-surface-panel/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Assets Tracked</p>
                  <p className="mt-1 text-lg font-black text-text-primary">{repoStats.totalAssets}</p>
                </div>
              </div>

              {decisionDist && Object.keys(decisionDist).length > 0 && (
                <div className="rounded-lg bg-surface-panel/50 p-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">Decision Distribution</p>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(decisionDist)
                      .sort(([, a], [, b]) => b - a)
                      .map(([action, count]) => {
                        const total = Object.values(decisionDist).reduce((s, c) => s + c, 0);
                        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
                        return (
                          <div key={action} className="flex items-center gap-2">
                            <span className={cn(
                              "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              (action === "STRONG BUY" || action === "BUY") && "bg-profit/10 text-profit",
                              (action === "STRONG SELL" || action === "SELL") && "bg-loss/10 text-loss",
                              action === "WAIT" && "bg-warning/10 text-warning"
                            )}>{action}</span>
                            <span className="text-sm font-bold text-text-primary">{count}</span>
                            <span className="text-xs text-text-muted">({pct}%)</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {repoStats.snapshotsByAsset && Object.keys(repoStats.snapshotsByAsset).length > 0 && (
                <div className="rounded-lg bg-surface-panel/50 p-4">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">Snapshots by Asset</p>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(repoStats.snapshotsByAsset)
                      .sort(([, a], [, b]) => b - a)
                      .map(([asset, count]) => (
                        <div key={asset} className="flex items-center gap-2">
                          <span className="rounded bg-surface-card px-2 py-0.5 text-xs font-medium text-text-primary">{asset}</span>
                          <span className="text-sm font-bold text-text-primary">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {schedulerMetrics && (
        <div className="rounded-xl border border-border-subtle bg-surface-card">
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            className="flex w-full items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-gold" />
              <h2 className="text-base font-bold text-text-primary">Scheduler Engine</h2>
              <span className={cn(
                "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                schedulerMetrics.status === "running" && "bg-profit/10 text-profit",
                schedulerMetrics.status === "paused" && "bg-warning/10 text-warning",
                schedulerMetrics.status === "stopped" && "bg-loss/10 text-loss"
              )}>{schedulerMetrics.status}</span>
            </div>
            {showScheduler ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
          </button>
          {showScheduler && (
            <div className="border-t border-border-subtle px-5 pb-5 pt-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-surface-panel/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Queue Size</p>
                  <p className="mt-1 text-lg font-black text-text-primary">{schedulerMetrics.queueSize}</p>
                </div>
                <div className="rounded-lg bg-surface-panel/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Active Jobs</p>
                  <p className="mt-1 text-lg font-black text-text-primary">{schedulerMetrics.activeJobs}</p>
                </div>
                <div className="rounded-lg bg-surface-panel/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Provider Refreshes</p>
                  <p className="mt-1 text-lg font-black text-text-primary">{schedulerMetrics.totalProviderRefreshes}</p>
                </div>
                <div className="rounded-lg bg-surface-panel/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Asset Refreshes</p>
                  <p className="mt-1 text-lg font-black text-text-primary">{schedulerMetrics.totalAssetRefreshes}</p>
                </div>
                <div className="rounded-lg bg-surface-panel/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Avg Latency</p>
                  <p className="mt-1 text-lg font-black text-text-primary">{schedulerMetrics.averageLatency.toFixed(0)}ms</p>
                </div>
                <div className="rounded-lg bg-surface-panel/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Last Latency</p>
                  <p className="mt-1 text-lg font-black text-text-primary">{schedulerMetrics.lastLatency.toFixed(0)}ms</p>
                </div>
                <div className="rounded-lg bg-surface-panel/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Successful</p>
                  <p className="mt-1 text-lg font-black text-profit">{schedulerMetrics.successfulRefreshCount}</p>
                </div>
                <div className="rounded-lg bg-surface-panel/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Failed</p>
                  <p className="mt-1 text-lg font-black text-loss">{schedulerMetrics.failedRefreshCount}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ControlButton
                  label="Start"
                  icon={Play}
                  onClick={async () => { setActionLoading("start"); await apiSchedulerAction("start"); refresh(); setActionLoading(null); }}
                  loading={actionLoading === "start"}
                  disabled={schedulerMetrics.status === "running"}
                  tone="profit"
                />
                <ControlButton
                  label="Pause"
                  icon={Pause}
                  onClick={async () => { setActionLoading("pause"); await apiSchedulerAction("pause"); refresh(); setActionLoading(null); }}
                  loading={actionLoading === "pause"}
                  disabled={schedulerMetrics.status !== "running"}
                  tone="warning"
                />
                <ControlButton
                  label="Resume"
                  icon={Play}
                  onClick={async () => { setActionLoading("resume"); await apiSchedulerAction("resume"); refresh(); setActionLoading(null); }}
                  loading={actionLoading === "resume"}
                  disabled={schedulerMetrics.status !== "paused"}
                  tone="profit"
                />
                <ControlButton
                  label="Stop"
                  icon={Square}
                  onClick={async () => { setActionLoading("stop"); await apiSchedulerAction("stop"); refresh(); setActionLoading(null); }}
                  loading={actionLoading === "stop"}
                  disabled={schedulerMetrics.status === "stopped"}
                  tone="loss"
                />
                <ControlButton
                  label="Run Once"
                  icon={RefreshCw}
                  onClick={async () => { setActionLoading("runOnce"); await apiSchedulerAction("runOnce"); refresh(); setActionLoading(null); }}
                  loading={actionLoading === "runOnce"}
                  disabled={schedulerMetrics.status !== "running"}
                  tone="neutral"
                />
                <ControlButton
                  label="Refresh All"
                  icon={ExternalLink}
                  onClick={async () => { setActionLoading("refreshAll"); await apiSchedulerAction("refreshAll"); refresh(); setActionLoading(null); }}
                  loading={actionLoading === "refreshAll"}
                  tone="neutral"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {assets.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-card">
          <button
            onClick={() => setShowAssets(!showAssets)}
            className="flex w-full items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-gold" />
              <h2 className="text-base font-bold text-text-primary">Asset Refresh Status</h2>
            </div>
            {showAssets ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
          </button>
          {showAssets && (
            <div className="border-t border-border-subtle">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle bg-surface-panel/50">
                      <Th>Asset</Th>
                      <Th>Status</Th>
                      <Th>Last Refresh</Th>
                      <Th>Duration</Th>
                      <Th>Last Error</Th>
                      <Th>Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((a) => (
                      <tr key={a.assetId} className="border-b border-border-subtle last:border-b-0 transition-colors hover:bg-surface-panel/30">
                        <Td><span className="font-bold">{a.assetId}</span></Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <StatusDotIcon status={a.status === "fresh" ? "healthy" : a.status === "refreshing" ? "degraded" : "down"} />
                            <span className={cn(
                              "text-xs font-bold uppercase tracking-wider",
                              a.status === "fresh" && "text-profit",
                              a.status === "refreshing" && "text-warning",
                              a.status === "stale" && "text-warning",
                              a.status === "unavailable" && "text-loss"
                            )}>{a.status}</span>
                          </div>
                        </Td>
                        <Td><span className="text-xs text-text-secondary">{a.lastRefresh}</span></Td>
                        <Td><span className="text-xs text-text-secondary">{a.refreshDuration}</span></Td>
                        <Td className="max-w-[200px]">
                          <span className={cn("text-xs", a.lastError !== "None" ? "text-loss" : "text-text-muted")}>
                            {a.lastError !== "None" ? truncate(a.lastError, 40) : "None"}
                          </span>
                        </Td>
                        <Td>
                          <button
                            onClick={async () => {
                              setActionLoading(`asset-${a.assetId}`);
                              await apiSchedulerAction("refreshAsset", { assetId: a.assetId });
                              refresh();
                              setActionLoading(null);
                            }}
                            disabled={actionLoading === `asset-${a.assetId}`}
                            className="flex items-center gap-1 rounded border border-border-subtle bg-surface-panel px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary transition-colors hover:border-border hover:text-text-primary disabled:opacity-50"
                          >
                            {actionLoading === `asset-${a.assetId}` ? "..." : "Refresh"}
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/50"
          >
            <option value="all">All Types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-text-muted" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Asset:</span>
          <select
            value={filterAsset}
            onChange={(e) => setFilterAsset(e.target.value)}
            className="rounded-lg border border-border-subtle bg-surface-card px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/50"
          >
            <option value="all">All Assets</option>
            {assetClasses.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <span className="text-xs text-text-muted">Last refreshed: {formatTimeAgo(lastRefresh)}</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-panel/50">
                <Th>Provider</Th>
                <Th>Source</Th>
                <Th>Asset</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Refresh</Th>
                <Th>Latency</Th>
                <Th>Cache Age</Th>
                <Th>Last Update</Th>
                <Th>Health %</Th>
                <Th>Errors</Th>
                <Th>Timeout</Th>
                <Th>Cache Hit</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border-subtle last:border-b-0 transition-colors hover:bg-surface-panel/30">
                  <Td>{p.name}</Td>
                  <Td><span className="rounded bg-surface-panel px-2 py-0.5 text-xs font-medium text-text-secondary">{p.source}</span></Td>
                  <Td><span className="text-xs text-text-secondary">{p.assetClass}</span></Td>
                  <Td><span className="rounded bg-surface-panel px-2 py-0.5 text-xs font-medium text-text-secondary">{p.type}</span></Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <StatusDotIcon status={p.status} />
                      <span className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        p.status === "healthy" && "text-profit",
                        p.status === "degraded" && "text-warning",
                        p.status === "down" && "text-loss",
                        p.status === "unknown" && "text-text-muted"
                      )}>{p.status}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      p.refreshStatus === "fresh" && "bg-profit/10 text-profit",
                      p.refreshStatus === "refreshing" && "bg-warning/10 text-warning",
                      p.refreshStatus === "stale" && "bg-warning/10 text-warning",
                      p.refreshStatus === "unavailable" && "bg-loss/10 text-loss",
                      p.refreshStatus === "unknown" && "bg-surface-panel text-text-muted"
                    )}>{p.refreshStatus}</span>
                  </Td>
                  <Td>
                    <span className={cn(
                      "text-xs font-medium",
                      p.latency < 500 ? "text-profit" : p.latency < 2000 ? "text-warning" : "text-loss"
                    )}>{p.latency.toFixed(0)}ms</span>
                  </Td>
                  <Td><span className="text-xs text-text-secondary">{p.cacheAge}</span></Td>
                  <Td><span className="text-xs text-text-secondary">{p.lastUpdate}</span></Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-panel">
                        <div className={cn(
                          "h-full rounded-full transition-all",
                          p.health >= 95 ? "bg-profit" : p.health >= 80 ? "bg-warning" : "bg-loss"
                        )} style={{ width: `${p.health}%` }} />
                      </div>
                      <span className={cn(
                        "text-xs font-bold",
                        p.health >= 95 ? "text-profit" : p.health >= 80 ? "text-warning" : "text-loss"
                      )}>{p.health}%</span>
                    </div>
                  </Td>
                  <Td className="max-w-[200px]">
                    <span className={cn(
                      "text-xs",
                      p.errors !== "None" ? "text-loss" : "text-text-muted"
                    )}>{p.errors !== "None" ? truncate(p.errors, 40) : "None"}</span>
                  </Td>
                  <Td><span className="text-xs text-text-secondary">{p.timeout}</span></Td>
                  <Td><span className={cn(
                    "text-xs font-medium",
                    parseInt(p.cacheHitRate) >= 50 ? "text-profit" : "text-text-muted"
                  )}>{p.cacheHitRate}</span></Td>
                  <Td>
                    <button
                      onClick={async () => {
                        setActionLoading(`provider-${p.id}`);
                        await apiSchedulerAction("refreshProvider", { providerId: p.id });
                        refresh();
                        setActionLoading(null);
                      }}
                      disabled={actionLoading === `provider-${p.id}`}
                      className="flex items-center gap-1 rounded border border-border-subtle bg-surface-panel px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary transition-colors hover:border-border hover:text-text-primary disabled:opacity-50"
                    >
                      {actionLoading === `provider-${p.id}` ? "..." : <RefreshCw className="h-3 w-3" />}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {logStats.topErrors.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-card p-5">
          <h3 className="mb-4 text-base font-bold text-text-primary">Top Errors</h3>
          <div className="space-y-2">
            {logStats.topErrors.map((e, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-surface-panel/50 px-4 py-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-loss" />
                  <span className="text-sm text-text-primary">{e.reason}</span>
                </div>
                <span className="rounded bg-loss/10 px-2 py-0.5 text-xs font-bold text-loss">{e.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

async function apiSchedulerAction(action: string, extra: Record<string, string> = {}) {
  try {
    await fetch("/api/admin/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
  } catch {
    // Silently handle API errors
  }
}

function ControlButton({ label, icon: Icon, onClick, loading, disabled, tone }: {
  label: string; icon: typeof Activity; onClick: () => void; loading: boolean; disabled?: boolean; tone: "profit" | "loss" | "warning" | "neutral";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40",
        tone === "profit" && "border-profit/20 bg-profit/10 text-profit hover:bg-profit/20",
        tone === "loss" && "border-loss/20 bg-loss/10 text-loss hover:bg-loss/20",
        tone === "warning" && "border-warning/20 bg-warning/10 text-warning hover:bg-warning/20",
        tone === "neutral" && "border-border-subtle bg-surface-panel text-text-secondary hover:border-border hover:text-text-primary"
      )}
    >
      {loading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function SummaryCard({ icon: Icon, label, value, tone = "neutral" }: { icon: typeof Activity; label: string; value: string | number; tone?: "profit" | "loss" | "warning" | "neutral" }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-5 transition-all hover:border-border">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">{label}</p>
        <span className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
          tone === "profit" && "border-profit/20 bg-profit/10 text-profit",
          tone === "loss" && "border-loss/20 bg-loss/10 text-loss",
          tone === "warning" && "border-warning/20 bg-warning/10 text-warning",
          tone === "neutral" && "border-border-subtle bg-surface-panel text-text-muted"
        )}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn(
        "mt-3 break-words text-xl font-black tracking-tight",
        tone === "profit" && "text-profit",
        tone === "loss" && "text-loss",
        tone === "warning" && "text-warning",
        tone === "neutral" && "text-text-primary"
      )}>{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 text-sm text-text-primary", className)}>{children}</td>;
}

function StatusDotIcon({ status }: { status: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={cn(
        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-50",
        status === "healthy" && "bg-profit",
        status === "degraded" && "bg-warning",
        status === "down" && "bg-loss",
        status === "unknown" && "bg-text-muted"
      )} />
      <span className={cn(
        "relative inline-flex h-2 w-2 rounded-full",
        status === "healthy" && "bg-profit",
        status === "degraded" && "bg-warning",
        status === "down" && "bg-loss",
        status === "unknown" && "bg-text-muted"
      )} />
    </span>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return "just now";
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h`;
  return `${Math.floor(ms / 86400000)}d`;
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  return formatDuration(diff);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "...";
}
