import type { CacheEntryStatus, CacheLifecycleMetadata } from "./types";
import { ProviderCache } from "./ProviderCache";

export class CacheLifecycleLayer {
  private cache = ProviderCache.getInstance();
  private staleMarkers = new Map<string, { stale: boolean; refreshing: boolean; lastFailure: string | null; consecutiveFailures: number }>();

  markStale(providerId: string): void {
    for (const entry of this.cache.getEntriesForProvider(providerId)) {
      const key = this.findKeyForProviderEntry(entry);
      if (key) {
        const meta = this.getOrCreateMeta(providerId);
        meta.stale = true;
      }
    }
  }

  markRefreshing(providerId: string): void {
    const meta = this.getOrCreateMeta(providerId);
    meta.refreshing = true;
  }

  markComplete(providerId: string, success: boolean, error?: string): void {
    const meta = this.getOrCreateMeta(providerId);
    meta.refreshing = false;
    if (success) {
      meta.stale = false;
      meta.lastFailure = null;
      meta.consecutiveFailures = 0;
    } else {
      meta.lastFailure = error ?? "Unknown error";
      meta.consecutiveFailures++;
    }
  }

  getLifecycle(providerId: string): CacheLifecycleMetadata {
    const entries = this.cache.getEntriesForProvider(providerId);
    const meta = this.getOrCreateMeta(providerId);
    const now = Date.now();

    const sorted = entries.sort((a, b) => b.cachedAt - a.cachedAt);
    const latest = sorted[0];

    let status: CacheEntryStatus = "valid";
    if (meta.refreshing) {
      status = "refreshing";
    } else if (meta.consecutiveFailures >= 3) {
      status = "error";
    } else if (meta.stale) {
      status = "stale";
    } else if (!latest || now > latest.expiresAt) {
      status = "expired";
    }

    return {
      providerId,
      status,
      age: latest ? now - latest.cachedAt : 0,
      ttlMs: latest?.ttlMs ?? 0,
      expiresAt: latest?.expiresAt ?? 0,
      expiresIn: latest ? latest.expiresAt - now : 0,
      lastRefresh: latest?.cachedAt ?? null,
      lastFailure: meta.lastFailure,
      consecutiveFailures: meta.consecutiveFailures,
      refreshing: meta.refreshing,
    };
  }

  getAllLifecycles(providerIds: string[]): CacheLifecycleMetadata[] {
    return providerIds.map((id) => this.getLifecycle(id));
  }

  private getOrCreateMeta(providerId: string) {
    let meta = this.staleMarkers.get(providerId);
    if (!meta) {
      meta = { stale: false, refreshing: false, lastFailure: null, consecutiveFailures: 0 };
      this.staleMarkers.set(providerId, meta);
    }
    return meta;
  }

  private findKeyForProviderEntry(target: { providerId: string; cachedAt: number }): string | null {
    const cache = (this.cache as any).cache as Map<string, { providerId: string; cachedAt: number }>;
    for (const [key, entry] of cache.entries()) {
      if (entry.providerId === target.providerId && entry.cachedAt === target.cachedAt) {
        return key;
      }
    }
    return null;
  }
}
