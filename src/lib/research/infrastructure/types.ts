export type AssetClass = "gold" | "us100" | "forex" | "crypto" | "commodities" | "indices";
export type ProviderType = "market-data" | "volatility" | "breadth" | "sectors" | "macro" | "cot" | "etf" | "open-interest" | "earnings" | "profiles";
export type SchedulerEngineStatus = "running" | "paused" | "stopped";
export type RefreshPriority = "critical" | "high" | "normal" | "low";
export type AssetRefreshStatus = "fresh" | "refreshing" | "stale" | "unavailable";
export type CacheEntryStatus = "valid" | "expired" | "stale" | "refreshing" | "error";

export interface ProviderRegistration {
  id: string;
  name: string;
  assetClass: AssetClass | AssetClass[];
  providerType: ProviderType;
  priority: number;
  source: string;
  refreshIntervalMs: number;
  timeoutMs: number;
  cacheTtlMs: number;
  enabled: boolean;
  dependsOn?: string[];
}

export interface CacheEntry<T = unknown> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  ttlMs: number;
  providerId: string;
  stale: boolean;
  refreshing: boolean;
  lastFailure: string | null;
  consecutiveFailures: number;
}

export interface CacheLifecycleMetadata {
  providerId: string;
  status: CacheEntryStatus;
  age: number;
  ttlMs: number;
  expiresAt: number;
  expiresIn: number;
  lastRefresh: number | null;
  lastFailure: string | null;
  consecutiveFailures: number;
  refreshing: boolean;
}

export interface HealthRecord {
  providerId: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  latency: number;
  lastSuccessfulFetch: number | null;
  lastFailedFetch: number | null;
  lastErrorMessage: string | null;
  successCount: number;
  failureCount: number;
  successRate: number;
  uptimePercent: number;
  consecutiveFailures: number;
  averageLatency: number;
  totalRequests: number;
  lastChecked: number;
}

export interface ProviderLogEntry {
  providerId: string;
  asset: AssetClass | string;
  timestamp: number;
  latency: number;
  success: boolean;
  failureReason: string | null;
  responseSize: number;
  cacheHit: boolean;
  cacheMiss: boolean;
}

export enum RequestPriority {
  Critical = 0,
  High = 1,
  Normal = 2,
  Low = 3,
}

export interface RequestQueueItem {
  id: string;
  providerId: string;
  url: string;
  options: RequestInit;
  priority: RequestPriority;
  retryCount: number;
  maxRetries: number;
  timeoutMs: number;
  resolve: (value: Response) => void;
  reject: (reason: unknown) => void;
  createdAt: number;
}

export type RequestManagerStatus = "idle" | "running" | "paused" | "error";

export interface SchedulerJob {
  id: string;
  providerId: string;
  intervalMs: number;
  lastRun: number | null;
  nextRun: number;
  running: boolean;
  callback: () => Promise<void>;
}

export interface RefreshQueueItem {
  id: string;
  type: "provider" | "asset";
  targetId: string;
  priority: RefreshPriority;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
}

export interface DependencyEdge {
  from: string;
  to: string;
  kind: "provider" | "asset";
}

export interface SchedulerMetricsSnapshot {
  uptimeMs: number;
  startedAt: number | null;
  status: SchedulerEngineStatus;
  averageLatency: number;
  lastLatency: number;
  lastRefreshDuration: number;
  successfulRefreshCount: number;
  failedRefreshCount: number;
  queueSize: number;
  activeJobs: number;
  refreshFrequency: number;
  totalProviderRefreshes: number;
  totalAssetRefreshes: number;
  lastRefreshAt: number | null;
  lastError: string | null;
}

export type SchedulerEventType =
  | "refreshStart"
  | "refreshComplete"
  | "refreshFailure"
  | "cacheHit"
  | "cacheMiss"
  | "retry"
  | "providerUnavailable";

export interface SchedulerEvent {
  type: SchedulerEventType;
  timestamp: number;
  providerId?: string;
  assetId?: string;
  latency?: number;
  error?: string;
  retryCount?: number;
}

export type SchedulerEventHandler = (event: SchedulerEvent) => void;

export interface AssetRefreshRecord {
  assetId: string;
  status: AssetRefreshStatus;
  lastRefresh: number | null;
  lastSuccess: number | null;
  lastFailure: number | null;
  lastError: string | null;
  refreshDuration: number | null;
  consecutiveFailures: number;
}
