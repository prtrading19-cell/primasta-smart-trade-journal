import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";
const SYMBOLS = ["XAU/USD", "XAUUSD"];
const REQUEST_TIMEOUT_MS = 12000;

type TwelveDataResult = {
  ok: boolean;
  status: number;
  body: unknown;
  message: string;
  rateLimited: boolean;
};

type Candle = {
  datetime: string;
  high: number;
  low: number;
  close: number;
};

export async function GET() {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return marketDataError("Twelve Data API key is not configured. Add TWELVE_DATA_API_KEY in Vercel Environment Variables and redeploy.", 500);
  }

  let lastMessage = "Could not fetch XAUUSD data from Twelve Data.";

  for (const symbol of SYMBOLS) {
    const result = await fetchSymbolMarketData(symbol, apiKey);

    if (result.status === "success") {
      return NextResponse.json(result);
    }

    lastMessage = result.message || lastMessage;
    if (/rate limit|credits|quota/i.test(lastMessage)) {
      return marketDataError("Free market data rate limit reached. Try again later.", 429, symbol);
    }
  }

  return marketDataError("Could not fetch XAUUSD data from Twelve Data.", 502, "", lastMessage);
}

async function fetchSymbolMarketData(symbol: string, apiKey: string) {
  const quote = await fetchTwelveData("quote", { symbol, apikey: apiKey });
  if (!quote.ok) return failedMarketData(symbol, quote);

  const dailySeries = await fetchTwelveData("time_series", {
    symbol,
    interval: "1day",
    outputsize: "5",
    apikey: apiKey
  });
  if (!dailySeries.ok) return failedMarketData(symbol, dailySeries);

  const dailyCandles = parseCandles(dailySeries.body);
  if (!dailyCandles.length) {
    return failedMarketData(symbol, {
      ok: false,
      status: 502,
      body: dailySeries.body,
      message: "Daily XAUUSD candles are unavailable.",
      rateLimited: false
    });
  }

  const intradayCandles = await fetchIntradayCandles(symbol, apiKey);
  const recentCandles = intradayCandles.length ? intradayCandles : dailyCandles;
  const currentPriceNumber = numberFromRecord(quote.body, ["price", "close"]) ?? dailyCandles[0]?.close ?? null;
  const recentSwingHigh = highest(recentCandles.map((candle) => candle.high));
  const recentSwingLow = lowest(recentCandles.map((candle) => candle.low));
  const dailyHigh = dailyCandles[0]?.high ?? null;
  const dailyLow = dailyCandles[0]?.low ?? null;
  const previousDayHigh = dailyCandles[1]?.high ?? null;
  const previousDayLow = dailyCandles[1]?.low ?? null;
  const suggestedBuySideLiquidity = highest([previousDayHigh, recentSwingHigh]);
  const suggestedSellSideLiquidity = lowest([previousDayLow, recentSwingLow]);
  const suggestedResistance = recentSwingHigh ?? previousDayHigh ?? dailyHigh;
  const suggestedSupport = recentSwingLow ?? previousDayLow ?? dailyLow;
  const lastUpdated = stringFromRecord(quote.body, ["datetime", "timestamp"]) || dailyCandles[0]?.datetime || new Date().toISOString();

  return {
    status: "success" as const,
    symbol,
    currentPrice: formatPrice(currentPriceNumber),
    lastUpdated,
    dailyHigh: formatPrice(dailyHigh),
    dailyLow: formatPrice(dailyLow),
    previousDayHigh: formatPrice(previousDayHigh),
    previousDayLow: formatPrice(previousDayLow),
    recentSwingHigh: formatPrice(recentSwingHigh),
    recentSwingLow: formatPrice(recentSwingLow),
    suggestedBuySideLiquidity: formatPrice(suggestedBuySideLiquidity),
    suggestedSellSideLiquidity: formatPrice(suggestedSellSideLiquidity),
    suggestedSupport: formatPrice(suggestedSupport),
    suggestedResistance: formatPrice(suggestedResistance),
    currentPriceLocation: inferPriceLocation(currentPriceNumber, suggestedSupport, suggestedResistance),
    source: "Twelve Data" as const,
    message: "Market data fetched. Suggested levels still need chart confirmation."
  };
}

