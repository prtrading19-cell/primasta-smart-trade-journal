import type { GNewsData, NewsItem } from "./types";

const TIMEOUT_MS = 10000;

export async function fetchGNews(apiKey: string): Promise<GNewsData> {
  const queries = [
    { key: "gold", query: "gold XAUUSD" },
    { key: "fed", query: "federal reserve FOMC" },
  ];

  const results = await Promise.allSettled(queries.map((q) => fetchGNewsSearch(apiKey, q.query)));

  const goldNews = results[0].status === "fulfilled" ? results[0].value : [];
  const fedNews = results[1].status === "fulfilled" ? results[1].value : [];

  return {
    goldNews: goldNews.slice(0, 5),
    fedNews: fedNews.slice(0, 5),
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
