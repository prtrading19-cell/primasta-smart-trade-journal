import type { ProviderMeta } from "@/types/institutional";
import { buildProviderMeta } from "@/types/institutional";
import type { ProviderResult } from "./providerResult";
import { buildUnavailableResult } from "./providerResult";

const RATE_LIMIT_STATUS_CODES = new Set([429, 403]);

const RATE_LIMIT_PATTERNS = [
  /rate\s*limit/i,
  /limit\s*reach/i,
  /too\s*many\s*requests/i,
  /quota/i,
  /credits/i,
  /upgrade\s+your\s+plan/i,
  /plan\s*limit/i,
];

export interface ProviderLimitation {
  isLimitation: boolean;
  reason?: string;
}

export function classifyProviderFailure(source: string, err: unknown): ProviderLimitation {
  if (err instanceof Error) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode;
    if (statusCode !== undefined && RATE_LIMIT_STATUS_CODES.has(statusCode)) {
      return { isLimitation: true, reason: `${source} rate limit (HTTP ${statusCode})` };
    }
  }

  const message = err instanceof Error ? err.message : String(err ?? "");
  if (message.includes(`HTTP 429`)) {
    return { isLimitation: true, reason: `${source} rate limit (HTTP 429)` };
  }
  if (message.includes(`HTTP 403`)) {
    return { isLimitation: true, reason: `${source} forbidden (HTTP 403)` };
  }

  for (const pattern of RATE_LIMIT_PATTERNS) {
    if (pattern.test(message)) {
      return { isLimitation: true, reason: message.slice(0, 300) };
    }
  }

  return { isLimitation: false };
}

export function buildProviderLimitationResult<T>(
  source: string,
  error: string
): ProviderResult<T> {
  return {
    success: false,
    data: null,
    meta: buildProviderMeta(source, "unavailable", `Unavailable (Provider Limitation): ${error}`),
    error: `Unavailable (Provider Limitation): ${error}`,
  };
}

export function buildProviderLimitationError(source: string, error: string): string {
  return `Unavailable (Provider Limitation): ${error}`;
}

export function toUnavailableResult<T>(
  source: string,
  err: unknown,
  prefix: string
): ProviderResult<T> {
  const classification = classifyProviderFailure(source, err);
  if (classification.isLimitation) {
    return buildProviderLimitationResult(source, classification.reason ?? String(err));
  }
  const msg = err instanceof Error ? err.message : String(err ?? "Unknown error");
  return buildUnavailableResult(source, `${prefix}: ${msg}`);
}

export function buildProviderLimitationMeta(
  source: string,
  error: string
): ProviderMeta {
  return buildProviderMeta(source, "unavailable", `Unavailable (Provider Limitation): ${error}`);
}