async function fetchIntradayCandles(symbol: string, apiKey: string) {
  const oneHour = await fetchTwelveData("time_series", {
    symbol,
    interval: "1h",
    outputsize: "48",
    apikey: apiKey
  });

  if (oneHour.ok) {
    const candles = parseCandles(oneHour.body);
    if (candles.length) return candles;
  }

  const fifteenMinute = await fetchTwelveData("time_series", {
    symbol,
    interval: "15min",
    outputsize: "80",
    apikey: apiKey
  });

  return fifteenMinute.ok ? parseCandles(fifteenMinute.body) : [];
}

async function fetchTwelveData(endpoint: string, params: Record<string, string>): Promise<TwelveDataResult> {
  const url = new URL(`${TWELVE_DATA_BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    const body = await readJson(response);
    const apiMessage = getApiMessage(body);
    const apiStatus = isRecord(body) && typeof body.status === "string" ? body.status : "";
    const apiCode = isRecord(body) ? Number(body.code) : 0;
    const rateLimited = response.status === 429 || apiCode === 429 || /rate limit|credits|quota/i.test(apiMessage);
    const ok = response.ok && apiStatus !== "error";

    return {
      ok,
      status: response.status,
      body,
      message: apiMessage,
      rateLimited
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      body: {},
      message: error instanceof Error && error.name === "AbortError" ? "Twelve Data request timed out." : error instanceof Error ? error.message : "Twelve Data request failed.",
      rateLimited: false
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function failedMarketData(symbol: string, result: TwelveDataResult) {
  return {
    status: "error" as const,
    symbol,
    currentPrice: "",
    lastUpdated: "",
    dailyHigh: "",
    dailyLow: "",
    previousDayHigh: "",
    previousDayLow: "",
    recentSwingHigh: "",
    recentSwingLow: "",
    suggestedBuySideLiquidity: "",
    suggestedSellSideLiquidity: "",
    suggestedSupport: "",
    suggestedResistance: "",
    currentPriceLocation: "Unknown",
    source: "Twelve Data" as const,
    message: result.rateLimited ? "Free market data rate limit reached. Try again later." : result.message
  };
}

function marketDataError(message: string, status: number, symbol = "", detail = "") {
  return NextResponse.json(
    {
      status: "error",
      symbol,
      currentPrice: "",
      lastUpdated: "",
      dailyHigh: "",
      dailyLow: "",
      previousDayHigh: "",
      previousDayLow: "",
      recentSwingHigh: "",
      recentSwingLow: "",
      suggestedBuySideLiquidity: "",
      suggestedSellSideLiquidity: "",
      suggestedSupport: "",
      suggestedResistance: "",
      currentPriceLocation: "Unknown",
      source: "Twelve Data",
      message,
      detail
    },
    { status }
  );
}

function parseCandles(value: unknown): Candle[] {
  if (!isRecord(value) || !Array.isArray(value.values)) return [];

  return value.values
    .map((item) => {
      if (!isRecord(item)) return null;
      const high = toNumber(item.high);
      const low = toNumber(item.low);
      const close = toNumber(item.close);
      if (high === null || low === null || close === null) return null;
      return {
        datetime: typeof item.datetime === "string" ? item.datetime : "",
        high,
        low,
        close
      };
    })
    .filter((item): item is Candle => Boolean(item));
}

function inferPriceLocation(currentPrice: number | null, support: number | null | undefined, resistance: number | null | undefined) {
  if (currentPrice === null || support === null || support === undefined || resistance === null || resistance === undefined || resistance <= support) return "Unknown";
  if (currentPrice > resistance) return "After breakout";
  if (currentPrice < support) return "At liquidity sweep";

  const range = resistance - support;
  const nearThreshold = range * 0.2;
  if (Math.abs(currentPrice - support) <= nearThreshold) return "Near support";
  if (Math.abs(resistance - currentPrice) <= nearThreshold) return "Near resistance";
  return "In range";
}

function highest(values: Array<number | null | undefined>) {
  const numbers = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return numbers.length ? Math.max(...numbers) : null;
}

function lowest(values: Array<number | null | undefined>) {
  const numbers = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return numbers.length ? Math.min(...numbers) : null;
}

function numberFromRecord(value: unknown, keys: string[]) {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    const parsed = toNumber(value[key]);
    if (parsed !== null) return parsed;
  }
  return null;
}

function stringFromRecord(value: unknown, keys: string[]) {
  if (!isRecord(value)) return "";
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" || typeof candidate === "number") return String(candidate);
  }
  return "";
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "";
}

function getApiMessage(value: unknown) {
  if (!isRecord(value)) return "";
  return typeof value.message === "string" ? value.message : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
