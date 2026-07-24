import type { FinnhubData, NewsItem } from "./types";

const TIMEOUT_MS = 10000;

export async function fetchFinnhub(apiKey: string): Promise<FinnhubData> {
  const from = daysAgo(7);
  const to = daysAgo(0);

  const [marketResult, financialResult] = await Promise.allSettled([
    fetchFinnhubNews(apiKey, "general", from, to),
    fetchFinnhubNews(apiKey, "forex", from, to),
  ]);

  const marketNews = marketResult.status === "fulfilled" ? marketResult.value : [];
  const financialNews = financialResult.status === "fulfilled" ? financialResult.value : [];

  const fedNews = [...marketNews, ...financialNews].filter(
    (item) => /fed|federal reserve|fomc|powell|interest rate/i.test(item.title + item.summary)
  );

  return {
    marketNews: marketNews.slice(0, 10),
    financialNews: financialNews.slice(0, 10),
    fedNews: fedNews.slice(0, 5),
    raw: { marketCount: marketNews.length, financialCount: financialNews.length },
  };
}

interface FinnhubNewsItem {
  category?: string;
  datetime?: number;
  headline?: string;
  id?: number;
  image?: string;
  related?: string;
  source?: string;
  summary?: string;
  url?: string;
}

async function fetchFinnhubNews(
  apiKey: string,
  category: string,
  from: string,
  to: string
): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = new URL("https://finnhub.io/api/v1/news");
    url.searchParams.set("category", category);
    url.searchParams.set("token", apiKey);

    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Finnhub ${category}: HTTP ${response.status}`);
    }

    const data: FinnhubNewsItem[] = await response.json();
    if (!Array.isArray(data)) return [];

    return data.slice(0, 15).map((item) => ({
      title: item.headline || "",
      summary: item.summary || "",
      source: item.source || "Finnhub",
      url: item.url || "",
      publishedAt: item.datetime ? new Date(item.datetime * 1000).toISOString() : "",
    }));
  } catch (error) {
    clearTimeout(timeout);
    throw new Error(`Finnhub ${category}: ${error instanceof Error ? error.message : "unknown"}`);
  }
}

function daysAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().slice(0, 10);
}
