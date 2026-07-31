import type { ProviderMeta } from "@/types/institutional";
import { buildProviderMeta } from "@/types/institutional";

export interface ProviderResult<T> {
  success: boolean;
  data: T | null;
  meta: ProviderMeta;
  error?: string;
}

export function buildSuccessResult<T>(
  data: T,
  source: string
): ProviderResult<T> {
  return {
    success: true,
    data,
    meta: buildProviderMeta(source, "live"),
  };
}

export function buildUnavailableResult<T>(
  source: string,
  error: string
): ProviderResult<T> {
  return {
    success: false,
    data: null,
    meta: buildProviderMeta(source, "unavailable", error),
    error,
  };
}
