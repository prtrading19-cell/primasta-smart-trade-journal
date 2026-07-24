import type { GNewsData, NewsItem } from "./types";

const TIMEOUT_MS = 10000;

export async function fetchGNews(apiKey: string): Promise<GNewsData> {
  const queries = [
    { key: "gold", query: "gold XAUUSD" },
    { key: "fed", query: "federal reserve FOMC" },
    { key: "economic", query: "US GDP economic growth PMI" },
    { key: "etf", query: "gold ETF GLD flows" },
    { key: "centralBank", query: "central bank gold buying reserves" },
    { key: "sentiment", query: "market sentiment VIX fear greed" },
    { key: "positioning", query: "CFTC gold futures positioning" },
    { key: "liquidity", query: "fed liquidity repo rate reserves" },
  ];

  const results = await Promise.allSettled(queries.map((q) => fetchGNewsSearch(apiKey, q.query)));

  const goldNews = results[0].status === "fulfilled" ? results[0].value : [];
  const fedNews = results[1].status === "fulfilled" ? results[1].value : [];
  const economicNews = results[2].status === "fulfilled" ? results[2].value : [];
  const etfNews = results[3].status === "fulfilled" ? results[3].value : [];
  const centralBankNews = results[4].status === "fulfilled" ? results[4].value : [];
  const sentimentNews = results[5].status === "fulfilled" ? results[5].value : [];
  const positioningNews = results[6].status === "fulfilled" ? results[6].value : [];
  const liquidityNews = results[7].status === "fulfilled" ? results[7].value : [];

  return {
    goldNews: goldNews.slice(0, 5),
    fedNews: fedNews.slice(0, 5),
    economicNews: economicNews.slice(0, 5),
    etfNews: etfNews.slice(0, 5),
    centralBankNews: centralBankNews.slice(0, 5),
    sentimentNews: sentimentNews.slice(0, 5),
    positioningNews: positioningNews.slice(0, 5),
    liquidityNews: liquidityNews.slice(0, 5),
    raw: { goldCount: goldNews.length, fedCount: fedNews.length },
  };
}

interface GNewsResponse {
  totalArticles?: number;
  articles?: Array<{
    title?: string;
    description?: string;
    source?: { name?: string; url?: string };
    url?: string;
    publishedAt?: string;
  }>;
}

async function fetchGNewsSearch(apiKey: string, query: string): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL("https://gnews.io/api/v4/search");
    url.searchParams.set("q", query);
    url.searchParams.set("lang", "en");
    url.searchParams.set("max", "10");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`GNews query="${query}": HTTP ${response.status}`);
    }

    const data: GNewsResponse = await response.json();
    if (!Array.isArray(data.articles)) return [];

    return data.articles.map((item) => ({
      title: item.title || "",
      summary: item.description || "",
      source: item.source?.name || "GNews",
      url: item.url || "",
      publishedAt: item.publishedAt || "",
    }));
  } catch (error) {
    clearTimeout(timeout);
    throw new Error(`GNews query="${query}": ${error instanceof Error ? error.message : "unknown"}`);
  }
}
