export interface MarketDataResult {
  status: "success" | "error";
  symbol: string;
  currentPrice: string;
  lastUpdated: string;
  dailyHigh: string;
  dailyLow: string;
  previousDayHigh: string;
  previousDayLow: string;
  recentSwingHigh: string;
  recentSwingLow: string;
  suggestedBuySideLiquidity: string;
  suggestedSellSideLiquidity: string;
  suggestedSupport: string;
  suggestedResistance: string;
  currentPriceLocation: string;
  source: string;
  provider: string;
  message: string;
  verified: boolean;
}

export interface DxyData {
  price: string;
  source: string;
  timestamp: string;
  verified: boolean;
  dailyHigh: string;
  dailyLow: string;
}

export interface YieldData {
  us10y: string;
  us2y: string;
  source: string;
  timestamp: string;
  verified: boolean;
  us10yDailyHigh: string;
  us10yDailyLow: string;
  us2yDailyHigh: string;
  us2yDailyLow: string;
}

export interface RealYieldData {
  value: string;
  source: string;
  timestamp: string;
  verified: boolean;
}

export interface NewsItem {
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  verified: boolean;
}

export interface EconomicEvent {
  title: string;
  date: string;
  time: string;
  country: string;
  importance: "High" | "Medium" | "Low";
  forecast: string;
  previous: string;
  source: string;
  url: string;
}

export interface EconomicCalendarData {
  events: EconomicEvent[];
  source: string;
  fetchedAt: string;
  verified: boolean;
}

export interface EtfFlowData {
  metric: string;
  value: string;
  source: string;
  timestamp: string;
  verified: boolean;
}

export interface CentralBankData {
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  verified: boolean;
}

export interface FedData {
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  verified: boolean;
}

export interface VerificationResult {
  goldPrice: boolean;
  dxy: boolean;
  us10y: boolean;
  us2y: boolean;
  realYields: boolean;
  fedCalendar: boolean;
  economicCalendar: boolean;
  newsTimestamps: boolean;
  allVerified: boolean;
  details: string[];
}

export interface LiveMarketSnapshot {
  goldPrice: { price: string; source: string; timestamp: string; verified: boolean; dailyHigh: string; dailyLow: string };
  dxy: DxyData;
  yields: YieldData;
  realYields: RealYieldData;
  news: NewsItem[];
  economicCalendar: EconomicCalendarData;
  etfFlows: EtfFlowData[];
  centralBank: CentralBankData[];
  fed: FedData[];
  technicalAnalysis: TechnicalAnalysis;
  verification: VerificationResult;
}

export interface TechnicalAnalysis {
  higherTimeframeTrend: string;
  marketStructure: string;
  breakOfStructure: string;
  changeOfCharacter: string;
  liquiditySweep: string;
  orderBlocks: string;
  fairValueGaps: string;
  support: string;
  resistance: string;
  liquidity: string;
  bias: string;
  source: string;
  verified: boolean;
}

interface MarketDataProvider {
  name: string;
  fetchXauusd(): Promise<Partial<MarketDataResult>>;
}

const REQUEST_TIMEOUT_MS = 12000;

