import type { SchedulerMetricsSnapshot, SchedulerEngineStatus } from "./types";

export class SchedulerMetrics {
  private startedAt: number | null = null;
  private status: SchedulerEngineStatus = "stopped";
  private latencyWindow: number[] = [];
  private lastLatency = 0;
  private lastRefreshDuration = 0;
  private successfulRefreshCount = 0;
  private failedRefreshCount = 0;
  private totalProviderRefreshes = 0;
  private totalAssetRefreshes = 0;
  private lastRefreshAt: number | null = null;
  private lastError: string | null = null;

  markStart(): void {
    this.startedAt = Date.now();
    this.status = "running";
  }

  markStop(): void {
    this.status = "stopped";
  }

  markPause(): void {
    this.status = "paused";
  }

  markResume(): void {
    this.status = "running";
  }

  recordRefresh(type: "provider" | "asset", latency: number, duration: number, success: boolean, error?: string): void {
    this.lastLatency = latency;
    this.lastRefreshDuration = duration;
    this.lastRefreshAt = Date.now();

    if (type === "provider") this.totalProviderRefreshes++;
    else this.totalAssetRefreshes++;

    if (success) {
      this.successfulRefreshCount++;
      this.lastError = null;
    } else {
      this.failedRefreshCount++;
      this.lastError = error ?? "Unknown error";
    }

    this.latencyWindow.push(latency);
    if (this.latencyWindow.length > 100) this.latencyWindow.shift();
  }

  getAverageLatency(): number {
    if (this.latencyWindow.length === 0) return 0;
    return this.latencyWindow.reduce((a, b) => a + b, 0) / this.latencyWindow.length;
  }

  getRefreshFrequency(): number {
    if (!this.startedAt || this.totalProviderRefreshes === 0) return 0;
    const elapsed = Date.now() - this.startedAt;
    return this.totalProviderRefreshes / (elapsed / 60000);
  }

  snapshot(queueSize: number, activeJobs: number): SchedulerMetricsSnapshot {
    return {
      uptimeMs: this.startedAt ? Date.now() - this.startedAt : 0,
      startedAt: this.startedAt,
      status: this.status,
      averageLatency: this.getAverageLatency(),
      lastLatency: this.lastLatency,
      lastRefreshDuration: this.lastRefreshDuration,
      successfulRefreshCount: this.successfulRefreshCount,
      failedRefreshCount: this.failedRefreshCount,
      queueSize,
      activeJobs,
      refreshFrequency: this.getRefreshFrequency(),
      totalProviderRefreshes: this.totalProviderRefreshes,
      totalAssetRefreshes: this.totalAssetRefreshes,
      lastRefreshAt: this.lastRefreshAt,
      lastError: this.lastError,
    };
  }
}
