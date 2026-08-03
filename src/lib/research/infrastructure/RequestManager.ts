import type { RequestPriority, RequestManagerStatus } from "./types";
import { ProviderLogger } from "./ProviderLogger";
import { getSharedSingleton } from "./singleton";

interface PendingRequest {
  resolve: (value: Response) => void;
  reject: (reason: unknown) => void;
  url: string;
  providerId: string;
  priority: RequestPriority;
  retryCount: number;
  maxRetries: number;
  timeoutMs: number;
  startTime: number;
}

export class RequestManager {
  private queue: PendingRequest[] = [];
  private activeCount = 0;
  private maxConcurrency = 6;
  private status: RequestManagerStatus = "idle";
  private baseBackoffMs = 1000;

  static getInstance(): RequestManager {
    return getSharedSingleton("RequestManager", () => new RequestManager());
  }

  setMaxConcurrency(max: number): void {
    this.maxConcurrency = max;
  }

  getStatus(): RequestManagerStatus {
    return this.status;
  }

  get queueLength(): number {
    return this.queue.length;
  }

  get activeRequestCount(): number {
    return this.activeCount;
  }

  pause(): void {
    this.status = "paused";
  }

  resume(): void {
    if (this.status === "paused") {
      this.status = "running";
      this.drainQueue();
    }
  }

  async fetch(
    url: string,
    providerId: string,
    options: {
      timeoutMs?: number;
      priority?: RequestPriority;
      maxRetries?: number;
      headers?: Record<string, string>;
      method?: string;
      body?: string;
    } = {}
  ): Promise<Response> {
    const {
      timeoutMs = 10000,
      priority = 2,
      maxRetries = 2,
      headers = {},
      method = "GET",
      body,
    } = options;

    return new Promise<Response>((resolve, reject) => {
      const entry: PendingRequest = {
        resolve,
        reject,
        url,
        providerId,
        priority,
        retryCount: 0,
        maxRetries,
        timeoutMs,
        startTime: Date.now(),
      };

      this.enqueue(entry);
    });
  }

  private enqueue(entry: PendingRequest): void {
    this.queue.push(entry);
    this.queue.sort((a, b) => a.priority - b.priority);

    if (this.status === "idle") {
      this.status = "running";
    }

    this.drainQueue();
  }

  private drainQueue(): void {
    while (this.queue.length > 0 && this.activeCount < this.maxConcurrency) {
      if (this.status === "paused") break;
      const entry = this.queue.shift();
      if (entry) {
        this.executeRequest(entry);
      }
    }

    if (this.activeCount === 0 && this.queue.length === 0) {
      this.status = "idle";
    }
  }

  private async executeRequest(entry: PendingRequest): Promise<void> {
    this.activeCount++;

    try {
      for (let attempt = 0; ; attempt++) {
        const startTime = Date.now();
        try {
          const response = await this.fetchWithTimeout(
            entry.url,
            entry.timeoutMs,
            entry.providerId
          );

          const latency = Date.now() - startTime;
          const logger = ProviderLogger.getInstance();
          logger.log({
            providerId: entry.providerId,
            asset: "unknown",
            timestamp: startTime,
            latency,
            success: response.ok,
            failureReason: response.ok ? null : `HTTP ${response.status}`,
            responseSize: 0,
            cacheHit: false,
            cacheMiss: true,
          });

          if (this.isRateLimited(response) && attempt < entry.maxRetries) {
            await this.backoff(attempt);
            continue;
          }

          entry.resolve(response);
          return;
        } catch (err) {
          const isTimeout = err instanceof DOMException && err.name === "AbortError";
          const errorMsg = err instanceof Error ? err.message : String(err);

          const logger = ProviderLogger.getInstance();
          logger.log({
            providerId: entry.providerId,
            asset: "unknown",
            timestamp: startTime,
            latency: Date.now() - startTime,
            success: false,
            failureReason: isTimeout ? `Timeout after ${entry.timeoutMs}ms` : errorMsg,
            responseSize: 0,
            cacheHit: false,
            cacheMiss: true,
          });

          if (attempt < entry.maxRetries && (isTimeout || this.isRetryable(err))) {
            await this.backoff(attempt);
            continue;
          }

          entry.reject(err);
          return;
        }
      }
    } finally {
      this.activeCount--;
      this.drainQueue();
    }
  }

  private async fetchWithTimeout(
    url: string,
    timeoutMs: number,
    providerId: string
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
      });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  private isRateLimited(response: Response): boolean {
    if (response.status === 429) return true;
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) return true;
    return false;
  }

  private isRetryable(err: unknown): boolean {
    if (err instanceof TypeError) return true;
    if (err instanceof DOMException && err.name === "AbortError") return true;
    return false;
  }

  private async backoff(retryCount: number): Promise<void> {
    const delay = this.baseBackoffMs * Math.pow(2, retryCount) + Math.random() * 500;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