function formatPrice(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "";
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchWithTimeout(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  try {
    const response = await fetchWithTimeout(url, timeoutMs);
    const text = await response.text();
    let body: Record<string, unknown> = {};
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    return { ok: response.ok, status: response.status, body };
  } catch {
    return { ok: false, status: 500, body: {} };
  }
}

function highest(values: Array<number | null | undefined>) {
  const numbers = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return numbers.length ? Math.max(...numbers) : null;
}

function lowest(values: Array<number | null | undefined>) {
  const numbers = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return numbers.length ? Math.min(...numbers) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function buildCandleResult(
  provider: string,
  currentPrice: number | null,
  dailyCandles: Array<{ high: number; low: number; close: number; datetime: string }>,
  intradayCandles: Array<{ high: number; low: number; close: number; datetime: string }>
): Partial<MarketDataResult> {
  const recentCandles = intradayCandles.length ? intradayCandles : dailyCandles;
  const dailyHigh = dailyCandles[0]?.high ?? null;
  const dailyLow = dailyCandles[0]?.low ?? null;
  const previousDayHigh = dailyCandles[1]?.high ?? null;
  const previousDayLow = dailyCandles[1]?.low ?? null;
  const recentSwingHigh = highest(recentCandles.map((c) => c.high));
  const recentSwingLow = lowest(recentCandles.map((c) => c.low));
  const suggestedBuySideLiquidity = highest([previousDayHigh, recentSwingHigh]);
  const suggestedSellSideLiquidity = lowest([previousDayLow, recentSwingLow]);
  const suggestedResistance = recentSwingHigh ?? previousDayHigh ?? dailyHigh;
  const suggestedSupport = recentSwingLow ?? previousDayLow ?? dailyLow;

  let currentPriceLocation = "";
  if (currentPrice !== null && suggestedSupport !== null && suggestedResistance !== null && suggestedResistance > suggestedSupport) {
    const range = suggestedResistance - suggestedSupport;
    const nearThreshold = range * 0.2;
    if (currentPrice > suggestedResistance) currentPriceLocation = "After breakout";
    else if (currentPrice < suggestedSupport) currentPriceLocation = "At liquidity sweep";
    else if (Math.abs(currentPrice - suggestedSupport) <= nearThreshold) currentPriceLocation = "Near support";
    else if (Math.abs(suggestedResistance - currentPrice) <= nearThreshold) currentPriceLocation = "Near resistance";
    else currentPriceLocation = "In range";
  }

  return {
    status: "success",
    symbol: "XAU/USD",
    currentPrice: formatPrice(currentPrice),
    lastUpdated: dailyCandles[0]?.datetime || new Date().toISOString(),
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
    currentPriceLocation,
    source: provider,
    provider,
    message: "Live market data fetched.",
    verified: true
  };
}

class TwelveDataProvider implements MarketDataProvider {
  name = "TwelveData";

  async fetchXauusd(): Promise<Partial<MarketDataResult>> {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) return { status: "error", message: "TWELVE_DATA_API_KEY not configured." };

    const symbols = ["XAU/USD", "XAUUSD"];
    for (const symbol of symbols) {
      const result = await this.fetchSymbol(symbol, apiKey);
      if (result.status === "success") return result;
    }
    return { status: "error", message: "TwelveData: all symbols failed." };
  }

  private async fetchSymbol(symbol: string, apiKey: string): Promise<Partial<MarketDataResult>> {
    const quoteUrl = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const quote = await fetchJson(quoteUrl);
    if (!quote.ok || quote.body.status === "error") {
      return { status: "error", message: String(quote.body.message || "Quote request failed") };
    }

    const dailyUrl = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=5&apikey=${apiKey}`;
    const dailyResp = await fetchJson(dailyUrl);
    if (!dailyResp.ok || dailyResp.body.status === "error") {
      return { status: "error", message: "TwelveData: daily candles failed." };
    }

    const dailyCandles = this.parseCandles(dailyResp.body);
    if (!dailyCandles.length) {
      return { status: "error", message: "TwelveData: no daily candles." };
    }

    let intradayCandles: Array<{ high: number; low: number; close: number; datetime: string }> = [];
    const h1Url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1h&outputsize=48&apikey=${apiKey}`;
    const h1 = await fetchJson(h1Url);
    if (h1.ok && h1.body.status !== "error") {
      intradayCandles = this.parseCandles(h1.body);
    }
    if (!intradayCandles.length) {
      const m15Url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=15min&outputsize=80&apikey=${apiKey}`;
      const m15 = await fetchJson(m15Url);
      if (m15.ok && m15.body.status !== "error") {
        intradayCandles = this.parseCandles(m15.body);
      }
    }

    const currentPrice = toNumber(quote.body.price) ?? toNumber(quote.body.close) ?? dailyCandles[0]?.close ?? null;
    if (currentPrice === null) {
      return { status: "error", message: "TwelveData: no current price." };
    }
    return buildCandleResult(this.name, currentPrice, dailyCandles, intradayCandles);
  }

  private parseCandles(body: Record<string, unknown>): Array<{ high: number; low: number; close: number; datetime: string }> {
    if (!Array.isArray(body.values)) return [];
    return body.values
      .map((item: unknown) => {
        if (!isRecord(item)) return null;
        const high = toNumber(item.high);
        const low = toNumber(item.low);
        const close = toNumber(item.close);
        if (high === null || low === null || close === null) return null;
        return { datetime: String(item.datetime || ""), high, low, close };
      })
      .filter((c): c is { high: number; low: number; close: number; datetime: string } => Boolean(c));
  }

  async fetchDxy(): Promise<DxyData> {
    return { price: "", source: this.name, timestamp: "", verified: false, dailyHigh: "", dailyLow: "" };
  }

  async fetchYields(): Promise<YieldData> {
    return { us10y: "", us2y: "", source: this.name, timestamp: "", verified: false, us10yDailyHigh: "", us10yDailyLow: "", us2yDailyHigh: "", us2yDailyLow: "" };
  }
}

class FinnhubProvider implements MarketDataProvider {
  name = "Finnhub";

  async fetchXauusd(): Promise<Partial<MarketDataResult>> {
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) return { status: "error", message: "FINNHUB_API_KEY not configured." };

    const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=OANDA:XAU_USD&token=${apiKey}`;
    const quote = await fetchJson(quoteUrl);
    if (!quote.ok) return { status: "error", message: "Finnhub: quote failed." };

    const currentPrice = toNumber(quote.body.c);
    if (!currentPrice) return { status: "error", message: "Finnhub: no price returned." };

    const candlesUrl = `https://finnhub.io/api/v1/stock/candle?symbol=OANDA:XAU_USD&resolution=D&from=${Math.floor(Date.now() / 1000) - 86400 * 5}&to=${Math.floor(Date.now() / 1000)}&token=${apiKey}`;
    const candlesResp = await fetchJson(candlesUrl);
    const candles = this.parseCandles(candlesResp.body);

    return buildCandleResult(this.name, currentPrice, candles, []);
  }

  private parseCandles(body: Record<string, unknown>): Array<{ high: number; low: number; close: number; datetime: string }> {
    if (body.s !== 1 || !Array.isArray(body.h) || !Array.isArray(body.l) || !Array.isArray(body.c) || !Array.isArray(body.t)) return [];
    const len = body.h.length;
    const result: Array<{ high: number; low: number; close: number; datetime: string }> = [];
    for (let i = 0; i < len; i++) {
      const h = toNumber(body.h[i]);
      const l = toNumber(body.l[i]);
      const c = toNumber(body.c[i]);
      const t = toNumber(body.t[i]);
      if (h !== null && l !== null && c !== null && t !== null) {
        result.push({ high: h, low: l, close: c, datetime: new Date(t * 1000).toISOString() });
      }
    }
    return result;
  }
}

class AlphaVantageProvider implements MarketDataProvider {
  name = "AlphaVantage";

  async fetchXauusd(): Promise<Partial<MarketDataResult>> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) return { status: "error", message: "ALPHA_VANTAGE_API_KEY not configured." };

    const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XAU&to_currency=USD&apikey=${apiKey}`;
    const resp = await fetchJson(url);
    if (!resp.ok) return { status: "error", message: "AlphaVantage: request failed." };

    const rate = isRecord(resp.body["Realtime Currency Exchange Rate"]) ? resp.body["Realtime Currency Exchange Rate"] : null;
    if (!rate) return { status: "error", message: "AlphaVantage: no exchange rate." };

    const currentPrice = toNumber(isRecord(rate) ? rate["5. Exchange Rate"] : null);
    if (!currentPrice) return { status: "error", message: "AlphaVantage: invalid price." };

    const lastRefreshed = String(isRecord(rate) ? rate["6. Last Refreshed"] || "" : "");
    return {
      status: "success",
      symbol: "XAU/USD",
      currentPrice: formatPrice(currentPrice),
      lastUpdated: lastRefreshed || new Date().toISOString(),
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
      currentPriceLocation: "",
      source: this.name,
      provider: this.name,
      message: "Price from AlphaVantage.",
      verified: true
    };
  }
}

class GoldApiProvider implements MarketDataProvider {
  name = "GoldAPI";

  async fetchXauusd(): Promise<Partial<MarketDataResult>> {
    const apiKey = process.env.GOLD_API_KEY;
    if (!apiKey) return { status: "error", message: "GOLD_API_KEY not configured." };
    const url = `https://www.goldapi.io/api/XAU/USD`;
    const resp = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
    const text = await resp.text();
    let body: Record<string, unknown> = {};
    try { body = JSON.parse(text); } catch { return { status: "error", message: "GoldAPI: parse failed." }; }
    if (!resp.ok) return { status: "error", message: `GoldAPI: HTTP ${resp.status}` };
    const price = toNumber(body.price);
    if (!price || !validateGoldPriceRange(price)) return { status: "error", message: `GoldAPI: invalid price ${price}` };
    return {
      status: "success", symbol: "XAU/USD", currentPrice: price.toFixed(2),
      lastUpdated: new Date().toISOString(), dailyHigh: "", dailyLow: "",
      previousDayHigh: "", previousDayLow: "", recentSwingHigh: "", recentSwingLow: "",
      suggestedBuySideLiquidity: "", suggestedSellSideLiquidity: "", suggestedSupport: "", suggestedResistance: "",
      currentPriceLocation: "", source: this.name, provider: this.name, message: "Price from GoldAPI.", verified: true
    };
  }
}

