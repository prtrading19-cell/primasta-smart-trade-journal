import type {
  MarketData,
  MarketDataProviderResult,
  FREDData,
  AlphaVantageData,
  FinnhubData,
  NewsApiData,
  GNewsData,
  NewsItem,
} from "./types";

export function normalizeMarketData(params: {
  goldPrice: string;
  fred: FREDData | null;
  alphaVantage: AlphaVantageData | null;
  finnhub: FinnhubData | null;
  newsApi: NewsApiData | null;
  gnews: GNewsData | null;
  providerResults: MarketDataProviderResult[];
}): MarketData {
  const { goldPrice, fred, alphaVantage, finnhub, newsApi, gnews, providerResults } = params;

  const sources: string[] = [];
  const errors: string[] = [];

  if (fred) sources.push("FRED");
  if (alphaVantage) sources.push("Alpha Vantage");
  if (finnhub) sources.push("Finnhub");
  if (newsApi) sources.push("NewsAPI");
  if (gnews) sources.push("GNews");

  for (const pr of providerResults) {
    if (!pr.success && pr.error) {
      errors.push(`${pr.provider}: ${pr.error}`);
    }
  }

  const allFedNews = mergeNews(
    newsApi?.fedNews,
    finnhub?.fedNews,
    gnews?.fedNews,
  );

  const allGoldNews = mergeNews(
    newsApi?.goldNews,
    gnews?.goldNews,
  );

  const allInflationNews = newsApi?.inflationNews || [];
  const allGeopoliticalNews = newsApi?.geopoliticalNews || [];

  const allEconomicNews = mergeNews(
    newsApi?.economicNews,
    finnhub?.marketNews,
    gnews?.economicNews,
  );

  const allEtfNews = mergeNews(
    newsApi?.etfNews,
    finnhub?.etfNews,
    gnews?.etfNews,
  );

  const allCentralBankNews = mergeNews(
    newsApi?.centralBankNews,
    gnews?.centralBankNews,
  );

  const allSentimentNews = mergeNews(
    newsApi?.sentimentNews,
    finnhub?.sentimentNews,
    gnews?.sentimentNews,
  );

  const allPositioningNews = mergeNews(
    newsApi?.positioningNews,
    finnhub?.positioningNews,
    gnews?.positioningNews,
  );

  const allLiquidityNews = mergeNews(
    newsApi?.liquidityNews,
    gnews?.liquidityNews,
  );

  const marketSentiment = deriveMarketSentiment({
    dxy: alphaVantage?.dxy || "",
    us10Yield: fred?.us10Yield || "",
    goldNews: allGoldNews,
    sentimentNews: allSentimentNews,
  });

  console.info("[DEBUG:NORMALIZER] Merged news counts:", {
    goldNews: allGoldNews.length,
    fedNews: allFedNews.length,
    inflationNews: allInflationNews.length,
    geopoliticalNews: allGeopoliticalNews.length,
    economicNews: allEconomicNews.length,
    etfNews: allEtfNews.length,
    centralBankNews: allCentralBankNews.length,
    sentimentNews: allSentimentNews.length,
    positioningNews: allPositioningNews.length,
    liquidityNews: allLiquidityNews.length,
  });
  console.info("[DEBUG:NORMALIZER] Scalar values:", {
    goldPrice: goldPrice || "(empty)",
    dxy: alphaVantage?.dxy || "(empty)",
    us10Yield: fred?.us10Yield || "(empty)",
    us2Yield: fred?.us2Yield || "(empty)",
    realYield: fred?.realYield || "(empty)",
    fedFundsRate: fred?.fedFundsRate || "(empty)",
    unemploymentRate: fred?.unemploymentRate || "(empty)",
    gdpGrowth: fred?.gdpGrowth || "(empty)",
    balanceSheetSize: fred?.balanceSheetSize || "(empty)",
    vixLevel: extractVixLevel(allSentimentNews) || "(empty)",
    marketSentiment,
    sources,
  });

  return {
    goldPrice,
    dxy: alphaVantage?.dxy || "",
    us10Yield: fred?.us10Yield || "",
    us2Yield: fred?.us2Yield || "",
    realYield: fred?.realYield || "",
    fedFundsRate: fred?.fedFundsRate || "",
    unemploymentRate: fred?.unemploymentRate || "",
    gdpGrowth: fred?.gdpGrowth || "",
    balanceSheetSize: fred?.balanceSheetSize || "",
    vixLevel: extractVixLevel(allSentimentNews),
    marketSentiment,
    goldNews: allGoldNews,
    fedNews: allFedNews,
    inflationNews: allInflationNews,
    geopoliticalNews: allGeopoliticalNews,
    economicNews: allEconomicNews,
    etfNews: allEtfNews,
    centralBankNews: allCentralBankNews,
    sentimentNews: allSentimentNews,
    positioningNews: allPositioningNews,
    liquidityNews: allLiquidityNews,
    timestamp: new Date().toISOString(),
    sources,
    errors,
    providerResults,
  };
}

function mergeNews(...arrays: (NewsItem[] | undefined)[]): NewsItem[] {
  const seen = new Set<string>();
  const result: NewsItem[] = [];
  for (const arr of arrays) {
    if (!arr) continue;
    for (const item of arr) {
      const key = item.title || item.url;
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }
  }
  return result;
}

function extractVixLevel(sentimentNews: NewsItem[]): string {
  for (const item of sentimentNews) {
    const text = `${item.title} ${item.summary}`;
    const vixMatch = text.match(/vix\s*(?:at|rose|fell|jumped|dropped|climbed|slipped)?\s*(?:to|from)?\s*(\d+\.?\d*)/i);
    if (vixMatch) return vixMatch[1];
    const levelMatch = text.match(/volatility.*?(\d+\.?\d*)/i);
    if (levelMatch) return levelMatch[1];
  }
  return "";
}

function deriveMarketSentiment(params: {
  dxy: string;
  us10Yield: string;
  goldNews: Array<{ title: string; summary: string }>;
  sentimentNews: Array<{ title: string; summary: string }>;
}): string {
  const newsText = [...params.goldNews, ...params.sentimentNews]
    .map((n) => `${n.title} ${n.summary}`)
    .join(" ")
    .toLowerCase();

  const bullishSignals = [
    /bullish/i,
    /rally/i,
    /surge/i,
    /record high/i,
    /safe haven/i,
    /dovish/i,
    /rate cut/i,
    /fear/i,
    /panic/i,
    /risk.off/i,
  ];

  const bearishSignals = [
    /bearish/i,
    /decline/i,
    /drop/i,
    /sell/i,
    /hawkish/i,
    /rate hike/i,
    /strong dollar/i,
    /greed/i,
    /euphoria/i,
    /risk.on/i,
  ];

  let bullish = 0;
  let bearish = 0;

  for (const pattern of bullishSignals) {
    if (pattern.test(newsText)) bullish++;
  }

  for (const pattern of bearishSignals) {
    if (pattern.test(newsText)) bearish++;
  }

  if (bullish > bearish + 1) return "Bullish";
  if (bearish > bullish + 1) return "Bearish";
  return "Mixed";
}
