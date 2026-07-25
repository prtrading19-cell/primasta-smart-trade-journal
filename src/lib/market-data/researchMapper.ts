import type { MarketData, NewsItem } from "./types";

export interface MappedSections {
  date: string;
  goldCurrentPrice: string;
  sections: MappedSection[];
  fullSummary: MappedFullSummary;
  dataSources: string[];
  timestamp: string;
}

export interface MappedSection {
  driver: string;
  currentDataValue: string;
  direction: string;
  tenYearYieldDirection: string;
  twoYearYieldDirection: string;
  realYieldsDirection: string;
  fedTone: string;
  rateExpectation: string;
  latestInflationData: string;
  inflationResult: string;
  latestJobsData: string;
  jobsResult: string;
  unemploymentRate: string;
  wageGrowth: string;
  riskLevel: string;
  dxyReaction: string;
  etfFlowDirection: string;
  centralBankDemand: string;
  higherTimeframeBias: string;
  keySupport: string;
  keyResistance: string;
  liquidityArea: string;
  marketStructure: string;
  setupPresent: string;
  setupType: string;
  newsHeadline: string;
  newsSummary: string;
  chartObservation: string;
  sourceLink: string;
  goldImpact: "Bullish Gold" | "Bearish Gold" | "Neutral" | "Mixed-Wait";
  goldTechnicalVerdict: string;
  reason: string;
  gdpGrowth: string;
  pmi: string;
  ism: string;
  economicActivity: string;
  etfFlowMagnitude: string;
  cbBuyingVolume: string;
  cbSellingVolume: string;
  fearGreedIndex: string;
  vixLevel: string;
  riskAppetite: string;
  retailPositioning: string;
  institutionalPositioning: string;
  crowdedTradeRisk: string;
  fundingConditions: string;
  balanceSheetSize: string;
  repoRate: string;
  seasonalPattern: string;
  historicalReturn: string;
  positionCrowding: string;
  shortInterest: string;
  cftcNetLong: string;
}

export interface MappedFullSummary {
  overallGoldBias: "Bullish" | "Bearish" | "Neutral" | "Mixed-Wait";
  bullishDrivers: string[];
  bearishDrivers: string[];
  mixedDrivers: string[];
  strongestBullishDriver: string;
  strongestBearishDriver: string;
  mainRiskToday: string;
  bestSessionToTrade: string;
  preTradeVerdict: "Trade Allowed" | "Wait" | "Avoid Before News" | "Manage Existing Trade Only";
  finalGuidance: string;
  personalRule: string;
}

export function mapMarketDataToResearch(data: MarketData): MappedSections {
  const reportDate = new Date().toISOString().slice(0, 10);
  const goldPrice = data.goldPrice || "Live Data Unavailable";

  const dxyDirection = interpretDXY(data.dxy);
  const us10Direction = interpretYield(data.us10Yield, "US 10Y Yield");
  const us2Direction = interpretYield(data.us2Yield, "US 2Y Yield");
  const realYieldDirection = interpretYield(data.realYield, "Real Yield");
  const fedTone = interpretFedTone(data.fedFundsRate, data.fedNews);
  const inflationDirection = interpretInflation(data.inflationNews);

  console.info("[DEBUG:MAPPER] Interpreted values:", {
    goldPrice,
    dxyDirection,
    us10Direction,
    us2Direction,
    realYieldDirection,
    fedTone,
    inflationDirection,
  });

  const sections: MappedSection[] = [
    mapDXYSection(data, dxyDirection),
    mapYieldSection(data, us10Direction, us2Direction),
    mapRealYieldSection(data, realYieldDirection),
    mapFedSection(data, fedTone),
    mapInflationSection(data, inflationDirection),
    mapNFPSection(data),
    mapGeopoliticsSection(data),
    mapETFSection(data),
    mapTechnicalSection(data, dxyDirection),
    mapEconomicGrowthSection(data),
    mapETFFlowsSection(data),
    mapCentralBankDemandSection(data),
    mapMarketSentimentSection(data),
    mapCrowdPositioningSection(data),
    mapLiquidityConditionsSection(data),
    mapSeasonalitySection(data),
    mapPositionRiskSection(data),
  ];

  for (const s of sections) {
    const emptyFields = Object.entries(s).filter(([k, v]) => k !== "driver" && k !== "goldImpact" && (v === "" || v === undefined || v === null)).map(([k]) => k);
    console.info(`[DEBUG:MAPPER] Section "${s.driver}" impact=${s.goldImpact} empty_fields=${emptyFields.length > 0 ? emptyFields.join(",") : "none"}`);
  }

  const summary = buildSummary(sections);

  return {
    date: reportDate,
    goldCurrentPrice: goldPrice,
    sections,
    fullSummary: summary,
    dataSources: data.sources,
    timestamp: data.timestamp,
  };
}