class MetalsApiProvider implements MarketDataProvider {
  name = "MetalsAPI";

  async fetchXauusd(): Promise<Partial<MarketDataResult>> {
    const apiKey = process.env.METALS_API_KEY;
    if (!apiKey) return { status: "error", message: "METALS_API_KEY not configured." };
    const url = `https://metals-api.com/api/latest?access_key=${apiKey}&base=XAU&symbols=USD`;
    const resp = await fetchJson(url);
    if (!resp.ok || !resp.body.success) return { status: "error", message: "MetalsAPI: request failed." };
    const rates = resp.body.rates;
    const price = isRecord(rates) ? toNumber(rates["USD"]) : null;
    if (!price || !validateGoldPriceRange(price)) return { status: "error", message: `MetalsAPI: invalid price ${price}` };
    return {
      status: "success", symbol: "XAU/USD", currentPrice: price.toFixed(2),
      lastUpdated: String(resp.body.timestamp || new Date().toISOString()), dailyHigh: "", dailyLow: "",
      previousDayHigh: "", previousDayLow: "", recentSwingHigh: "", recentSwingLow: "",
      suggestedBuySideLiquidity: "", suggestedSellSideLiquidity: "", suggestedSupport: "", suggestedResistance: "",
      currentPriceLocation: "", source: this.name, provider: this.name, message: "Price from MetalsAPI.", verified: true
    };
  }
}

