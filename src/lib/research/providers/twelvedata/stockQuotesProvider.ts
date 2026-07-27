import type { US100MegaCapStock, US100DataMeta } from "@/types/us100";
import { US100_MEGA_CAP_SYMBOLS, type US100MegaCapSymbol } from "@/types/us100";

const TD_BASE_URL = "https://api.twelvedata.com";
const REQUEST_TIMEOUT_MS = 12000;

export class TwelveDataError extends Error {
  constructor(message: string, public readonly endpoint: string, public readonly statusCode?: number) {
    super(message);
    this.name = "TwelveDataError";
  }
}

function getApiKey(): string {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) throw new TwelveDataError("TWELVE_DATA_API_KEY not configured", "config");
  return key;
}

interface TDQuote {
  symbol: string;
  name: string;
  close: string;
  change: string;
  percent_change: string;
  high: string;
  low: string;
  open: string;
  previous_close: string;
  volume: string;
}

function detectTDError(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const obj = body as Record<string, unknown>;
  if (obj.status === "error" && typeof obj.message === "string") {
    return obj.message;
  }
  if (typeof obj.code === "number" && obj.code !== 200) {
    return `Twelve Data error code: ${obj.code} — ${typeof obj.message === "string" ? obj.message : "Unknown"}`;
  }
  if (typeof obj.message === "string" && /api key|invalid|not found/i.test(obj.message)) {
    return obj.message;
  }
  return null;
}

export async function fetchUS100StockQuotes(): Promise<US100MegaCapStock[]> {
  const timestamp = new Date().toISOString();
  const symbols = US100_MEGA_CAP_SYMBOLS.join(",");
  const startTime = Date.now();

  try {
    const apiKey = getApiKey();
    const url = new URL(`${TD_BASE_URL}/quote`);
    url.searchParams.set("symbol", symbols);
    url.searchParams.set("apikey", apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url.toString(), { cache: "no-store", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.log(
        `[Twelve Data] Endpoint: /quote | Symbol: ${symbols} | HTTP: ${response.status} | Duration: ${durationMs}ms | Size: ${body.length}B | Error: ${body.slice(0, 200)}`
      );
      throw new TwelveDataError(`Twelve Data returned ${response.status}: ${body.slice(0, 200)}`, "quote", response.status);
    }

    const text = await response.text();
    const payloadSize = text.length;
    const data = JSON.parse(text);

    const errorMsg = detectTDError(data);
    if (errorMsg) {
      console.log(
        `[Twelve Data] Endpoint: /quote | Symbol: ${symbols} | HTTP: 200 | Duration: ${durationMs}ms | Size: ${payloadSize}B | API Error: ${errorMsg}`
      );
      throw new TwelveDataError(`Twelve Data API error: ${errorMsg}`, "quote", 200);
    }

    const quotes: TDQuote[] = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : [];

    if (quotes.length === 0) {
      console.log(
        `[Twelve Data] Endpoint: /quote | Symbol: ${symbols} | HTTP: 200 | Duration: ${durationMs}ms | Size: ${payloadSize}B | Status: NO_DATA | Reason: Empty response`
      );
      return buildUnavailableQuotes(timestamp, "No data returned from Twelve Data");
    }

    const quoteMap = new Map<string, TDQuote>();
    for (const q of quotes) {
      if (q.symbol) quoteMap.set(q.symbol, q);
    }

    const result = US100_MEGA_CAP_SYMBOLS.map((symbol) => {
      const q = quoteMap.get(symbol);
      if (!q) return buildSingleUnavailable(symbol, timestamp, "No quote data for symbol");

      return {
        symbol,
        name: q.name || symbol,
        price: parseNum(q.close),
        change: parseNum(q.change),
        changePercent: parseNum(q.percent_change),
        marketCap: 0,
        sector: "",
        industry: "",
        volume: parseNum(q.volume),
        high: parseNum(q.high),
        low: parseNum(q.low),
        previousClose: parseNum(q.previous_close),
        timestamp,
        meta: buildMeta("live", "Twelve Data", timestamp),
      };
    });

    const liveCount = result.filter((r) => r.meta.status === "live").length;
    const unavailCount = result.filter((r) => r.meta.status === "unavailable").length;
    console.log(
      `[Twelve Data] Endpoint: /quote | Symbol: ${symbols} | HTTP: 200 | Duration: ${durationMs}ms | Size: ${payloadSize}B | Status: LIVE | Live: ${liveCount} | Unavailable: ${unavailCount}`
    );

    return result;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof TwelveDataError ? err.message : err instanceof Error ? err.message : "Unknown error";
    const statusCode = err instanceof TwelveDataError ? err.statusCode : undefined;

    let statusLabel = "ERROR";
    if (message.includes("not configured")) statusLabel = "INVALID_KEY";
    else if (message.includes("Rate limit") || message.includes("credits")) statusLabel = "RATE_LIMITED";
    else if (message.includes("timed out") || message.includes("AbortError")) statusLabel = "TIMEOUT";
    else if (message.includes("Invalid API KEY") || message.includes("invalid api key")) statusLabel = "INVALID_KEY";

    console.log(
      `[Twelve Data] Endpoint: /quote | Symbol: ${symbols} | Status: ${statusLabel} | HTTP: ${statusCode ?? "N/A"} | Error: ${message} | Duration: ${durationMs}ms`
    );

    return buildUnavailableQuotes(timestamp, message);
  }
}

function parseNum(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  const parsed = parseFloat(value ?? "0");
  return isNaN(parsed) ? 0 : parsed;
}

function buildUnavailableQuotes(timestamp: string, error: string): US100MegaCapStock[] {
  return US100_MEGA_CAP_SYMBOLS.map((symbol) => buildSingleUnavailable(symbol, timestamp, error));
}

function buildSingleUnavailable(symbol: US100MegaCapSymbol, timestamp: string, error: string): US100MegaCapStock {
  return {
    symbol,
    name: symbol,
    price: 0,
    change: 0,
    changePercent: 0,
    marketCap: 0,
    sector: "",
    industry: "",
    volume: 0,
    high: 0,
    low: 0,
    previousClose: 0,
    timestamp,
    meta: { status: "unavailable", source: "Twelve Data", timestamp, lastUpdated: timestamp, error },
  };
}

function buildMeta(status: US100DataMeta["status"], source: string, timestamp: string): US100DataMeta {
  return { status, source, timestamp, lastUpdated: timestamp };
}
