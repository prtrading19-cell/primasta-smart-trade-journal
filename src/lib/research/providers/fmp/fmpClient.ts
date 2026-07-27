const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";
const REQUEST_TIMEOUT_MS = 12000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export class FMPError extends Error {
  constructor(
    message: string,
    public readonly endpoint: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "FMPError";
  }
}

function getApiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new FMPError("FMP_API_KEY not configured", "config");
  return key;
}

function extractRequestedSymbol(endpoint: string, params: Record<string, string>): string {
  if (params.symbol) return params.symbol;
  const pathParts = endpoint.split("/");
  const lastPart = pathParts[pathParts.length - 1];
  if (lastPart && !lastPart.includes("?")) return lastPart;
  return endpoint;
}

function detectFMPError(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const obj = body as Record<string, unknown>;
  if (typeof obj["Error Message"] === "string" && obj["Error Message"].length > 0) {
    return obj["Error Message"];
  }
  if (typeof obj.error === "string" && obj.error.length > 0) {
    return obj.error;
  }
  if (typeof obj.code === "string" && obj.code !== "0") {
    return `FMP error code: ${obj.code}`;
  }
  return null;
}

export async function fmpFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
  retries = MAX_RETRIES
): Promise<T> {
  const apiKey = getApiKey();
  const url = new URL(`${FMP_BASE_URL}${endpoint}`);
  url.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const requestedSymbol = extractRequestedSymbol(endpoint, params);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const startTime = Date.now();

    try {
      const response = await fetch(url.toString(), {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const payloadSize = body.length;
        console.log(
          `[FMP] Endpoint: ${endpoint} | Symbol: ${requestedSymbol} | HTTP: ${response.status} | Duration: ${durationMs}ms | Size: ${payloadSize}B | Attempt: ${attempt + 1}/${retries + 1}`
        );
        if (/rate limit|credits|quota/i.test(body)) {
          throw new FMPError(`Rate limited on ${endpoint}`, endpoint, response.status);
        }
        throw new FMPError(
          `FMP returned ${response.status} for ${endpoint}: ${body.slice(0, 200)}`,
          endpoint,
          response.status
        );
      }

      const text = await response.text();
      const payloadSize = text.length;

      if (!text || text.trim() === "" || text.trim() === "[]") {
        console.log(
          `[FMP] Endpoint: ${endpoint} | Symbol: ${requestedSymbol} | HTTP: 200 | Duration: ${durationMs}ms | Size: ${payloadSize}B | Empty response | Attempt: ${attempt + 1}/${retries + 1}`
        );
        return [] as unknown as T;
      }

      const data = JSON.parse(text);

      const errorMsg = detectFMPError(data);
      if (errorMsg) {
        console.log(
          `[FMP] Endpoint: ${endpoint} | Symbol: ${requestedSymbol} | HTTP: 200 | Duration: ${durationMs}ms | Size: ${payloadSize}B | API Error: ${errorMsg} | Attempt: ${attempt + 1}/${retries + 1}`
        );
        throw new FMPError(`FMP API error on ${endpoint}: ${errorMsg}`, endpoint, 200);
      }

      console.log(
        `[FMP] Endpoint: ${endpoint} | Symbol: ${requestedSymbol} | HTTP: 200 | Duration: ${durationMs}ms | Size: ${payloadSize}B | OK | Attempt: ${attempt + 1}/${retries + 1}`
      );

      return data as T;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err instanceof Error ? err : new Error(String(err));

      if (err instanceof FMPError && err.statusCode === 429 && attempt < retries) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      if (err instanceof DOMException && err.name === "AbortError" && attempt < retries) {
        await delay(RETRY_DELAY_MS);
        continue;
      }
      if (attempt < retries) {
        await delay(RETRY_DELAY_MS);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new FMPError("Unknown error", endpoint);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function nowISO(): string {
  return new Date().toISOString();
}
