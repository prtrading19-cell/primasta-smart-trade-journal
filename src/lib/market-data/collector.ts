import type { MarketData, MarketDataProviderResult, FREDData, AlphaVantageData, FinnhubData, NewsApiData, GNewsData } from "./types";
import type { ProviderResult } from "@/lib/research/providers/shared";
import type { SectorData, VolatilityData, BreadthData, MacroData, ETFData, COTReportData, OpenInterestRecord } from "@/types/institutional";
import { fetchFRED } from "./fred";
import { fetchAlphaVantage } from "./alphaVantage";
import { fetchFinnhub } from "./finnhub";
import { fetchNewsApi } from "./newsApi";
import { fetchGNews } from "./gnews";
import { fetchCOTReport } from "@/lib/research/providers/cot/cftcProvider";
import { fetchETFData } from "@/lib/research/providers/etf/provider";
import { fetchOpenInterest } from "@/lib/research/providers/openInterest/provider";
import { fetchMarketBreadth } from "@/lib/research/providers/breadth/provider";
import { fetchSectorData } from "@/lib/research/providers/sectors/provider";
import { fetchVolatilityData } from "@/lib/research/providers/volatility/provider";
import { fetchMacroData } from "@/lib/research/providers/macro/provider";
import { normalizeMarketData } from "./normalizer";

export async function collectMarketData(goldPrice: string): Promise<MarketData> {
  const startTime = Date.now();

  const fredKey = process.env.FRED_API_KEY;
  const alphaKey = process.env.ALPHA_VANTAGE_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;
  const newsApiKey = process.env.NEWS_API_KEY;
  const gnewsKey = process.env.GNEWS_API_KEY;

  const providerResults: MarketDataProviderResult[] = [];

  const fredResult = await runProvider<FREDData>("FRED", fredKey ? () => fetchFRED(fredKey) : null, providerResults);

  const alphaResult = await runProvider<AlphaVantageData>("Alpha Vantage", alphaKey ? () => fetchAlphaVantage(alphaKey) : null, providerResults);

  const finnhubResult = await runProvider<FinnhubData>("Finnhub", finnhubKey ? () => fetchFinnhub(finnhubKey) : null, providerResults);

  const newsApiResult = await runProvider<NewsApiData>("NewsAPI", newsApiKey ? () => fetchNewsApi(newsApiKey) : null, providerResults);

  let gnewsResult: GNewsData | null = null;

  const newsApiCount =
    (newsApiResult?.goldNews?.length || 0) +
    (newsApiResult?.fedNews?.length || 0) +
    (newsApiResult?.inflationNews?.length || 0) +
    (newsApiResult?.economicNews?.length || 0) +
    (newsApiResult?.etfNews?.length || 0) +
    (newsApiResult?.centralBankNews?.length || 0);

  if (gnewsKey && newsApiCount < 5) {
    console.info("[market-data] newsapi_insufficient", newsApiCount, "switching to GNews backup");
    gnewsResult = await runProvider<GNewsData>("GNews", () => fetchGNews(gnewsKey), providerResults);
  }

  // STEP: Institutional providers (parallel batch)
  interface InstitutionalResults {
    cot: COTReportData[] | null;
    etf: ETFData | null;
    openInterest: OpenInterestRecord[] | null;
    breadth: BreadthData[] | null;
    sector: SectorData | null;
    volatility: VolatilityData | null;
    macro: MacroData | null;
  }

  const settleProvider = <T>(label: string, promise: Promise<ProviderResult<T>>): Promise<T | null> =>
    promise
      .then((result) => {
        if (result.success && result.data !== null) {
          providerResults.push({ provider: label, success: true, durationMs: 0 });
          return result.data;
        }
        providerResults.push({ provider: label, success: false, durationMs: 0, error: result.error || "unavailable" });
        return null;
      })
      .catch((err) => {
        providerResults.push({ provider: label, success: false, durationMs: 0, error: err instanceof Error ? err.message : String(err) });
        return null;
      });

  const institutionalStart = Date.now();
  const [cotResult, etfResult, oiResult, breadthResult, sectorResult, volResult, macroResult] = await Promise.all([
    settleProvider("COT", fetchCOTReport()),
    settleProvider("ETF", fetchETFData()),
    settleProvider("Open Interest", fetchOpenInterest()),
    settleProvider("Market Breadth", fetchMarketBreadth()),
    settleProvider("Sector Rotation", fetchSectorData()),
    settleProvider("Volatility", fetchVolatilityData()),
    settleProvider("Macro", fetchMacroData()),
  ]);
  const institutionalDuration = Date.now() - institutionalStart;
  console.info("[market-data] institutional_providers_complete", `${institutionalDuration}ms`, {
    successes: [cotResult, etfResult, oiResult, breadthResult, sectorResult, volResult, macroResult].filter(Boolean).length,
    failures: [cotResult, etfResult, oiResult, breadthResult, sectorResult, volResult, macroResult].filter((r) => r === null).length,
  });

  const institutionalData: InstitutionalResults = {
    cot: cotResult,
    etf: etfResult,
    openInterest: oiResult,
    breadth: breadthResult,
    sector: sectorResult,
    volatility: volResult,
    macro: macroResult,
  };

  const totalDuration = Date.now() - startTime;
  console.info("[market-data] collection_complete", {
    totalDurationMs: totalDuration,
    providers: providerResults.length,
    successes: providerResults.filter((r) => r.success).length,
    failures: providerResults.filter((r) => !r.success).length,
    sources: providerResults.filter((r) => r.success).map((r) => r.provider),
  });

  return normalizeMarketData({
    goldPrice,
    fred: fredResult,
    alphaVantage: alphaResult,
    finnhub: finnhubResult,
    newsApi: newsApiResult,
    gnews: gnewsResult,
    providerResults,
    institutionalData,
  });
}

async function runProvider<T>(provider: string, fn: (() => Promise<T>) | null, results: MarketDataProviderResult[]): Promise<T | null> {
  if (!fn) {
    console.info("[market-data] provider_skipped", provider, "No API key configured");
    results.push({ provider, success: false, durationMs: 0, error: "No API key configured" });
    return null;
  }

  const start = Date.now();
  try {
    const data = await fn();
    const durationMs = Date.now() - start;
    console.info("[market-data] provider_success", provider, `${durationMs}ms`);
    results.push({ provider, success: true, durationMs });
    return data;
  } catch (error) {
    const durationMs = Date.now() - start;
    console.info("[market-data] provider_failure", provider, `${durationMs}ms`, error instanceof Error ? error.message : "unknown");
    results.push({ provider, success: false, durationMs, error: error instanceof Error ? error.message : "unknown" });
    return null;
  }
}
