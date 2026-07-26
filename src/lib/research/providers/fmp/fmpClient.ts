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

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text().catch(() => "");
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
      if (!text || text.trim() === "" || text.trim() === "[]") {
        return [] as unknown as T;
      }

      const data = JSON.parse(text) as T;
      return data;
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
