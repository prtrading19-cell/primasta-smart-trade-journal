import { RequestManager } from "@/lib/research/infrastructure/RequestManager";

const DEFAULT_TIMEOUT_MS = 10000;

export interface FetchOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  return RequestManager.getInstance().fetch(url, "shared-fetch-with-timeout", {
    timeoutMs: timeout,
    headers: options.headers,
  });
}