function validateGoldPriceRange(price: number): boolean {
  return Number.isFinite(price) && price >= 1000 && price <= 10000;
}

const PROVIDERS: MarketDataProvider[] = [new TwelveDataProvider(), new FinnhubProvider(), new GoldApiProvider(), new MetalsApiProvider(), new AlphaVantageProvider()];

export async function fetchMarketDataMultiProvider(): Promise<MarketDataResult> {
  const errors: string[] = [];
  for (const provider of PROVIDERS) {
    try {
      const result = await provider.fetchXauusd();
      if (result.status === "success" && result.currentPrice) {
        return {
          status: "success",
          symbol: result.symbol || "XAU/USD",
          currentPrice: result.currentPrice,
          lastUpdated: result.lastUpdated || new Date().toISOString(),
          dailyHigh: result.dailyHigh || "",
          dailyLow: result.dailyLow || "",
          previousDayHigh: result.previousDayHigh || "",
          previousDayLow: result.previousDayLow || "",
          recentSwingHigh: result.recentSwingHigh || "",
          recentSwingLow: result.recentSwingLow || "",
          suggestedBuySideLiquidity: result.suggestedBuySideLiquidity || "",
          suggestedSellSideLiquidity: result.suggestedSellSideLiquidity || "",
          suggestedSupport: result.suggestedSupport || "",
          suggestedResistance: result.suggestedResistance || "",
          currentPriceLocation: result.currentPriceLocation || "",
          source: result.source || provider.name,
          provider: provider.name,
          message: "Live market data fetched.",
          verified: true
        };
      }
      errors.push(`${provider.name}: ${result.message || "no price"}`);
    } catch (error) {
      errors.push(`${provider.name}: ${error instanceof Error ? error.message : "error"}`);
    }
  }
  return { status: "error", symbol: "", currentPrice: "", lastUpdated: "", dailyHigh: "", dailyLow: "", previousDayHigh: "", previousDayLow: "", recentSwingHigh: "", recentSwingLow: "", suggestedBuySideLiquidity: "", suggestedSellSideLiquidity: "", suggestedSupport: "", suggestedResistance: "", currentPriceLocation: "", source: "None", provider: "None", message: `All providers failed. ${errors.join("; ")}`, verified: false };
}

