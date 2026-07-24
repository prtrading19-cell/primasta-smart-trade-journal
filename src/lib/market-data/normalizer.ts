import type {
  MarketData,
  MarketDataProviderResult,
  FREDData,
  AlphaVantageData,
  FinnhubData,
  NewsApiData,
  GNewsData,
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

  const allFedNews = [
    ...(newsApi?.fedNews || []),
    ...(finnhub?.fedNews || []),
    ...(gnews?.fedNews || []),
  ];

  const allGoldNews = [
    ...(newsApi?.goldNews || []),
    ...(gnews?.goldNews || []),
  ];

  const allInflationNews = [
    ...(newsApi?.inflationNews || []),
  ];

  const allGeopoliticalNews = [
    ...(newsApi?.geopoliticalNews || []),
  ];

  const marketSentiment = deriveMarketSentiment({
    dxy: alphaVantage?.dxy || "",
    us10Yield: fred?.us10Yield || "",
    goldNews: allGoldNews,
  });

  return {
    goldPrice,
    dxy: alphaVantage?.dxy || "Live Data Unavailable",
    us10Yield: fred?.us10Yield || "Live Data Unavailable",
    us2Yield: fred?.us2Yield || "Live Data Unavailable",
    realYield: fred?.realYield || "Live Data Unavailable",
    fedFundsRate: fred?.fedFundsRate || "Live Data Unavailable",
    marketSentiment,
    goldNews: allGoldNews,
    fedNews: allFedNews,
    inflationNews: allInflationNews,
    geopoliticalNews: allGeopoliticalNews,
    timestamp: new Date().toISOString(),
    sources,
    errors,
    providerResults,
  };
}

function deriveMarketSentiment(params: {
  dxy: string;
  us10Yield: string;
  goldNews: Array<{ title: string; summary: string }>;
}): string {
  const newsText = params.goldNews
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
  ];

  const bearishSignals = [
    /bearish/i,
    /decline/i,
    /drop/i,
    /sell/i,
    /hawkish/i,
    /rate hike/i,
    /strong dollar/i,
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
