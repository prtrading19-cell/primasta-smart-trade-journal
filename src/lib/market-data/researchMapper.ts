import type { MarketData } from "./types";

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
  const sentimentDirection = interpretSentiment(data.marketSentiment, data.goldNews);

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
  ];

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

function mapDXYSection(data: MarketData, direction: string): MappedSection {
  const latest = data.goldNews[0] || data.fedNews[0];
  const goldImpact = /falling|weak|declin/i.test(direction) ? "Bullish Gold" : /rising|strong|break/i.test(direction) ? "Bearish Gold" : "Mixed-Wait";

  return {
    driver: "DXY / US Dollar Check",
    currentDataValue: data.dxy,
    direction,
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
    dxyReaction: direction,
    etfFlowDirection: "",
    centralBankDemand: "",
    higherTimeframeBias: "",
    keySupport: "",
    keyResistance: "",
    liquidityArea: "",
    marketStructure: "",
    setupPresent: "",
    setupType: "",
    newsHeadline: latest?.title || "DXY data from Alpha Vantage",
    newsSummary: latest ? `${latest.summary.slice(0, 150)}. Source: ${latest.source}` : `USD/EUR exchange rate data from Alpha Vantage`,
    chartObservation: `DXY: ${data.dxy}. Direction: ${direction}`,
    sourceLink: latest?.url || "https://www.alphavantage.co/",
    goldImpact,
    goldTechnicalVerdict: "",
    reason: `DXY ${direction.toLowerCase()} suggests ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapYieldSection(data: MarketData, us10Dir: string, us2Dir: string): MappedSection {
  const latest = data.fedNews[0];
  const combinedDir = us10Dir.includes("Falling") && us2Dir.includes("Falling") ? "Falling" : us10Dir.includes("Rising") && us2Dir.includes("Rising") ? "Rising" : "Mixed";
  const goldImpact = combinedDir === "Falling" ? "Bullish Gold" : combinedDir === "Rising" ? "Bearish Gold" : "Mixed-Wait";

  return {
    driver: "US Yields Check",
    currentDataValue: `10Y: ${data.us10Yield} | 2Y: ${data.us2Yield}`,
    direction: combinedDir,
    tenYearYieldDirection: us10Dir,
    twoYearYieldDirection: us2Dir,
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
    newsHeadline: latest?.title || "US Treasury Yield Data",
    newsSummary: latest ? `${latest.summary.slice(0, 150)}. Source: ${latest.source}` : `US 10Y: ${data.us10Yield} | US 2Y: ${data.us2Yield}`,
    chartObservation: `10Y direction: ${us10Dir} | 2Y direction: ${us2Dir}`,
    sourceLink: latest?.url || "https://fred.stlouisfed.org/",
    goldImpact,
    goldTechnicalVerdict: "",
    reason: `US yields ${combinedDir.toLowerCase()} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapRealYieldSection(data: MarketData, direction: string): MappedSection {
  const goldImpact = /falling|declin/i.test(direction) ? "Bullish Gold" : /rising|increas/i.test(direction) ? "Bearish Gold" : "Neutral";

  return {
    driver: "Real Yields Check",
    currentDataValue: data.realYield,
    direction,
    tenYearYieldDirection: "",
    twoYearYieldDirection: "",
    realYieldsDirection: direction,
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
    newsHeadline: "Real Yield Data (FRED DFII10)",
    newsSummary: `Real 10Y yield: ${data.realYield}. Falling real yields support Gold as store of value.`,
    chartObservation: `Real yield direction: ${direction}`,
    sourceLink: "https://fred.stlouisfed.org/",
    goldImpact,
    goldTechnicalVerdict: "",
    reason: `Real yields ${direction.toLowerCase()} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapFedSection(data: MarketData, tone: string): MappedSection {
  const latest = data.fedNews[0];
  const goldImpact = /dovish|cut|easing/i.test(tone) ? "Bullish Gold" : /hawkish|hold|higher/i.test(tone) ? "Bearish Gold" : "Mixed-Wait";

  return {
    driver: "Fed Tone / FOMC Check",
    currentDataValue: `Fed Funds Rate: ${data.fedFundsRate}`,
    direction: tone,
    tenYearYieldDirection: "",
    twoYearYieldDirection: "",
    realYieldsDirection: "",
    fedTone: tone,
    rateExpectation: tone,
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
    newsHeadline: latest?.title || "Federal Reserve Data",
    newsSummary: latest ? `${latest.summary.slice(0, 150)}. Source: ${latest.source}` : `Fed Funds Rate: ${data.fedFundsRate}`,
    chartObservation: `Fed tone: ${tone}`,
    sourceLink: latest?.url || "https://fred.stlouisfed.org/",
    goldImpact,
    goldTechnicalVerdict: "",
    reason: `Fed tone is ${tone.toLowerCase()} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapInflationSection(data: MarketData, direction: string): MappedSection {
  const latest = data.inflationNews[0];
  const goldImpact = /softer|declin|cool/i.test(direction) ? "Bullish Gold" : /hot|rising|increas/i.test(direction) ? "Bearish Gold" : "Mixed-Wait";

  return {
    driver: "CPI / PCE Inflation Check",
    currentDataValue: direction || "Inflation data pending",
    direction,
    tenYearYieldDirection: "",
    twoYearYieldDirection: "",
    realYieldsDirection: "",
    fedTone: "",
    rateExpectation: "",
    latestInflationData: latest?.title || "Inflation data from NewsAPI",
    inflationResult: direction,
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
    newsHeadline: latest?.title || "Inflation CPI/PCE Data",
    newsSummary: latest ? `${latest.summary.slice(0, 150)}. Source: ${latest.source}` : "Inflation data from NewsAPI",
    chartObservation: `Inflation trend: ${direction}`,
    sourceLink: latest?.url || "https://newsapi.org/",
    goldImpact,
    goldTechnicalVerdict: "",
    reason: `Inflation trend: ${direction} = ${goldImpact.toLowerCase()} for Gold`,
  };
}

function mapNFPSection(data: MarketData): MappedSection {
  return {
    driver: "NFP / Jobs Check",
    currentDataValue: "Live Data Unavailable",
    direction: "Awaiting data",
    tenYearYieldDirection: "",
    twoYearYieldDirection: "",
    realYieldsDirection: "",
    fedTone: "",
    rateExpectation: "",
    latestInflationData: "",
    inflationResult: "",
    latestJobsData: "No dedicated jobs API configured yet",
    jobsResult: "Mixed-Wait",
    unemploymentRate: "Live Data Unavailable",
    wageGrowth: "Live Data Unavailable",
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
    newsHeadline: "NFP / Jobs data pending",
    newsSummary: "No dedicated jobs/NFP API configured. Manual input recommended.",
    chartObservation: "Jobs data not available from current API sources",
    sourceLink: "Not found",
    goldImpact: "Mixed-Wait",
    goldTechnicalVerdict: "",
    reason: "Jobs data unavailable - await manual input or BLS API integration",
  };
}

function mapGeopoliticsSection(data: MarketData): MappedSection {
  const latest = data.geopoliticalNews[0];
  const hasHighRisk = data.geopoliticalNews.some((n) => /war|crisis|attack|sanction|escalat/i.test(`${n.title} ${n.summary}`));

  return {
    driver: "Geopolitics / Risk Sentiment Check",
    currentDataValue: hasHighRisk ? "Elevated geopolitical risk" : "Moderate",
    direction: hasHighRisk ? "Risk-On" : "Neutral",
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
    riskLevel: hasHighRisk ? "High" : "Moderate",
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
    newsHeadline: latest?.title || "Geopolitical conditions moderate",
    newsSummary: latest ? `${latest.summary.slice(0, 150)}. Source: ${latest.source}` : "No significant geopolitical news from recent sources",
    chartObservation: `Geopolitical risk level: ${hasHighRisk ? "Elevated" : "Moderate"}`,
    sourceLink: latest?.url || "https://newsapi.org/",
    goldImpact: hasHighRisk ? "Bullish Gold" : "Neutral",
    goldTechnicalVerdict: "",
    reason: hasHighRisk ? "Elevated geopolitical risk = safe haven demand for Gold" : "Moderate geopolitical conditions = neutral impact on Gold",
  };
}

function mapETFSection(data: MarketData): MappedSection {
  return {
    driver: "ETF / Central Bank Demand Check",
    currentDataValue: "Manual input recommended for ETF/CB data",
    direction: "Awaiting data",
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
    etfFlowDirection: "Manual input needed",
    centralBankDemand: "Manual input needed",
    higherTimeframeBias: "",
    keySupport: "",
    keyResistance: "",
    liquidityArea: "",
    marketStructure: "",
    setupPresent: "",
    setupType: "",
    newsHeadline: "ETF / Central Bank Demand data pending",
    newsSummary: "No dedicated ETF flow or central bank buying API configured. Manual input recommended.",
    chartObservation: "ETF flow data not available from current API sources",
    sourceLink: "Not found",
    goldImpact: "Mixed-Wait",
    goldTechnicalVerdict: "",
    reason: "ETF/Central Bank data unavailable - await manual input or World Gold Council integration",
  };
}

function mapTechnicalSection(data: MarketData, dxyDirection: string): MappedSection {
  const goldImpact = /falling|weak|declin/i.test(dxyDirection) ? "Bullish Gold" : /rising|strong|break/i.test(dxyDirection) ? "Bearish Gold" : "Mixed-Wait";

  return {
    driver: "Gold Technical Structure Check",
    currentDataValue: `Gold: ${data.goldPrice} | DXY: ${data.dxy}`,
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
    higherTimeframeBias: dxyDirection.includes("Falling") ? "Bullish" : dxyDirection.includes("Rising") ? "Bearish" : "Neutral",
    keySupport: "",
    keyResistance: "",
    liquidityArea: "",
    marketStructure: dxyDirection.includes("Falling") ? "Bullish" : dxyDirection.includes("Rising") ? "Bearish" : "Ranging",
    setupPresent: "",
    setupType: "",
    newsHeadline: `Gold at ${data.goldPrice}`,
    newsSummary: `Current Gold price: ${data.goldPrice}. DXY trend: ${dxyDirection}. Confirm levels on chart.`,
    chartObservation: `Gold: ${data.goldPrice} | DXY: ${data.dxy} | DXY direction: ${dxyDirection}`,
    sourceLink: "https://twelvedata.com/",
    goldImpact,
    goldTechnicalVerdict: goldImpact === "Bullish Gold" ? "Buy" : goldImpact === "Bearish Gold" ? "Sell" : "Wait",
    reason: `Technical outlook based on Gold price and DXY correlation. DXY: ${dxyDirection}`,
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
  return "Mixed";
}

function interpretYield(value: string, name: string): string {
  if (!value || value === "Live Data Unavailable") return "Awaiting data";
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
  return `Fed Funds Rate: ${rate}`;
}

function interpretInflation(inflationNews: Array<{ title: string; summary: string }>): string {
  if (inflationNews.length === 0) return "No recent inflation news";

  const newsText = inflationNews.map((n) => `${n.title} ${n.summary}`).join(" ").toLowerCase();

  if (/cool|declin|fall|easing|below forecast/i.test(newsText)) return "Cooling - supports Gold";
  if (/hot|rising|above forecast|stubborn|sticky/i.test(newsText)) return "Hot - weighs on Gold";
  return "Mixed signals on inflation";
}

function interpretSentiment(marketSentiment: string, goldNews: Array<{ title: string; summary: string }>): string {
  if (marketSentiment === "Bullish") return "Bullish gold sentiment from news analysis";
  if (marketSentiment === "Bearish") return "Bearish gold sentiment from news analysis";

  const newsText = goldNews.map((n) => `${n.title} ${n.summary}`).join(" ").toLowerCase();
  if (/safe haven|rally|surge|record/i.test(newsText)) return "Bullish from safe-haven narrative";
  if (/sell|decline|drop|risk.off/i.test(newsText)) return "Bearish from risk-off narrative";
  return "Mixed market sentiment";
}