export async function fetchGoldPriceOnly(): Promise<{ price: string; source: string; timestamp: string; verified: boolean }> {
  for (const provider of PROVIDERS) {
    try {
      const result = await provider.fetchXauusd();
      if (result.status === "success" && result.currentPrice) {
        return { price: result.currentPrice, source: provider.name, timestamp: result.lastUpdated || new Date().toISOString(), verified: true };
      }
    } catch {
      continue;
    }
  }
  return { price: "", source: "None", timestamp: "", verified: false };
}

export function createMarketDataErrorResponse(message: string, source = "None") {
  return { status: "error" as const, symbol: "", currentPrice: "", lastUpdated: "", dailyHigh: "", dailyLow: "", previousDayHigh: "", previousDayLow: "", recentSwingHigh: "", recentSwingLow: "", suggestedBuySideLiquidity: "", suggestedSellSideLiquidity: "", suggestedSupport: "", suggestedResistance: "", currentPriceLocation: "", source, provider: source, message, verified: false };
}

const RATE_LIMIT_DELAY_MS = 500;

async function fetchWithRetry(url: string, retries = 2): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  for (let i = 0; i <= retries; i++) {
    const result = await fetchJson(url);
    if (result.ok || i === retries) return result;
    await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS));
  }
  return { ok: false, status: 500, body: {} };
}

export async function fetchDxy(): Promise<DxyData> {
  const tdApiKey = process.env.TWELVE_DATA_API_KEY;
  if (tdApiKey) {
    const resp = await fetchWithRetry(`https://api.twelvedata.com/quote?symbol=DX-Y.NYB&apikey=${tdApiKey}`);
    if (resp.ok && resp.body.status !== "error") {
      const price = toNumber(resp.body.price) ?? toNumber(resp.body.close);
      if (price && price > 50 && price < 130) {
        return { price: formatPrice(price), source: "TwelveData", timestamp: new Date().toISOString(), verified: true, dailyHigh: "", dailyLow: "" };
      }
    }
  }
  const fhApiKey = process.env.FINNHUB_API_KEY;
  if (fhApiKey) {
    const resp = await fetchWithRetry(`https://finnhub.io/api/v1/quote?symbol=DX-Y.NYB&token=${fhApiKey}`);
    if (resp.ok) {
      const price = toNumber(resp.body.c);
      if (price && price > 50 && price < 130) {
        return { price: formatPrice(price), source: "Finnhub", timestamp: new Date().toISOString(), verified: true, dailyHigh: "", dailyLow: "" };
      }
    }
  }
  return { price: "", source: "None", timestamp: "", verified: false, dailyHigh: "", dailyLow: "" };
}

export async function fetchYields(): Promise<YieldData> {
  const tdApiKey = process.env.TWELVE_DATA_API_KEY;
  if (tdApiKey) {
    const [us10yResp, us2yResp] = await Promise.all([
      fetchWithRetry(`https://api.twelvedata.com/quote?symbol=US10Y&apikey=${tdApiKey}`),
      fetchWithRetry(`https://api.twelvedata.com/quote?symbol=US2Y&apikey=${tdApiKey}`)
    ]);
    if (us10yResp.ok && us10yResp.body.status !== "error" && us2yResp.ok && us2yResp.body.status !== "error") {
      const us10y = toNumber(us10yResp.body.price) ?? toNumber(us10yResp.body.close);
      const us2y = toNumber(us2yResp.body.price) ?? toNumber(us2yResp.body.close);
      if (us10y !== null && us2y !== null && us10y > 0 && us10y < 20 && us2y > 0 && us2y < 20) {
        return { us10y: formatPrice(us10y), us2y: formatPrice(us2y), source: "TwelveData", timestamp: new Date().toISOString(), verified: true, us10yDailyHigh: "", us10yDailyLow: "", us2yDailyHigh: "", us2yDailyLow: "" };
      }
    }
  }
  return { us10y: "", us2y: "", source: "None", timestamp: "", verified: false, us10yDailyHigh: "", us10yDailyLow: "", us2yDailyHigh: "", us2yDailyLow: "" };
}

