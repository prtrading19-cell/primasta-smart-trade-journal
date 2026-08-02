import { ProviderCache } from "./ProviderCache";

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === "object";
}

function markMetaStale(meta: Record<string, any> | undefined, staleError: string): void {
  if (!meta) return;
  meta.stale = true;
  if (meta.status !== "live") meta.status = "live";
  if (typeof meta.source === "string" && !meta.source.includes("cached snapshot")) {
    meta.source = `${meta.source} (cached snapshot)`;
  }
  meta.error = `Using previous verified snapshot (stale): ${staleError}`;
  if (!meta.lastUpdated) meta.lastUpdated = new Date().toISOString();
}

export function markSnapshotStale<T>(value: T, staleError: string): T {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (isRecord(item)) markMetaStale(item.meta, staleError);
    }
    return value;
  }
  if (isRecord(value)) {
    if ("success" in value && "data" in value && "meta" in value) {
      const wrapper = value as Record<string, any>;
      wrapper.success = true;
      markMetaStale(wrapper.meta, staleError);
      return value;
    }
    if ("meta" in value) markMetaStale(value.meta, staleError);
  }
  return value;
}

function readSnapshotData<T>(providerId: string): T | null {
  const cache = ProviderCache.getInstance();
  const hit = cache.getLastKnownGood<{ data: T }>(`exec:${providerId}`);
  if (!hit.hit || !hit.data) return null;
  const data = hit.data.data;
  return data === null || data === undefined ? null : data;
}

export interface SnapshotFallbackResult<T> {
  value: T | null;
  fromSnapshot: boolean;
}

export function applySnapshotFallback<T>(
  providerId: string,
  current: T | null | undefined,
  isLive: (value: T) => boolean,
  staleError: string
): SnapshotFallbackResult<T> {
  if (current !== null && current !== undefined && isLive(current)) {
    return { value: current, fromSnapshot: false };
  }

  const cached = readSnapshotData<unknown>(providerId);
  if (cached === null || cached === undefined) {
    return { value: current ?? null, fromSnapshot: false };
  }

  let data: T;
  if (isRecord(cached) && "success" in cached && "data" in cached) {
    const wrapper = cached as { success: boolean; data: T | null };
    if (wrapper.data === null || wrapper.data === undefined) {
      return { value: current ?? null, fromSnapshot: false };
    }
    data = wrapper.data;
  } else {
    data = cached as T;
  }

  markSnapshotStale(data, staleError);
  return { value: data, fromSnapshot: true };
}
