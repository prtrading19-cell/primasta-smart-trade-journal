import type { US100MegaCapStock, US100DataMeta } from "@/types/us100";
import { RequestManager } from "@/lib/research/infrastructure/RequestManager";
import { buildProviderLimitationError } from "../shared";

const PER_REQUEST_TIMEOUT_MS = 10000;
const TD_BASE = "https://api.twelvedata.com";

interface TDQuoteResponse {
  symbol: string;
  name: string;
  close: string;
  percent_change: string;
  change: string;
  volume: string;
  high: string;
  low: string;
  open: string;
  previous_close: string;
  meta?: { symbol?: string; exchange?: string };
}

export async function fetchStockQuotes(symbols: readonly string[]): Promise<US100MegaCapStock[]> {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  const apiKey = process.env.TWELVE_DATA_API_KEY || "";

  if (!apiKey) {
    return buildUnavailableQuotes(symbols, timestamp, "TWELVE_DATA_API_KEY not configured");
  }

  console.log(`[Twelve Data] Fetching ${symbols.length} symbols via Promise.all...`);

  const individualPromises = symbols.map((symbol) =>
    fetchSingleQuote(symbol, apiKey, timestamp).catch((err) =>
      buildSingleUnavailable(symbol, timestamp, `Fetch failed: ${err instanceof Error ? err.message : String(err)}`)
    )
  );

  const results = await Promise.all(individualPromises);

  const quoteMap = new Map<string, US100MegaCapStock>();
  for (const r of results) quoteMap.set(r.symbol, r);

  const ordered = symbols.map((symbol) => {
    const q = quoteMap.get(symbol);
    if (!q) return buildSingleUnavailable(symbol, timestamp, "Missing from results");
    return q;
  });

  const durationMs = Date.now() - startTime;
  const liveCount = ordered.filter((r) => r.meta.status === "live").length;
  const failedSymbols = ordered.filter((r) => r.meta.status !== "live").map((r) => r.symbol);
  const liveSymbols = ordered.filter((r) => r.meta.status === "live").map((r) => r.symbol);

  console.log(
    `[Twelve Data] Completed | Duration: ${durationMs}ms | Successful: ${liveCount} | Failed: ${failedSymbols.length} | Symbols: [${liveSymbols.join(", ")}]`
  );
  if (failedSymbols.length > 0) {
    console.log(`[Twelve Data] Failed symbols: [${failedSymbols.join(", ")}]`);
  }

  return ordered;
}

async function fetchSingleQuote(
  symbol: string,
  apiKey: string,
  timestamp: string
): Promise<US100MegaCapStock> {
  const url = `${TD_BASE}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
  const reqStart = Date.now();

  try {
    const response = await RequestManager.getInstance().fetch(url, `twelve-data-${symbol}`, {
      timeoutMs: PER_REQUEST_TIMEOUT_MS,
    });
    const reqDuration = Date.now() - reqStart;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.log(`[Twelve Data] ${symbol} HTTP ${response.status} | Duration: ${reqDuration}ms | ${errorText.slice(0, 100)}`);
      if (response.status === 429 || response.status === 403) {
        return buildSingleUnavailable(symbol, timestamp, `HTTP ${response.status}`, true);
      }
      return buildSingleUnavailable(symbol, timestamp, `HTTP ${response.status}`);
    }

    const json = await response.json();
    const q: TDQuoteResponse = json;
    const price = parseFloat(q.close);

    if (isNaN(price) || price === 0) {
      console.log(`[Twelve Data] ${symbol} No price | Duration: ${reqDuration}ms`);
      return buildSingleUnavailable(symbol, timestamp, "Quote unavailable");
    }

    const change = parseFloat(q.change) || 0;
    const changePercent = parseFloat(q.percent_change) || 0;
    const volume = parseInt(q.volume) || 0;
    const high = parseFloat(q.high) || 0;
    const low = parseFloat(q.low) || 0;
    const previousClose = parseFloat(q.previous_close) || 0;

    console.log(`[Twelve Data] ${symbol} LIVE | Price: ${price} | Change: ${change >= 0 ? "+" : ""}${change} (${changePercent >= 0 ? "+" : ""}${changePercent}%) | Duration: ${reqDuration}ms`);

    return {
      symbol,
      name: q.name || symbol,
      price,
      change,
      changePercent,
      marketCap: 0,
      sector: "",
      industry: "",
      volume,
      high,
      low,
      previousClose,
      timestamp,
      meta: buildMeta("live", "Twelve Data", timestamp),
    };
  } catch (err) {
    const reqDuration = Date.now() - reqStart;
    const errMsg = err instanceof Error ? err.message : String(err);
    console.log(`[Twelve Data] ${symbol} ERROR | Duration: ${reqDuration}ms | ${errMsg}`);
    return buildSingleUnavailable(symbol, timestamp, errMsg);
  }
}

function buildUnavailableQuotes(symbols: readonly string[], timestamp: string, error: string): US100MegaCapStock[] {
  return symbols.map((symbol) => buildSingleUnavailable(symbol, timestamp, error));
}

function buildSingleUnavailable(symbol: string, timestamp: string, error: string, isLimitation = false): US100MegaCapStock {
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
    meta: isLimitation
      ? buildMeta("unavailable", "Twelve Data", timestamp, buildProviderLimitationError("Twelve Data", error))
      : buildMeta("unavailable", "Twelve Data", timestamp, error),
  };
}

function buildMeta(status: US100DataMeta["status"], source: string, timestamp: string, error?: string): US100DataMeta {
  return { status, source, timestamp, lastUpdated: timestamp, ...(error ? { error } : {}) };
}