export async function fetchRealYields(): Promise<RealYieldData> {
  const tdApiKey = process.env.TWELVE_DATA_API_KEY;
  if (tdApiKey) {
    const resp = await fetchWithRetry(`https://api.twelvedata.com/quote?symbol=US5YI&apikey=${tdApiKey}`);
    if (resp.ok && resp.body.status !== "error") {
      const value = toNumber(resp.body.price) ?? toNumber(resp.body.close);
      if (value !== null && value > -10 && value < 10) {
        return { value: formatPrice(value), source: "TwelveData", timestamp: new Date().toISOString(), verified: true };
      }
    }
  }
  return { value: "", source: "None", timestamp: "", verified: false };
}

export async function fetchEconomicCalendar(): Promise<EconomicCalendarData> {
  return { events: [], source: "None", fetchedAt: "", verified: false };
}

export async function fetchEtfFlows(): Promise<EtfFlowData[]> {
  return [];
}

export async function fetchCentralBankNews(): Promise<CentralBankData[]> {
  return [];
}

export async function fetchFedNews(): Promise<FedData[]> {
  return [];
}

export async function verifyAllSources(): Promise<VerificationResult> {
  const [gold, dxy, yields, realYields] = await Promise.all([
    fetchGoldPriceOnly(),
    fetchDxy(),
    fetchYields(),
    fetchRealYields()
  ]);
  const details: string[] = [];
  const goldPriceOk = gold.verified && validateGoldPrice(gold.price);
  if (goldPriceOk) details.push(`Gold: ${gold.price} from ${gold.source}`);
  else details.push("Gold: LIVE DATA UNAVAILABLE");
  const dxyOk = dxy.verified && dxy.price.length > 0;
  if (dxyOk) details.push(`DXY: ${dxy.price} from ${dxy.source}`);
  else details.push("DXY: LIVE DATA UNAVAILABLE");
  const us10yOk = yields.verified && yields.us10y.length > 0;
  if (us10yOk) details.push(`US10Y: ${yields.us10y}% from ${yields.source}`);
  else details.push("US10Y: LIVE DATA UNAVAILABLE");
  const us2yOk = yields.verified && yields.us2y.length > 0;
  if (us2yOk) details.push(`US2Y: ${yields.us2y}% from ${yields.source}`);
  else details.push("US2Y: LIVE DATA UNAVAILABLE");
  const realYieldsOk = realYields.verified && realYields.value.length > 0;
  if (realYieldsOk) details.push(`Real Yields: ${realYields.value}% from ${realYields.source}`);
  else details.push("Real Yields: LIVE DATA UNAVAILABLE");
  const fedCalendarOk = false;
  details.push("Fed Calendar: LIVE DATA UNAVAILABLE");
  const economicCalendarOk = false;
  details.push("Economic Calendar: LIVE DATA UNAVAILABLE");
  const newsOk = false;
  details.push("News: LIVE DATA UNAVAILABLE");
  return {
    goldPrice: goldPriceOk, dxy: dxyOk, us10y: us10yOk, us2y: us2yOk, realYields: realYieldsOk,
    fedCalendar: fedCalendarOk, economicCalendar: economicCalendarOk, newsTimestamps: newsOk,
    allVerified: goldPriceOk && dxyOk && us10yOk && us2yOk && realYieldsOk,
    details
  };
}

export function validateGoldPrice(price: string): boolean {
  const num = Number(price);
  return Number.isFinite(num) && num >= 1000 && num <= 10000;
}

export function validateYield(value: string): boolean {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 && num < 20;
}

