export type ProviderStatus = "live" | "delayed" | "unavailable" | "error";

export interface ProviderMeta {
  source: string;
  status: ProviderStatus;
  timestamp: string;
  latency: number;
  error?: string;
  lastSuccessfulFetch?: string;
}

export function buildProviderMeta(
  source: string,
  status: ProviderStatus,
  error?: string,
  latency?: number
): ProviderMeta {
  const now = new Date().toISOString();
  return {
    source,
    status,
    timestamp: now,
    latency: latency ?? 0,
    ...(error ? { error } : {}),
    lastSuccessfulFetch: status === "live" ? now : undefined,
  };
}
