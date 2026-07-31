import type { HealthRecord } from "./types";
import { ProviderRegistry } from "./ProviderRegistry";

export class ProviderHealthEngine {
  private static instance: ProviderHealthEngine;
  private health = new Map<string, HealthRecord>();
  private latencyWindow: number[] = [];

  static getInstance(): ProviderHealthEngine {
    if (!ProviderHealthEngine.instance) {
      ProviderHealthEngine.instance = new ProviderHealthEngine();
    }
    return ProviderHealthEngine.instance;
  }

  recordSuccess(providerId: string, latency: number): void {
    const record = this.getOrCreate(providerId);
    record.status = "healthy";
    record.latency = latency;
    record.lastSuccessfulFetch = Date.now();
    record.successCount++;
    record.consecutiveFailures = 0;
    record.lastErrorMessage = null;
    record.totalRequests++;
    record.lastChecked = Date.now();
    this.recalculateAverages(record);
    this.latencyWindow.push(latency);
    if (this.latencyWindow.length > 100) this.latencyWindow.shift();
  }

  recordFailure(providerId: string, latency: number, error: string): void {
    const record = this.getOrCreate(providerId);
    record.status = "degraded";
    record.latency = latency;
    record.lastFailedFetch = Date.now();
    record.failureCount++;
    record.consecutiveFailures++;
    record.lastErrorMessage = error;
    record.totalRequests++;
    record.lastChecked = Date.now();

    if (record.consecutiveFailures >= 5) {
      record.status = "down";
    }

    this.recalculateAverages(record);
  }

  private getOrCreate(providerId: string): HealthRecord {
    let record = this.health.get(providerId);
    if (!record) {
      record = {
        providerId,
        status: "unknown",
        latency: 0,
        lastSuccessfulFetch: null,
        lastFailedFetch: null,
        lastErrorMessage: null,
        successCount: 0,
        failureCount: 0,
        successRate: 100,
        uptimePercent: 100,
        consecutiveFailures: 0,
        averageLatency: 0,
        totalRequests: 0,
        lastChecked: Date.now(),
      };
      this.health.set(providerId, record);
    }
    return record;
  }

  private recalculateAverages(record: HealthRecord): void {
    const total = record.successCount + record.failureCount;
    record.successRate = total > 0 ? (record.successCount / total) * 100 : 100;
    record.uptimePercent = record.successRate;
    if (this.latencyWindow.length > 0) {
      record.averageLatency =
        this.latencyWindow.reduce((a, b) => a + b, 0) / this.latencyWindow.length;
    }
  }

  get(providerId: string): HealthRecord | undefined {
    return this.health.get(providerId);
  }

  getAll(): HealthRecord[] {
    const registry = ProviderRegistry.getInstance();
    return registry
      .getAll()
      .map((p) => this.health.get(p.id) ?? this.getOrCreate(p.id))
      .sort((a, b) => {
        const order = { healthy: 0, degraded: 1, unknown: 2, down: 3 };
        return (order[a.status] ?? 0) - (order[b.status] ?? 0);
      });
  }

  getStatusSummary(): { healthy: number; degraded: number; down: number; unknown: number } {
    const summary = { healthy: 0, degraded: 0, down: 0, unknown: 0 };
    for (const record of this.health.values()) {
      summary[record.status]++;
    }
    return summary;
  }

  reset(providerId: string): void {
    this.health.delete(providerId);
  }

  resetAll(): void {
    this.health.clear();
    this.latencyWindow = [];
  }
}