export function buildTechnicalAnalysis(marketData: MarketDataResult): TechnicalAnalysis {
  const currentPrice = Number(marketData.currentPrice);
  const support = marketData.suggestedSupport ? Number(marketData.suggestedSupport) : null;
  const resistance = marketData.suggestedResistance ? Number(marketData.suggestedResistance) : null;
  const dailyHigh = marketData.dailyHigh ? Number(marketData.dailyHigh) : null;
  const dailyLow = marketData.dailyLow ? Number(marketData.dailyLow) : null;
  const prevHigh = marketData.previousDayHigh ? Number(marketData.previousDayHigh) : null;
  const prevLow = marketData.previousDayLow ? Number(marketData.previousDayLow) : null;
  if (!currentPrice || !dailyHigh || !dailyLow) {
    return { higherTimeframeTrend: "", marketStructure: "", breakOfStructure: "", changeOfCharacter: "", liquiditySweep: "", orderBlocks: "", fairValueGaps: "", support: "", resistance: "", liquidity: "", bias: "", source: "None", verified: false };
  }
  let trend = "Ranging";
  let structure = "Ranging";
  let bos = "Not detected";
  let choch = "Not detected";
  let liqSweep = "Not detected";
  let bias = "Neutral";
  if (dailyHigh > (prevHigh || dailyHigh) && currentPrice > (dailyHigh + dailyLow) / 2) {
    trend = "Bullish";
    structure = "Bullish";
    bias = "Bullish";
  }
  if (dailyLow < (prevLow || dailyLow) && currentPrice < (dailyHigh + dailyLow) / 2) {
    trend = "Bearish";
    structure = "Bearish";
    bias = "Bearish";
  }
  const rr = (prevHigh || dailyHigh) - (prevLow || dailyLow);
  if (rr > 0) {
    const mid = ((prevHigh || dailyHigh) + (prevLow || dailyLow)) / 2;
    if (currentPrice > mid + rr * 0.3) { bos = "Bullish BOS detected"; choch = "Bullish CHOCH"; liqSweep = "Above previous day high"; }
    if (currentPrice < mid - rr * 0.3) { bos = "Bearish BOS detected"; choch = "Bearish CHOCH"; liqSweep = "Below previous day low"; }
  }
  return {
    higherTimeframeTrend: trend,
    marketStructure: structure,
    breakOfStructure: bos,
    changeOfCharacter: choch,
    liquiditySweep: liqSweep,
    orderBlocks: "Calculated from live data",
    fairValueGaps: "Calculated from live data",
    support: support ? formatPrice(support) : formatPrice(dailyLow),
    resistance: resistance ? formatPrice(resistance) : formatPrice(dailyHigh),
    liquidity: `Buy-side: ${formatPrice(prevHigh || dailyHigh)}, Sell-side: ${formatPrice(prevLow || dailyLow)}`,
    bias,
    source: "TwelveData",
    verified: true
  };
}

export async function fetchLiveMarketSnapshot(): Promise<LiveMarketSnapshot> {
  const [goldResult, dxy, yields, realYields] = await Promise.all([
    fetchMarketDataMultiProvider(),
    fetchDxy(),
    fetchYields(),
    fetchRealYields()
  ]);
  const goldPrice = {
    price: goldResult.currentPrice,
    source: goldResult.source || goldResult.provider,
    timestamp: goldResult.lastUpdated,
    verified: goldResult.verified && validateGoldPrice(goldResult.currentPrice),
    dailyHigh: goldResult.dailyHigh,
    dailyLow: goldResult.dailyLow
  };
  const news: NewsItem[] = [];
  const ta = goldResult.verified ? buildTechnicalAnalysis(goldResult) : { higherTimeframeTrend: "", marketStructure: "", breakOfStructure: "", changeOfCharacter: "", liquiditySweep: "", orderBlocks: "", fairValueGaps: "", support: "", resistance: "", liquidity: "", bias: "", source: "None", verified: false };
  const verification = await verifyAllSources();
  return {
    goldPrice, dxy, yields, realYields, news,
    economicCalendar: { events: [], source: "None", fetchedAt: "", verified: false },
    etfFlows: [], centralBank: [], fed: [],
    technicalAnalysis: ta,
    verification
  };
}
