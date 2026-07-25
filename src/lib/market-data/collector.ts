import type { MarketData, MarketDataProviderResult, FREDData, AlphaVantageData, FinnhubData, NewsApiData, GNewsData } from "./types";
import { fetchFRED } from "./fred";
import { fetchAlphaVantage } from "./alphaVantage";
import { fetchFinnhub } from "./finnhub";
import { fetchNewsApi } from "./newsApi";
import { fetchGNews } from "./gnews";
import { normalizeMarketData } from "./normalizer";

export async function collectMarketData(goldPrice: string): Promise<MarketData> {
  const startTime = Date.now();

  const fredKey = process.env.FRED_API_KEY;
  const alphaKey = process.env.ALPHA_VANTAGE_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY;
  const newsApiKey = process.env.NEWS_API_KEY;
  const gnewsKey = process.env.GNEWS_API_KEY;

  const providerResults: MarketDataProviderResult[] = [];

  console.info("[DEBUG:COLLECTOR] Starting provider fetches. Keys exist:", {
    fred: Boolean(fredKey),
    alpha: Boolean(alphaKey),
    finnhub: Boolean(finnhubKey),
    newsapi: Boolean(newsApiKey),
    gnews: Boolean(gnewsKey),
  });

  const fredResult = await runProvider<FREDData>("FRED", fredKey ? () => fetchFRED(fredKey) : null, providerResults);
  console.info("[DEBUG:COLLECTOR] FRED result:", fredResult ? {
    us10Yield: fredResult.us10Yield,
    us2Yield: fredResult.us2Yield,
    fedFundsRate: fredResult.fedFundsRate,
    realYield: fredResult.realYield,
    unemploymentRate: fredResult.unemploymentRate,
    gdpGrowth: fredResult.gdpGrowth,
    balanceSheetSize: fredResult.balanceSheetSize,
  } : "NULL");

  const alphaResult = await runProvider<AlphaVantageData>("Alpha Vantage", alphaKey ? () => fetchAlphaVantage(alphaKey) : null, providerResults);
  console.info("[DEBUG:COLLECTOR] AlphaVantage result:", alphaResult ? { dxy: alphaResult.dxy } : "NULL");

  const finnhubResult = await runProvider<FinnhubData>("Finnhub", finnhubKey ? () => fetchFinnhub(finnhubKey) : null, providerResults);
  console.info("[DEBUG:COLLECTOR] Finnhub result:", finnhubResult ? {
    marketNewsCount: finnhubResult.marketNews.length,
    fedNewsCount: finnhubResult.fedNews.length,
    etfNewsCount: finnhubResult.etfNews.length,
    sentimentNewsCount: finnhubResult.sentimentNews.length,
    positioningNewsCount: finnhubResult.positioningNews.length,
  } : "NULL");

  const newsApiResult = await runProvider<NewsApiData>("NewsAPI", newsApiKey ? () => fetchNewsApi(newsApiKey) : null, providerResults);
  console.info("[DEBUG:COLLECTOR] NewsAPI result:", newsApiResult ? {
    goldNewsCount: newsApiResult.goldNews.length,
    fedNewsCount: newsApiResult.fedNews.length,
    inflationNewsCount: newsApiResult.inflationNews.length,
    geopoliticalNewsCount: newsApiResult.geopoliticalNews.length,
    economicNewsCount: newsApiResult.economicNews.length,
    etfNewsCount: newsApiResult.etfNews.length,
    centralBankNewsCount: newsApiResult.centralBankNews.length,
    sentimentNewsCount: newsApiResult.sentimentNews.length,
    positioningNewsCount: newsApiResult.positioningNews.length,
    liquidityNewsCount: newsApiResult.liquidityNews.length,
    seasonalityNewsCount: newsApiResult.seasonalityNews.length,
  } : "NULL");

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

  const totalDuration = Date.now() - startTime;
  console.info("[market-data] collection_complete", {
    totalDurationMs: totalDuration,
    providers: providerResults.length,
    successes: providerResults.filter((r) => r.success).length,
    failures: providerResults.filter((r) => !r.success).length,
    sources: providerResults.filter((r) => r.success).map((r) => r.provider),
  });

  console.info("[DEBUG:COLLECTOR] GNews backup decision:", { newsApiCount, willFetchGNews: gnewsKey && newsApiCount < 5 });

  return normalizeMarketData({
    goldPrice,
    fred: fredResult,
    alphaVantage: alphaResult,
    finnhub: finnhubResult,
    newsApi: newsApiResult,
    gnews: gnewsResult,
    providerResults,
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