function emptySection(driver: string): MappedSection {
  return {
    driver,
    currentDataValue: "",
    direction: "",
    tenYearYieldDirection: "",
    twoYearYieldDirection: "",
    realYieldsDirection: "",
    fedTone: "",
    rateExpectation: "",
    latestInflationData: "",
    inflationResult: "",
    latestJobsData: "",
    jobsResult: "",
    unemploymentRate: "",
    wageGrowth: "",
    riskLevel: "",
    dxyReaction: "",
    etfFlowDirection: "",
    centralBankDemand: "",
    higherTimeframeBias: "",
    keySupport: "",
    keyResistance: "",
    liquidityArea: "",
    marketStructure: "",
    setupPresent: "",
    setupType: "",
    newsHeadline: "",
    newsSummary: "",
    chartObservation: "",
    sourceLink: "",
    goldImpact: "Neutral",
    goldTechnicalVerdict: "",
    reason: "",
    gdpGrowth: "",
    pmi: "",
    ism: "",
    economicActivity: "",
    etfFlowMagnitude: "",
    cbBuyingVolume: "",
    cbSellingVolume: "",
    fearGreedIndex: "",
    vixLevel: "",
    riskAppetite: "",
    retailPositioning: "",
    institutionalPositioning: "",
    crowdedTradeRisk: "",
    fundingConditions: "",
    balanceSheetSize: "",
    repoRate: "",
    seasonalPattern: "",
    historicalReturn: "",
    positionCrowding: "",
    shortInterest: "",
    cftcNetLong: "",
  };
}

function newsToCard(data: MarketData, topics: NewsItem[]): { headline: string; summary: string; source: string } {
  const latest = topics[0];
  if (latest) {
    return {
      headline: latest.title,
      summary: `${latest.summary.slice(0, 200)}. Source: ${latest.source}`,
      source: latest.url || "",
    };
  }
  return { headline: "", summary: "", source: "" };
}

