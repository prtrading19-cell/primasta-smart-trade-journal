import type { CacheEntry } from "./types";
import { getSharedSingleton } from "./singleton";

export class ProviderCache {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  static getInstance(): ProviderCache {
    return getSharedSingleton("ProviderCache", () => new ProviderCache());
  }

  startAutoCleanup(intervalMs = 60000): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => this.evictExpired(), intervalMs);
  }

  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  get<T>(key: string): { hit: boolean; data: T | null } {
    const entry = this.cache.get(key);
    if (!entry) {
      return { hit: false, data: null };
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return { hit: false, data: null };
    }
    return { hit: true, data: entry.data as T };
  }

  set<T>(key: string, data: T, ttlMs: number, providerId: string): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      cachedAt: now,
      expiresAt: now + ttlMs,
      ttlMs,
      providerId,
      stale: false,
      refreshing: false,
      lastFailure: null,
      consecutiveFailures: 0,
    });
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidateByProvider(providerId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.providerId === providerId) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  getStats(): { providerId: string; entryCount: number; oldest: number; newest: number }[] {
    const stats = new Map<string, { count: number; oldest: number; newest: number }>();
    for (const entry of this.cache.values()) {
      const existing = stats.get(entry.providerId) ?? { count: 0, oldest: Infinity, newest: 0 };
      existing.count++;
      existing.oldest = Math.min(existing.oldest, entry.cachedAt);
      existing.newest = Math.max(existing.newest, entry.cachedAt);
      stats.set(entry.providerId, existing);
    }
    return Array.from(stats.entries()).map(([providerId, s]) => ({
      providerId,
      entryCount: s.count,
      oldest: s.oldest,
      newest: s.newest,
    }));
  }

  getEntriesForProvider(providerId: string): CacheEntry[] {
    const entries: CacheEntry[] = [];
    for (const entry of this.cache.values()) {
      if (entry.providerId === providerId) {
        entries.push(entry);
      }
    }
    return entries;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
