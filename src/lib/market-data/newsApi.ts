import type { NewsApiData, NewsItem } from "./types";

const TIMEOUT_MS = 10000;

export async function fetchNewsApi(apiKey: string): Promise<NewsApiData> {
  const from = daysAgo(7);

  const queries = [
    { key: "gold", query: "gold XAUUSD price" },
    { key: "fed", query: "federal reserve interest rate FOMC" },
    { key: "inflation", query: "inflation CPI PCE" },
    { key: "geopolitics", query: "geopolitics risk crisis war" },
    { key: "economic", query: "US GDP PMI ISM economic growth" },
    { key: "etf", query: "gold ETF GLD flows inflow outflow" },
    { key: "centralBank", query: "central bank gold buying reserves" },
    { key: "sentiment", query: "market sentiment VIX fear greed volatility" },
    { key: "positioning", query: "CFTC gold positioning futures commitment" },
    { key: "liquidity", query: "fed liquidity repo rate balance sheet reserves" },
    { key: "seasonality", query: "gold seasonal trend historical" },
  ];

  const results = await Promise.allSettled(
    queries.map((q) => fetchEverything(apiKey, q.query, from))
  );

  const goldNews = results[0].status === "fulfilled" ? results[0].value : [];
  const fedNews = results[1].status === "fulfilled" ? results[1].value : [];
  const inflationNews = results[2].status === "fulfilled" ? results[2].value : [];
  const geopoliticalNews = results[3].status === "fulfilled" ? results[3].value : [];
  const economicNews = results[4].status === "fulfilled" ? results[4].value : [];
  const etfNews = results[5].status === "fulfilled" ? results[5].value : [];
  const centralBankNews = results[6].status === "fulfilled" ? results[6].value : [];
  const sentimentNews = results[7].status === "fulfilled" ? results[7].value : [];
  const positioningNews = results[8].status === "fulfilled" ? results[8].value : [];
  const liquidityNews = results[9].status === "fulfilled" ? results[9].value : [];
  const seasonalityNews = results[10].status === "fulfilled" ? results[10].value : [];

  return {
    goldNews: goldNews.slice(0, 5),
    fedNews: fedNews.slice(0, 5),
    inflationNews: inflationNews.slice(0, 5),
    geopoliticalNews: geopoliticalNews.slice(0, 5),
    economicNews: economicNews.slice(0, 5),
    etfNews: etfNews.slice(0, 5),
    centralBankNews: centralBankNews.slice(0, 5),
    sentimentNews: sentimentNews.slice(0, 5),
    positioningNews: positioningNews.slice(0, 5),
    liquidityNews: liquidityNews.slice(0, 5),
    seasonalityNews: seasonalityNews.slice(0, 5),
    raw: {
      goldCount: goldNews.length,
      fedCount: fedNews.length,
      inflationCount: inflationNews.length,
      geopoliticsCount: geopoliticalNews.length,
      economicCount: economicNews.length,
      etfCount: etfNews.length,
      centralBankCount: centralBankNews.length,
      sentimentCount: sentimentNews.length,
      positioningCount: positioningNews.length,
      liquidityCount: liquidityNews.length,
      seasonalityCount: seasonalityNews.length,
    },
  };
}

interface NewsApiResponse {
  status?: string;
  totalResults?: number;
  articles?: Array<{
    title?: string;
    description?: string;
    source?: { name?: string };
    url?: string;
    publishedAt?: string;
  }>;
}

async function fetchEverything(apiKey: string, query: string, from: string): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set("q", query);
    url.searchParams.set("from", from);
    url.searchParams.set("sortBy", "relevancy");
    url.searchParams.set("pageSize", "10");
    url.searchParams.set("language", "en");
    url.searchParams.set("apiKey", apiKey);

    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`NewsAPI query="${query}": HTTP ${response.status}`);
    }

    const data: NewsApiResponse = await response.json();
    if (!Array.isArray(data.articles)) return [];

    return data.articles
      .filter((a) => a.title && a.title !== "[Removed]")
      .slice(0, 10)
      .map((item) => ({
        title: item.title || "",
        summary: item.description || "",
        source: item.source?.name || "NewsAPI",
        url: item.url || "",
        publishedAt: item.publishedAt || "",
      }));
  } catch (error) {
    clearTimeout(timeout);
    throw new Error(`NewsAPI query="${query}": ${error instanceof Error ? error.message : "unknown"}`);
  }
}

function daysAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().slice(0, 10);
}
