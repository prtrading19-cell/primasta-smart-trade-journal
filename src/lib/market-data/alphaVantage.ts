import type { AlphaVantageData } from "./types";

const TIMEOUT_MS = 10000;

export async function fetchAlphaVantage(apiKey: string): Promise<AlphaVantageData> {
  const [dxyResult, quoteResult] = await Promise.allSettled([
    fetchDXY(apiKey),
    fetchForexQuote(apiKey),
  ]);

  const dxy = dxyResult.status === "fulfilled" ? dxyResult.value : null;
  const quote = quoteResult.status === "fulfilled" ? quoteResult.value : null;

  return {
    dxy: dxy?.value ?? "Live Data Unavailable",
    usDollarIndex: dxy?.value ?? "Live Data Unavailable",
    raw: {
      dxy,
      quote,
    },
  };
}

interface AlphaVantageGlobalQuote {
  "Global Quote"?: {
    "05. price"?: string;
    "03. high"?: string;
    "04. low"?: string;
    "06. volume"?: string;
    "08. previous close"?: string;
  };
}

interface AlphaVantageFXResponse {
  "Realtime Currency Exchange Rate"?: {
    "5. Exchange Rate"?: string;
    "8. Last Refreshed"?: string;
  };
}

async function fetchDXY(apiKey: string): Promise<{ value: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL("https://www.alphavantage.co/query");
    url.searchParams.set("function", "CURRENCYExchangeRate");
    url.searchParams.set("from_currency", "USD");
    url.searchParams.set("to_currency", "EUR");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Alpha Vantage: HTTP ${response.status}`);
    }

    const data: AlphaVantageFXResponse = await response.json();
    const rate = data?.["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"];
    const lastRefreshed = data?.["Realtime Currency Exchange Rate"]?.["8. Last Refreshed"];

    if (!rate) {
      throw new Error("Alpha Vantage: No rate data");
    }

    return {
      value: `USD/EUR ${rate} (as of ${lastRefreshed || "recent"})`,
    };
  } catch (error) {
    clearTimeout(timeout);
    throw new Error(`Alpha Vantage DXY: ${error instanceof Error ? error.message : "unknown"}`);
  }
}

async function fetchForexQuote(apiKey: string): Promise<AlphaVantageGlobalQuote["Global Quote"] | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL("https://www.alphavantage.co/query");
    url.searchParams.set("function", "GLOBAL_QUOTE");
    url.searchParams.set("symbol", "UUP");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return undefined;

    const data: AlphaVantageGlobalQuote = await response.json();
    return data?.["Global Quote"] ?? undefined;
  } catch (error) {
    clearTimeout(timeout);
    return undefined;
  }
}
