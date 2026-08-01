import type { SchedulerJob } from "./types";
import { ProviderRegistry } from "./ProviderRegistry";
import { ProviderCache } from "./ProviderCache";
import { ProviderHealthEngine } from "./ProviderHealthEngine";
import { ProviderLogger } from "./ProviderLogger";
import { getSharedSingleton } from "./singleton";

export class Scheduler {
  private jobs = new Map<string, SchedulerJob>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private running = false;

  static getInstance(): Scheduler {
    return getSharedSingleton("Scheduler", () => new Scheduler());
  }

  registerJob(
    providerId: string,
    callback: () => Promise<void>,
    intervalMs?: number
  ): string {
    const registry = ProviderRegistry.getInstance();
    const provider = registry.get(providerId);
    if (!provider) throw new Error(`Provider ${providerId} not registered`);

    const id = `scheduler-${providerId}-${Date.now()}`;
    const now = Date.now();
    const effectiveInterval = intervalMs ?? provider.refreshIntervalMs;

    const job: SchedulerJob = {
      id,
      providerId,
      intervalMs: effectiveInterval,
      lastRun: null,
      nextRun: now + effectiveInterval,
      running: false,
      callback,
    };

    this.jobs.set(providerId, job);

    if (this.running) {
      this.startTimer(job);
    }

    return id;
  }

  unregisterJob(providerId: string): void {
    this.jobs.delete(providerId);
    this.stopTimer(providerId);
  }

  async runOnce(providerId: string): Promise<void> {
    const job = this.jobs.get(providerId);
    if (!job) return;
    if (job.running) return;

    job.running = true;
    const startTime = Date.now();
    const cache = ProviderCache.getInstance();
    const health = ProviderHealthEngine.getInstance();
    const logger = ProviderLogger.getInstance();
    const registry = ProviderRegistry.getInstance();
    const provider = registry.get(providerId);

    try {
      await job.callback();
      const latency = Date.now() - startTime;
      health.recordSuccess(providerId, latency);
      logger.log({
        providerId,
        asset: provider?.assetClass?.toString() ?? "unknown",
        timestamp: startTime,
        latency,
        success: true,
        failureReason: null,
        responseSize: 0,
        cacheHit: false,
        cacheMiss: true,
      });
      job.lastRun = startTime;
      job.nextRun = startTime + job.intervalMs;
    } catch (err) {
      const latency = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      health.recordFailure(providerId, latency, errorMsg);
      logger.log({
        providerId,
        asset: provider?.assetClass?.toString() ?? "unknown",
        timestamp: startTime,
        latency,
        success: false,
        failureReason: errorMsg,
        responseSize: 0,
        cacheHit: false,
        cacheMiss: true,
      });
    } finally {
      job.running = false;
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    for (const job of this.jobs.values()) {
      this.startTimer(job);
    }
  }

  stop(): void {
    this.running = false;
    for (const providerId of this.timers.keys()) {
      this.stopTimer(providerId);
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getJob(providerId: string): SchedulerJob | undefined {
    return this.jobs.get(providerId);
  }

  getAllJobs(): SchedulerJob[] {
    return Array.from(this.jobs.values());
  }

  private startTimer(job: SchedulerJob): void {
    this.stopTimer(job.providerId);

    const timer = setInterval(async () => {
      if (job.running) return;
      await this.runOnce(job.providerId);
    }, job.intervalMs);

    this.timers.set(job.providerId, timer);
  }

  private stopTimer(providerId: string): void {
    const timer = this.timers.get(providerId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(providerId);
    }
  }
}
