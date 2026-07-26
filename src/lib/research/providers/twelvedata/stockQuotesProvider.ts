import type { US100MegaCapStock, US100DataMeta } from "@/types/us100";
import { US100_MEGA_CAP_SYMBOLS, type US100MegaCapSymbol } from "@/types/us100";

const TD_BASE_URL = "https://api.twelvedata.com";
const REQUEST_TIMEOUT_MS = 12000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

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

export async function fetchUS100StockQuotes(): Promise<US100MegaCapStock[]> {
  const timestamp = new Date().toISOString();
  const apiKey = getApiKey();

  try {
    const symbols = US100_MEGA_CAP_SYMBOLS.join(",");
    const url = `${TD_BASE_URL}/quote?symbol=${symbols}&apikey=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new TwelveDataError(`Twelve Data returned ${response.status}: ${body.slice(0, 200)}`, "quote", response.status);
    }

    const data = await response.json();
    const quotes: TDQuote[] = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : [];

    if (quotes.length === 0) {
      return buildUnavailableQuotes(timestamp, "No data returned");
    }

    const quoteMap = new Map<string, TDQuote>();
    for (const q of quotes) {
      if (q.symbol) quoteMap.set(q.symbol, q);
    }

    return US100_MEGA_CAP_SYMBOLS.map((symbol) => {
      const q = quoteMap.get(symbol);
      if (!q) return buildSingleUnavailable(symbol, timestamp, "No quote data");

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
  } catch (err) {
    const message = err instanceof TwelveDataError ? err.message : err instanceof Error ? err.message : "Unknown error";
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
