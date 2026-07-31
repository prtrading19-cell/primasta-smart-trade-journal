import { RequestManager } from "@/lib/research/infrastructure/RequestManager";

const FMP_BASE_URL = "https://financialmodelingprep.com/stable";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 0;

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
  params: Record<string, string> = {}
): Promise<T> {
  const apiKey = getApiKey();
  const url = new URL(`${FMP_BASE_URL}${endpoint}`);
  url.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const requestedSymbol = extractRequestedSymbol(endpoint, params);
  const startTime = Date.now();

  try {
    const response = await RequestManager.getInstance().fetch(
      url.toString(),
      `fmp-${endpoint.replace(/\//g, "-")}`,
      { timeoutMs: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES }
    );
    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const payloadSize = body.length;
      console.log(
        `[FMP] Endpoint: ${endpoint} | Symbol: ${requestedSymbol} | HTTP: ${response.status} | Duration: ${durationMs}ms | Size: ${payloadSize}B`
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
        `[FMP] Endpoint: ${endpoint} | Symbol: ${requestedSymbol} | HTTP: 200 | Duration: ${durationMs}ms | Size: ${payloadSize}B | Empty response`
      );
      return [] as unknown as T;
    }

    const rawData = JSON.parse(text);

    const errorMsg = detectFMPError(rawData);
    if (errorMsg) {
      console.log(
        `[FMP] Endpoint: ${endpoint} | Symbol: ${requestedSymbol} | HTTP: 200 | Duration: ${durationMs}ms | Size: ${payloadSize}B | API Error: ${errorMsg}`
      );
      throw new FMPError(`FMP API error on ${endpoint}: ${errorMsg}`, endpoint, 200);
    }

    const data: unknown =
      rawData && typeof rawData === "object" && "value" in rawData && Array.isArray((rawData as Record<string, unknown>).value)
        ? (rawData as Record<string, unknown>).value
        : rawData;

    console.log(
      `[FMP] Endpoint: ${endpoint} | Symbol: ${requestedSymbol} | HTTP: 200 | Duration: ${durationMs}ms | Size: ${payloadSize}B | OK`
    );

    return data as T;
  } catch (err) {
    const lastError = err instanceof Error ? err : new Error(String(err));
    throw lastError;
  }
}

export function nowISO(): string {
  return new Date().toISOString();
}