function mapDXYSection(data: MarketData, direction: string): MappedSection {
  const news = newsToCard(data, data.goldNews);
  const goldImpact: MappedSection["goldImpact"] = /falling|weak|declin/i.test(direction) ? "Bullish Gold" : /rising|strong|break/i.test(direction) ? "Bearish Gold" : "Mixed-Wait";

  return {
    ...emptySection("DXY / US Dollar Check"),
    currentDataValue: data.dxy || "Live Data Unavailable",
    direction,
    dxyReaction: direction,
    newsHeadline: news.headline || "DXY data from Alpha Vantage",
    newsSummary: news.summary || `DXY direction: ${direction}`,
    chartObservation: `DXY: ${data.dxy}. Direction: ${direction}`,
    sourceLink: news.source || "https://www.alphavantage.co/",
    goldImpact,
    reason: `DXY ${direction.toLowerCase()} suggests ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapYieldSection(data: MarketData, us10Dir: string, us2Dir: string): MappedSection {
  const news = newsToCard(data, data.fedNews);
  const combinedDir = us10Dir.includes("Falling") && us2Dir.includes("Falling") ? "Falling" : us10Dir.includes("Rising") && us2Dir.includes("Rising") ? "Rising" : "Mixed";
  const goldImpact: MappedSection["goldImpact"] = combinedDir === "Falling" ? "Bullish Gold" : combinedDir === "Rising" ? "Bearish Gold" : "Mixed-Wait";

  return {
    ...emptySection("US Yields Check"),
    currentDataValue: `10Y: ${data.us10Yield} | 2Y: ${data.us2Yield}`,
    direction: combinedDir,
    tenYearYieldDirection: us10Dir,
    twoYearYieldDirection: us2Dir,
    newsHeadline: news.headline || "US Treasury Yield Data",
    newsSummary: news.summary || `US 10Y: ${data.us10Yield} | US 2Y: ${data.us2Yield}`,
    chartObservation: `10Y direction: ${us10Dir} | 2Y direction: ${us2Dir}`,
    sourceLink: news.source || "https://fred.stlouisfed.org/",
    goldImpact,
    reason: `US yields ${combinedDir.toLowerCase()} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapRealYieldSection(data: MarketData, direction: string): MappedSection {
  const goldImpact: MappedSection["goldImpact"] = /falling|declin/i.test(direction) ? "Bullish Gold" : /rising|increas/i.test(direction) ? "Bearish Gold" : "Neutral";

  return {
    ...emptySection("Real Yields Check"),
    currentDataValue: data.realYield || "Live Data Unavailable",
    direction,
    realYieldsDirection: direction,
    newsHeadline: "Real Yield Data (FRED DFII10)",
    newsSummary: `Real 10Y yield: ${data.realYield || "unavailable"}. Falling real yields support Gold as store of value.`,
    chartObservation: `Real yield direction: ${direction}`,
    sourceLink: "https://fred.stlouisfed.org/",
    goldImpact,
    reason: `Real yields ${direction.toLowerCase()} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapFedSection(data: MarketData, tone: string): MappedSection {
  const news = newsToCard(data, data.fedNews);
  const goldImpact: MappedSection["goldImpact"] = /dovish|cut|easing/i.test(tone) ? "Bullish Gold" : /hawkish|hold|higher/i.test(tone) ? "Bearish Gold" : "Mixed-Wait";

  return {
    ...emptySection("Fed Tone / FOMC Check"),
    currentDataValue: `Fed Funds Rate: ${data.fedFundsRate || "unavailable"}`,
    direction: tone,
    fedTone: tone,
    rateExpectation: tone,
    newsHeadline: news.headline || "Federal Reserve Data",
    newsSummary: news.summary || `Fed Funds Rate: ${data.fedFundsRate || "unavailable"}`,
    chartObservation: `Fed tone: ${tone}`,
    sourceLink: news.source || "https://fred.stlouisfed.org/",
    goldImpact,
    reason: `Fed tone is ${tone.toLowerCase()} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapInflationSection(data: MarketData, direction: string): MappedSection {
  const news = newsToCard(data, data.inflationNews);
  const goldImpact: MappedSection["goldImpact"] = /softer|declin|cool/i.test(direction) ? "Bullish Gold" : /hot|rising|increas/i.test(direction) ? "Bearish Gold" : "Mixed-Wait";

  return {
    ...emptySection("CPI / PCE Inflation Check"),
    currentDataValue: direction || "Inflation data pending",
    direction,
    latestInflationData: news.headline || "Inflation data from NewsAPI",
    inflationResult: direction,
    newsHeadline: news.headline || "Inflation CPI/PCE Data",
    newsSummary: news.summary || "Inflation data from NewsAPI",
    chartObservation: `Inflation trend: ${direction}`,
    sourceLink: news.source || "https://newsapi.org/",
    goldImpact,
    reason: `Inflation trend: ${direction} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapNFPSection(data: MarketData): MappedSection {
  const news = newsToCard(data, data.economicNews);
  const unemployment = data.unemploymentRate;
  const gdp = data.gdpGrowth;

  const hasRealData = Boolean(unemployment || gdp || news.headline);

  if (!hasRealData) {
    return {
      ...emptySection("NFP / Jobs Check"),
      currentDataValue: "Live Data Unavailable",
      direction: "Awaiting data",
      latestJobsData: "No dedicated jobs API configured yet",
      jobsResult: "Mixed-Wait",
      unemploymentRate: "Live Data Unavailable",
      wageGrowth: "Live Data Unavailable",
      newsHeadline: "NFP / Jobs data pending",
      newsSummary: "No dedicated jobs/NFP API configured. Manual input recommended.",
      chartObservation: "Jobs data not available from current API sources",
      sourceLink: "Not found",
      goldImpact: "Mixed-Wait",
      reason: "Jobs data unavailable - await manual input or BLS API integration",
    };
  }

  const unemploymentTrend = interpretUnemployment(unemployment);
  const goldImpact: MappedSection["goldImpact"] = /rising|weakening/i.test(unemploymentTrend) ? "Bullish Gold" : /falling|strong/i.test(unemploymentTrend) ? "Bearish Gold" : "Mixed-Wait";

  return {
    ...emptySection("NFP / Jobs Check"),
    currentDataValue: `Unemployment: ${unemployment || "N/A"} | GDP Growth: ${gdp || "N/A"}`,
    direction: unemploymentTrend,
    latestJobsData: news.headline || `Unemployment: ${unemployment || "N/A"}`,
    jobsResult: goldImpact === "Bullish Gold" ? "Weaker Than Expected" : goldImpact === "Bearish Gold" ? "Stronger Than Expected" : "Mixed",
    unemploymentRate: unemployment || "Live Data Unavailable",
    wageGrowth: "",
    newsHeadline: news.headline || "US Employment Data (FRED UNRATE)",
    newsSummary: news.summary || `Unemployment: ${unemployment || "N/A"}. ${unemploymentTrend}`,
    chartObservation: `Unemployment trend: ${unemploymentTrend}`,
    sourceLink: news.source || "https://fred.stlouisfed.org/",
    goldImpact,
    reason: `Employment: ${unemploymentTrend.toLowerCase()} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapGeopoliticsSection(data: MarketData): MappedSection {
  const news = newsToCard(data, data.geopoliticalNews);
  const hasHighRisk = data.geopoliticalNews.some((n) => /war|crisis|attack|sanction|escalat/i.test(`${n.title} ${n.summary}`));

  return {
    ...emptySection("Geopolitics / Risk Sentiment Check"),
    currentDataValue: hasHighRisk ? "Elevated geopolitical risk" : "Moderate",
    direction: hasHighRisk ? "Risk-On" : "Neutral",
    riskLevel: hasHighRisk ? "High" : "Moderate",
    newsHeadline: news.headline || "Geopolitical conditions moderate",
    newsSummary: news.summary || "No significant geopolitical news from recent sources",
    chartObservation: `Geopolitical risk level: ${hasHighRisk ? "Elevated" : "Moderate"}`,
    sourceLink: news.source || "https://newsapi.org/",
    goldImpact: hasHighRisk ? "Bullish Gold" : "Neutral",
    reason: hasHighRisk ? "Elevated geopolitical risk = safe haven demand for Gold" : "Moderate geopolitical conditions = neutral impact on Gold",
  };
}

function mapETFSection(data: MarketData): MappedSection {
  const news = newsToCard(data, data.etfNews);
  const cbNews = newsToCard(data, data.centralBankNews);

  const hasEtfData = data.etfNews.length > 0;
  const hasCbData = data.centralBankNews.length > 0;

  const etfDirection = interpretEtfFlows(data.etfNews);
  const cbDemand = interpretCentralBankDemand(data.centralBankNews);

  const goldImpact: MappedSection["goldImpact"] =
    etfDirection === "Inflows" && cbDemand === "Strong Buying" ? "Bullish Gold" :
    etfDirection === "Outflows" && cbDemand === "Selling" ? "Bearish Gold" :
    etfDirection === "Inflows" || cbDemand === "Strong Buying" ? "Bullish Gold" :
    etfDirection === "Outflows" || cbDemand === "Selling" ? "Bearish Gold" :
    "Mixed-Wait";

  return {
    ...emptySection("ETF / Central Bank Demand Check"),
    currentDataValue: hasEtfData || hasCbData
      ? `ETF: ${etfDirection} | CB: ${cbDemand}`
      : "Live Data Unavailable",
    direction: etfDirection,
    etfFlowDirection: etfDirection,
    centralBankDemand: cbDemand,
    newsHeadline: news.headline || cbNews.headline || "ETF/CB data pending",
    newsSummary: news.summary || cbNews.summary || "ETF and central bank flow data from NewsAPI",
    chartObservation: `ETF flow: ${etfDirection} | Central Bank demand: ${cbDemand}`,
    sourceLink: news.source || cbNews.source || "https://newsapi.org/",
    goldImpact,
    reason: `ETF flows: ${etfDirection}, CB demand: ${cbDemand} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapTechnicalSection(data: MarketData, dxyDirection: string): MappedSection {
  const goldImpact: MappedSection["goldImpact"] = /falling|weak|declin/i.test(dxyDirection) ? "Bullish Gold" : /rising|strong|break/i.test(dxyDirection) ? "Bearish Gold" : "Mixed-Wait";

  return {
    ...emptySection("Gold Technical Structure Check"),
    currentDataValue: `Gold: ${data.goldPrice || "unavailable"} | DXY: ${data.dxy || "unavailable"}`,
    higherTimeframeBias: dxyDirection.includes("Falling") ? "Bullish" : dxyDirection.includes("Rising") ? "Bearish" : "Neutral",
    marketStructure: dxyDirection.includes("Falling") ? "Bullish" : dxyDirection.includes("Rising") ? "Bearish" : "Ranging",
    keySupport: "",
    keyResistance: "",
    liquidityArea: "",
    setupPresent: "",
    setupType: "",
    newsHeadline: `Gold at ${data.goldPrice || "unavailable"}`,
    newsSummary: `Current Gold price: ${data.goldPrice || "unavailable"}. DXY trend: ${dxyDirection}. Confirm levels on chart.`,
    chartObservation: `Gold: ${data.goldPrice || "unavailable"} | DXY: ${data.dxy || "unavailable"} | DXY direction: ${dxyDirection}`,
    sourceLink: "https://twelvedata.com/",
    goldImpact,
    goldTechnicalVerdict: goldImpact === "Bullish Gold" ? "Buy" : goldImpact === "Bearish Gold" ? "Sell" : "Wait",
    reason: `Technical outlook based on Gold price and DXY correlation. DXY: ${dxyDirection}`,
  };
}

function mapEconomicGrowthSection(data: MarketData): MappedSection {
  const news = newsToCard(data, data.economicNews);
  const gdp = data.gdpGrowth;
  const pmiText = extractFromNews(data.economicNews, /pmi|purchasing managers/i);
  const ismText = extractFromNews(data.economicNews, /ism|institute for supply management/i);
  const activity = interpretEconomicActivity(gdp, data.economicNews);

  const goldImpact: MappedSection["goldImpact"] =
    /contracting|slowing|weak/i.test(activity) ? "Bullish Gold" :
    /expanding|strong|growing/i.test(activity) ? "Bearish Gold" :
    "Mixed-Wait";

  return {
    ...emptySection("Economic Growth Check"),
    currentDataValue: gdp || "Live Data Unavailable",
    gdpGrowth: gdp || "Live Data Unavailable",
    pmi: pmiText || "Data from NewsAPI",
    ism: ismText || "Data from NewsAPI",
    economicActivity: activity,
    newsHeadline: news.headline || "US Economic Growth Data",
    newsSummary: news.summary || `GDP Growth: ${gdp || "N/A"}. PMI: ${pmiText || "N/A"}. ISM: ${ismText || "N/A"}.`,
    chartObservation: `Economic activity: ${activity}. GDP: ${gdp || "N/A"}`,
    sourceLink: news.source || "https://fred.stlouisfed.org/",
    goldImpact,
    reason: `Economic activity: ${activity.toLowerCase()} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapETFFlowsSection(data: MarketData): MappedSection {
  const news = newsToCard(data, data.etfNews);
  const flowDirection = interpretEtfFlows(data.etfNews);
  const flowMagnitude = interpretFlowMagnitude(data.etfNews);

  const goldImpact: MappedSection["goldImpact"] =
    flowDirection === "Inflows" ? "Bullish Gold" :
    flowDirection === "Outflows" ? "Bearish Gold" :
    "Neutral";

  return {
    ...emptySection("Gold ETF Flows Check"),
    currentDataValue: flowDirection !== "Unknown" ? `ETF Flow: ${flowDirection} (${flowMagnitude})` : "Live Data Unavailable",
    etfFlowDirection: flowDirection,
    etfFlowMagnitude: flowMagnitude,
    newsHeadline: news.headline || "Gold ETF Flow Data",
    newsSummary: news.summary || `ETF flow direction: ${flowDirection}. Magnitude: ${flowMagnitude}.`,
    chartObservation: `ETF flow: ${flowDirection} | Magnitude: ${flowMagnitude}`,
    sourceLink: news.source || "https://newsapi.org/",
    goldImpact,
    reason: `Gold ETF flows ${flowDirection.toLowerCase()} at ${flowMagnitude.toLowerCase()} magnitude = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapCentralBankDemandSection(data: MarketData): MappedSection {
  const news = newsToCard(data, data.centralBankNews);
  const demand = interpretCentralBankDemand(data.centralBankNews);

  const goldImpact: MappedSection["goldImpact"] =
    /strong|heavy|aggressive/i.test(demand) ? "Bullish Gold" :
    /selling|reducing|divesting/i.test(demand) ? "Bearish Gold" :
    "Neutral";

  return {
    ...emptySection("Central Bank Demand Check"),
    currentDataValue: demand !== "Unknown" ? `CB Demand: ${demand}` : "Live Data Unavailable",
    cbBuyingVolume: /buying|buy|accumulat/i.test(demand) ? "Moderate Buying" : /strong|heavy/i.test(demand) ? "Heavy Buying" : "Light Buying",
    cbSellingVolume: /selling|sell|divest/i.test(demand) ? "Moderate Selling" : "Light Selling",
    newsHeadline: news.headline || "Central Bank Gold Demand Data",
    newsSummary: news.summary || `Central bank demand: ${demand}.`,
    chartObservation: `Central bank demand: ${demand}`,
    sourceLink: news.source || "https://newsapi.org/",
    goldImpact,
    reason: `Central bank demand: ${demand} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapMarketSentimentSection(data: MarketData): MappedSection {
  const news = newsToCard(data, data.sentimentNews);
  const vix = data.vixLevel;
  const sentiment = data.marketSentiment;
  const fearGreed = extractFromNews(data.sentimentNews, /fear.*?greed|fear.*?index/i);
  const riskAppetite = interpretRiskAppetite(vix, data.sentimentNews);

  const goldImpact: MappedSection["goldImpact"] =
    /fear|panic|risk.off|high vix/i.test(riskAppetite) ? "Bullish Gold" :
    /greed|euphoria|risk.on|low vix/i.test(riskAppetite) ? "Bearish Gold" :
    "Neutral";

  return {
    ...emptySection("Market Sentiment Check"),
    currentDataValue: vix ? `VIX: ${vix}` : sentiment || "Live Data Unavailable",
    fearGreedIndex: fearGreed || "Data from NewsAPI",
    vixLevel: vix || "Live Data Unavailable",
    riskAppetite,
    newsHeadline: news.headline || "Market Sentiment Data",
    newsSummary: news.summary || `VIX: ${vix || "N/A"}. Sentiment: ${sentiment}. Risk appetite: ${riskAppetite}.`,
    chartObservation: `VIX: ${vix || "N/A"} | Risk appetite: ${riskAppetite} | Market sentiment: ${sentiment}`,
    sourceLink: news.source || "https://newsapi.org/",
    goldImpact,
    reason: `Market sentiment: ${riskAppetite} = ${goldImpact.toLowerCase()} for Gold (safe-haven demand)`,
  };
}

function mapCrowdPositioningSection(data: MarketData): MappedSection {
  const news = newsToCard(data, data.positioningNews);
  const positioning = interpretCrowdPositioning(data.positioningNews);
  const crowdedRisk = interpretCrowdedTradeRisk(data.positioningNews);

  const goldImpact: MappedSection["goldImpact"] =
    /crowded long|heavily long|retail long/i.test(positioning) ? "Bearish Gold" :
    /crowded short|heavily short|retail short/i.test(positioning) ? "Bullish Gold" :
    "Neutral";

  return {
    ...emptySection("Crowd Positioning Check"),
    currentDataValue: `Positioning: ${positioning} | Risk: ${crowdedRisk}`,
    retailPositioning: extractFromNews(data.positioningNews, /retail/i) || "Data from positioning news",
    institutionalPositioning: extractFromNews(data.positioningNews, /institution|smart money|hedg/i) || "Data from positioning news",
    crowdedTradeRisk: crowdedRisk,
    newsHeadline: news.headline || "Gold Positioning Data",
    newsSummary: news.summary || `Positioning: ${positioning}. Crowded trade risk: ${crowdedRisk}.`,
    chartObservation: `Crowd positioning: ${positioning} | Crowded risk: ${crowdedRisk}`,
    sourceLink: news.source || "https://newsapi.org/",
    goldImpact,
    reason: `Crowd positioning: ${positioning}, crowded risk: ${crowdedRisk} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapLiquidityConditionsSection(data: MarketData): MappedSection {
  const news = newsToCard(data, data.liquidityNews);
  const balanceSheet = data.balanceSheetSize;
  const funding = interpretFundingConditions(data.liquidityNews, balanceSheet);
  const repoRate = extractFromNews(data.liquidityNews, /repo\s*rate/i) || data.fedFundsRate;

  const goldImpact: MappedSection["goldImpact"] =
    /loose|expansionary|easing|growing/i.test(funding) ? "Bullish Gold" :
    /tight|restrictive|contracting|shrinking/i.test(funding) ? "Bearish Gold" :
    "Neutral";

  return {
    ...emptySection("Liquidity Conditions Check"),
    currentDataValue: balanceSheet ? `Balance Sheet: ${balanceSheet} | Funding: ${funding}` : "Live Data Unavailable",
    fundingConditions: funding,
    balanceSheetSize: balanceSheet || "Live Data Unavailable",
    repoRate: repoRate || "Live Data Unavailable",
    newsHeadline: news.headline || "Liquidity Conditions Data",
    newsSummary: news.summary || `Funding: ${funding}. Balance sheet: ${balanceSheet || "N/A"}. Repo rate: ${repoRate || "N/A"}.`,
    chartObservation: `Funding conditions: ${funding} | Balance sheet: ${balanceSheet || "N/A"}`,
    sourceLink: news.source || "https://fred.stlouisfed.org/",
    goldImpact,
    reason: `Liquidity conditions: ${funding.toLowerCase()} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapSeasonalitySection(data: MarketData): MappedSection {
  const month = new Date().getMonth();
  const { pattern, avgReturn, goldImpact } = getSeasonalPattern(month);
  const news = newsToCard(data, data.goldNews);

  return {
    ...emptySection("Seasonality Check"),
    currentDataValue: `Month: ${new Date().toLocaleString("default", { month: "long" })} | Pattern: ${pattern}`,
    seasonalPattern: pattern,
    historicalReturn: avgReturn,
    newsHeadline: news.headline || `Seasonal pattern for ${new Date().toLocaleString("default", { month: "long" })}`,
    newsSummary: `${pattern} for Gold in ${new Date().toLocaleString("default", { month: "long" })}. Historical average return: ${avgReturn}.`,
    chartObservation: `Seasonal pattern: ${pattern} | Historical return: ${avgReturn}`,
    sourceLink: "https://www.gold.org/goldhub/data/gold-seasonality",
    goldImpact,
    reason: `${pattern} in ${new Date().toLocaleString("default", { month: "long" })} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapPositionRiskSection(data: MarketData): MappedSection {
  const news = newsToCard(data, data.positioningNews);
  const shortInterest = extractFromNews(data.positioningNews, /short\s*interest/i) || "";
  const cftcData = extractFromNews(data.positioningNews, /cftc|commitment|cot/i) || "";
  const crowding = interpretPositionCrowding(data.positioningNews);

  const goldImpact: MappedSection["goldImpact"] =
    /high|crowded|extreme/i.test(crowding) ? "Bearish Gold" :
    /low|sparse|light/i.test(crowding) ? "Bullish Gold" :
    "Neutral";

  return {
    ...emptySection("Position Risk Check"),
    currentDataValue: `Short Interest: ${shortInterest || "N/A"} | CFTC: ${cftcData || "N/A"}`,
    shortInterest: shortInterest || "Data from positioning news",
    cftcNetLong: cftcData || "Data from positioning news",
    positionCrowding: crowding,
    newsHeadline: news.headline || "Position Risk Data",
    newsSummary: news.summary || `Short interest: ${shortInterest || "N/A"}. CFTC: ${cftcData || "N/A"}. Crowding: ${crowding}.`,
    chartObservation: `Position crowding: ${crowding} | Short interest: ${shortInterest || "N/A"}`,
    sourceLink: news.source || "https://newsapi.org/",
    goldImpact,
    reason: `Position risk: crowding=${crowding}, short interest=${shortInterest || "N/A"} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function buildSummary(sections: MappedSection[]): MappedFullSummary {
  const bullish = sections.filter((s) => s.goldImpact === "Bullish Gold");
  const bearish = sections.filter((s) => s.goldImpact === "Bearish Gold");
  const mixed = sections.filter((s) => s.goldImpact === "Mixed-Wait");
  const neutral = sections.filter((s) => s.goldImpact === "Neutral");

  const hasHighRisk = sections.some((s) => /cpi|pce|nfp|fomc/i.test(`${s.newsHeadline} ${s.newsSummary}`));

  let overallGoldBias: "Bullish" | "Bearish" | "Neutral" | "Mixed-Wait" = "Mixed-Wait";
  if (bullish.length >= 5 && bearish.length <= 2) overallGoldBias = "Bullish";
  else if (bearish.length >= 5 && bullish.length <= 2) overallGoldBias = "Bearish";
  else if (neutral.length >= 5 && bullish.length <= 2 && bearish.length <= 2) overallGoldBias = "Neutral";

  let preTradeVerdict: "Trade Allowed" | "Wait" | "Avoid Before News" | "Manage Existing Trade Only" = "Wait";
  if (hasHighRisk) preTradeVerdict = "Avoid Before News";
  else if (overallGoldBias === "Mixed-Wait") preTradeVerdict = "Wait";
  else if (overallGoldBias === "Neutral") preTradeVerdict = "Manage Existing Trade Only";
  else preTradeVerdict = "Trade Allowed";

  const strongestBullish = bullish[0]?.driver || "None";
  const strongestBearish = bearish[0]?.driver || "None";

  return {
    overallGoldBias,
    bullishDrivers: bullish.map((s) => s.driver),
    bearishDrivers: bearish.map((s) => s.driver),
    mixedDrivers: mixed.map((s) => s.driver),
    strongestBullishDriver: strongestBullish,
    strongestBearishDriver: strongestBearish,
    mainRiskToday: hasHighRisk ? "Major news risk ahead" : mixed.length > 0 ? `Mixed signals from ${mixed.length} drivers` : "Awaiting full data alignment",
    bestSessionToTrade: hasHighRisk ? "Wait until the major news reaction settles" : "London-New York overlap after technical confirmation",
    preTradeVerdict,
    finalGuidance: "Cross-reference API data with chart levels before executing any trade.",
    personalRule: "I only trade Gold when liquidity, market drivers, technical structure, risk, and psychology agree. If they do not agree, I wait.",
  };
}

function interpretDXY(value: string): string {
  if (!value || value === "Live Data Unavailable") return "Awaiting data";
  if (/10[4-9]\.|1[1-9]\d\./.test(value)) return "Rising above 104";
  if (/9[8-9]\.|10[0-3]\./.test(value)) return "Range-bound 98-103";
  if (/9[0-7]\./.test(value)) return "Falling below 98";
  if (/usd\/eur/i.test(value)) {
    const match = value.match(/([\d.]+)/);
    if (match) {
      const rate = parseFloat(match[1]);
      if (rate > 0.95) return "Falling below 98";
      if (rate > 0.90) return "Range-bound 98-103";
      return "Rising above 104";
    }
  }
  return "Mixed";
}

function interpretYield(value: string, name: string): string {
  if (!value) return "Awaiting data";
  const match = value.match(/([\d.]+)%/);
  if (!match) return "Awaiting data";
  const num = parseFloat(match[1]);
  if (name.includes("10Y")) {
    if (num > 4.5) return "Rising - elevated";
    if (num > 3.8) return "Moderate";
    return "Falling - supportive for Gold";
  }
  if (num > 4.5) return "Rising - elevated";
  if (num > 3.5) return "Moderate";
  return "Falling - supportive for Gold";
}

function interpretFedTone(rate: string, fedNews: Array<{ title: string; summary: string }>): string {
  const newsText = fedNews.map((n) => `${n.title} ${n.summary}`).join(" ").toLowerCase();

  if (/rate cut|dovish|easing|pivot/i.test(newsText)) return "Dovish - rate cuts expected";
  if (/rate hike|hawkish|higher for longer|restrictive/i.test(newsText)) return "Hawkish - rates elevated";
  if (/hold|pause|wait and see/i.test(newsText)) return "Neutral - holding rates";
  return `Fed Funds Rate: ${rate || "unavailable"}`;
}

function interpretInflation(inflationNews: Array<{ title: string; summary: string }>): string {
  if (inflationNews.length === 0) return "No recent inflation news";

  const newsText = inflationNews.map((n) => `${n.title} ${n.summary}`).join(" ").toLowerCase();

  if (/cool|declin|fall|easing|below forecast/i.test(newsText)) return "Cooling - supports Gold";
  if (/hot|rising|above forecast|stubborn|sticky/i.test(newsText)) return "Hot - weighs on Gold";
  return "Mixed signals on inflation";
}

function interpretUnemployment(value: string): string {
  if (!value) return "Awaiting data";
  const match = value.match(/([\d.]+)%/);
  if (!match) return "Awaiting data";
  const num = parseFloat(match[1]);
  if (num > 4.5) return "Rising - weakening labor market";
  if (num > 4.0) return "Moderate";
  return "Falling - strong labor market";
}

function interpretEconomicActivity(gdp: string, news: Array<{ title: string; summary: string }>): string {
  const newsText = news.map((n) => `${n.title} ${n.summary}`).join(" ").toLowerCase();

  if (/contract|recession|slow|decline|shrink/i.test(newsText)) return "Contracting";
  if (/expand|grow|strong|robust|accelerat/i.test(newsText)) return "Expanding";
  if (gdp) {
    const match = gdp.match(/([\d.]+)%/);
    if (match) {
      const num = parseFloat(match[1]);
      if (num > 2.5) return "Expanding";
      if (num > 0) return "Stable";
      return "Contracting";
    }
  }
  return "Stable";
}

function interpretEtfFlows(news: Array<{ title: string; summary: string }>): string {
  const newsText = news.map((n) => `${n.title} ${n.summary}`).join(" ").toLowerCase();
  if (/inflow|inflow|accumulat|buy|record.*demand/i.test(newsText)) return "Inflows";
  if (/outflow|outflow|reduc|sell|withdraw/i.test(newsText)) return "Outflows";
  return "Unknown";
}

function interpretFlowMagnitude(news: Array<{ title: string; summary: string }>): string {
  const newsText = news.map((n) => `${n.title} ${n.summary}`).join(" ").toLowerCase();
  if (/record|massive|huge|significant|surge/i.test(newsText)) return "Large";
  if (/moderate|steady|regular|consistent/i.test(newsText)) return "Moderate";
  return "Small";
}

function interpretCentralBankDemand(news: Array<{ title: string; summary: string }>): string {
  const newsText = news.map((n) => `${n.title} ${n.summary}`).join(" ").toLowerCase();
  if (/heavy buying|record|massive|aggressive|strong buying/i.test(newsText)) return "Strong Buying";
  if (/buying|accumulat|adding|purchas/i.test(newsText)) return "Moderate Buying";
  if (/selling|divest|reduc|offload/i.test(newsText)) return "Selling";
  return "Unknown";
}

function interpretRiskAppetite(vix: string, news: Array<{ title: string; summary: string }>): string {
  if (vix) {
    const match = vix.match(/([\d.]+)/);
    if (match) {
      const num = parseFloat(match[1]);
      if (num > 30) return "Risk-Off (High VIX)";
      if (num > 20) return "Mixed (Moderate VIX)";
      return "Risk-On (Low VIX)";
    }
  }
  const newsText = news.map((n) => `${n.title} ${n.summary}`).join(" ").toLowerCase();
  if (/fear|panic|crash|selloff|risk.off/i.test(newsText)) return "Risk-Off";
  if (/greed|euphoria|rally|risk.on/i.test(newsText)) return "Risk-On";
  return "Mixed";
}

function interpretCrowdPositioning(news: Array<{ title: string; summary: string }>): string {
  const newsText = news.map((n) => `${n.title} ${n.summary}`).join(" ").toLowerCase();
  if (/retail.*long|retail.*bullish|crowded long/i.test(newsText)) return "Retail Long (Crowded)";
  if (/retail.*short|retail.*bearish|crowded short/i.test(newsText)) return "Retail Short (Crowded)";
  if (/institution.*long|smart money.*long/i.test(newsText)) return "Institutional Long";
  if (/institution.*short|smart money.*short/i.test(newsText)) return "Institutional Short";
  return "Mixed";
}

function interpretCrowdedTradeRisk(news: Array<{ title: string; summary: string }>): string {
  const newsText = news.map((n) => `${n.title} ${n.summary}`).join(" ").toLowerCase();
  if (/crowded|extreme|heavily|record.*position/i.test(newsText)) return "High";
  if (/moderate|normal|balanced/i.test(newsText)) return "Moderate";
  return "Low";
}

function interpretFundingConditions(news: Array<{ title: string; summary: string }>, balanceSheet: string): string {
  const newsText = news.map((n) => `${n.title} ${n.summary}`).join(" ").toLowerCase();
  if (/loose|expansionary|easing|growing|inject/i.test(newsText)) return "Loose";
  if (/tight|restrictive|contracting|shrinking|drain/i.test(newsText)) return "Tight";
  if (balanceSheet) {
    const match = balanceSheet.match(/\$([\d.]+)B/);
    if (match) {
      const billions = parseFloat(match[1]);
      if (billions > 8000) return "Loose";
      if (billions > 6000) return "Normalizing";
      return "Tight";
    }
  }
  return "Normalizing";
}

function interpretPositionCrowding(news: Array<{ title: string; summary: string }>): string {
  const newsText = news.map((n) => `${n.title} ${n.summary}`).join(" ").toLowerCase();
  if (/crowded|extreme|heavily|record|unprecedented/i.test(newsText)) return "High";
  if (/moderate|balanced|normal/i.test(newsText)) return "Moderate";
  return "Low";
}

function getSeasonalPattern(month: number): { pattern: string; avgReturn: string; goldImpact: "Bullish Gold" | "Bearish Gold" | "Neutral" } {
  const patterns: Record<number, { pattern: string; avgReturn: string; goldImpact: "Bullish Gold" | "Bearish Gold" | "Neutral" }> = {
    0:  { pattern: "Historically Bullish", avgReturn: "+3.2%", goldImpact: "Bullish Gold" },
    1:  { pattern: "Historically Bullish", avgReturn: "+2.8%", goldImpact: "Bullish Gold" },
    2:  { pattern: "Neutral", avgReturn: "+0.5%", goldImpact: "Neutral" },
    3:  { pattern: "Neutral", avgReturn: "+0.3%", goldImpact: "Neutral" },
    4:  { pattern: "Historically Bearish", avgReturn: "-1.2%", goldImpact: "Bearish Gold" },
    5:  { pattern: "Neutral", avgReturn: "+0.1%", goldImpact: "Neutral" },
    6:  { pattern: "Neutral", avgReturn: "+0.8%", goldImpact: "Neutral" },
    7:  { pattern: "Historically Bullish", avgReturn: "+2.5%", goldImpact: "Bullish Gold" },
    8:  { pattern: "Historically Bullish", avgReturn: "+3.1%", goldImpact: "Bullish Gold" },
    9:  { pattern: "Neutral", avgReturn: "+0.4%", goldImpact: "Neutral" },
    10: { pattern: "Neutral", avgReturn: "+0.6%", goldImpact: "Neutral" },
    11: { pattern: "Historically Bullish", avgReturn: "+2.0%", goldImpact: "Bullish Gold" },
  };
  return patterns[month] || { pattern: "Neutral", avgReturn: "+0.5%", goldImpact: "Neutral" };
}

function extractVixLevel(sentimentNews: Array<{ title: string; summary: string }>): string {
  for (const item of sentimentNews) {
    const text = `${item.title} ${item.summary}`;
    const match = text.match(/vix\s*(?:at|rose|fell|jumped|dropped|climbed|slipped)?\s*(?:to|from)?\s*(\d+\.?\d*)/i);
    if (match) return match[1];
  }
  return "";
}

function extractFromNews(news: NewsItem[], pattern: RegExp): string {
  for (const item of news) {
    const text = `${item.title} ${item.summary}`;
    if (pattern.test(text)) {
      return item.title || item.summary.slice(0, 150);
    }
  }
  return "";
}
