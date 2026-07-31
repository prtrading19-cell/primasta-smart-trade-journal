import type { ProviderLogEntry } from "./types";

export class ProviderLogger {
  private static instance: ProviderLogger;
  private logs: ProviderLogEntry[] = [];
  private maxLogs = 10000;

  static getInstance(): ProviderLogger {
    if (!ProviderLogger.instance) {
      ProviderLogger.instance = new ProviderLogger();
    }
    return ProviderLogger.instance;
  }

  log(entry: ProviderLogEntry): void {
    this.logs.push({ ...entry });
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }
  }

  getRecent(count = 50): ProviderLogEntry[] {
    return this.logs.slice(-count).reverse();
  }

  getByProvider(providerId: string, count = 20): ProviderLogEntry[] {
    return this.logs
      .filter((l) => l.providerId === providerId)
      .slice(-count)
      .reverse();
  }

  getByAsset(asset: string, count = 20): ProviderLogEntry[] {
    return this.logs
      .filter((l) => l.asset === asset)
      .slice(-count)
      .reverse();
  }

  getFailures(count = 20): ProviderLogEntry[] {
    return this.logs
      .filter((l) => !l.success)
      .slice(-count)
      .reverse();
  }

  getStats(): {
    totalLogs: number;
    successRate: number;
    averageLatency: number;
    cacheHitRate: number;
    topErrors: { reason: string; count: number }[];
  } {
    if (this.logs.length === 0) {
      return { totalLogs: 0, successRate: 100, averageLatency: 0, cacheHitRate: 0, topErrors: [] };
    }

    const successes = this.logs.filter((l) => l.success).length;
    const cacheHits = this.logs.filter((l) => l.cacheHit).length;
    const totalLatency = this.logs.reduce((sum, l) => sum + l.latency, 0);
    const errorMap = new Map<string, number>();

    for (const l of this.logs) {
      if (!l.success && l.failureReason) {
        errorMap.set(l.failureReason, (errorMap.get(l.failureReason) ?? 0) + 1);
      }
    }

    const topErrors = Array.from(errorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    return {
      totalLogs: this.logs.length,
      successRate: (successes / this.logs.length) * 100,
      averageLatency: totalLatency / this.logs.length,
      cacheHitRate: (cacheHits / this.logs.length) * 100,
      topErrors,
    };
  }

  clear(): void {
    this.logs = [];
  }
}
