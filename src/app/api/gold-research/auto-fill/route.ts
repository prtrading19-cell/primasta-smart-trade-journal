import { NextResponse } from "next/server";
import { GOLD_AUTO_DRIVER_NAMES, normalizeAutoFillResponse } from "@/lib/goldAutoResearch";
import { buildEnhancedAnalysis } from "@/lib/goldResearchIntegrations";
import { collectMarketData, mapMarketDataToResearch, type MarketData, type MappedSections } from "@/lib/market-data";
import { GOLD_PERSONAL_RULE, type GoldAutoFillResponse } from "@/types/goldResearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1";

const ANALYST_INSTRUCTION =
  "You are PRIMASTA GOLD RESEARCH DESK, a professional Gold/XAUUSD macro, news, and technical pre-trade research assistant. You receive pre-collected market data from multiple verified sources. Your job is to ANALYZE this data — NOT to search the internet. Do NOT invent prices or data. The data below is real, sourced, timestamped. Your job is to synthesize it into driver analysis, bias assessment, and a structured research report. Be concise. Do not hype trades. Do not give blind buy/sell calls. Separate bullish, bearish, neutral, and mixed drivers. Every section MUST reference the actual data provided. If data is marked 'Live Data Unavailable', set that field accordingly. Final verdict must be cautious and based on alignment between drivers, liquidity, technical structure, risk, and psychology.";

export async function POST(request: Request) {
  const startTime = Date.now();
  const openaiKey = process.env.OPENAI_API_KEY;

  console.info("[gold-auto-fill] pipeline_start", new Date().toISOString());
  console.info("[gold-auto-fill] openai_key_exists", Boolean(openaiKey));

  const body = await readJson(request);
  const reportDate = typeof body.date === "string" && body.date ? body.date : today();

  try {
    // STEP 1: Collect live gold price from Twelve Data
    const goldPriceStart = Date.now();
    const livePrice = await fetchLiveGoldPrice();
    console.info("[gold-auto-fill] live_price_duration", Date.now() - goldPriceStart, "ms", livePrice ? "success" : "unavailable");

    // STEP 2: Collect market data from all providers (parallel)
    const collectStart = Date.now();
    const marketData = await collectMarketData(livePrice);
    console.info("[gold-auto-fill] collect_duration", Date.now() - collectStart, "ms");
    console.info("[gold-auto-fill] providers_succeeded", marketData.providerResults.filter((r) => r.success).map((r) => r.provider));
    console.info("[gold-auto-fill] providers_failed", marketData.providerResults.filter((r) => !r.success).map((r) => r.provider));

    // STEP 3: Map market data to research sections
    const mapStart = Date.now();
    const mapped = mapMarketDataToResearch(marketData);
    console.info("[gold-auto-fill] map_duration", Date.now() - mapStart, "ms");

    // STEP 4: Check if we have any real data
    const hasRealData = marketData.sources.length > 0;
    if (!hasRealData) {
      console.info("[gold-auto-fill] all_providers_failed", "returning mapped data without OpenAI enhancement");
      const report = buildResponseFromMapped(mapped, reportDate);
      const engineAnalysis = runEngineAnalysis(report);
      return NextResponse.json({ ...report, engineAnalysis, marketData: { sources: marketData.sources, errors: marketData.errors, providerResults: marketData.providerResults } });
    }

    // STEP 5: Send normalized data to OpenAI for analysis (if key available)
    if (openaiKey) {
      const openaiStart = Date.now();
      const openaiAnalysis = await requestOpenAIAnalysis(openaiKey, marketData, mapped, reportDate);
      console.info("[gold-auto-fill] openai_duration", Date.now() - openaiStart, "ms", openaiAnalysis ? "success" : "fallback");

      if (openaiAnalysis) {
        const report = mergeOpenAIAnalysis(mapped, openaiAnalysis, reportDate);
        const engineAnalysis = runEngineAnalysis(report);
        const totalDuration = Date.now() - startTime;
        console.info("[gold-auto-fill] pipeline_complete", totalDuration, "ms");
        return NextResponse.json({
          ...report,
          engineAnalysis,
          marketData: { sources: marketData.sources, errors: marketData.errors, providerResults: marketData.providerResults },
        });
      }
    }

    // STEP 6: Fallback — use mapped data without OpenAI enhancement
    const report = buildResponseFromMapped(mapped, reportDate);
    const engineAnalysis = runEngineAnalysis(report);
    const totalDuration = Date.now() - startTime;
    console.info("[gold-auto-fill] pipeline_complete_fallback", totalDuration, "ms");
    return NextResponse.json({
      ...report,
      engineAnalysis,
      marketData: { sources: marketData.sources, errors: marketData.errors, providerResults: marketData.providerResults },
    });
  } catch (error) {
    console.error("[gold-auto-fill] pipeline_error", error instanceof Error ? error.message : "unknown");
    return errorResponse("pipeline_error", error instanceof Error ? error.message : "Auto-fill pipeline failed.", 500);
  }
}

// ---- Live Gold Price ----

async function fetchLiveGoldPrice(): Promise<string> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return "";

  try {
    const url = new URL("https://api.twelvedata.com/quote");
    url.searchParams.set("symbol", "XAU/USD");
    url.searchParams.set("apikey", apiKey);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    const price = isRecord(data) ? Number(data.close ?? data.price) : NaN;

    return Number.isFinite(price) ? price.toFixed(2) : "";
  } catch (error) {
    console.info("[gold-auto-fill] live_price_fetch_failed", error instanceof Error ? error.message : "unknown");
    return "";
  }
}

// ---- OpenAI Analysis (Analyst Only) ----

interface OpenAIAnalysis {
  sections: Array<{
    driver: string;
    goldImpact: "Bullish Gold" | "Bearish Gold" | "Neutral" | "Mixed-Wait";
    reason: string;
    newsHeadline: string;
    newsSummary: string;
    chartObservation: string;
    sourceLink: string;
  }>;
  fullSummary: {
    overallGoldBias: "Bullish" | "Bearish" | "Neutral" | "Mixed-Wait";
    preTradeVerdict: "Trade Allowed" | "Wait" | "Avoid Before News" | "Manage Existing Trade Only";
    finalGuidance: string;
  };
}

async function requestOpenAIAnalysis(
  apiKey: string,
  marketData: Awaited<ReturnType<typeof collectMarketData>>,
  mapped: ReturnType<typeof mapMarketDataToResearch>,
  reportDate: string
): Promise<OpenAIAnalysis | null> {
  const dataContext = buildDataContext(marketData, mapped);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        max_output_tokens: 4000,
        input: [
          { role: "system", content: ANALYST_INSTRUCTION },
          { role: "user", content: buildAnalystPrompt(reportDate, dataContext) },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "gold_research_analysis",
            strict: true,
            schema: ANALYST_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      console.info("[gold-auto-fill] openai_error", response.status);
      return null;
    }

    const responseBody = await response.json();
    const parsed = extractParsedAnalysis(responseBody);
    return parsed;
  } catch (error) {
    console.info("[gold-auto-fill] openai_exception", error instanceof Error ? error.message : "unknown");
    return null;
  }
}

function buildDataContext(marketData: MarketData, mapped: MappedSections): string {
  return `
GOLD PRICE: ${marketData.goldPrice || "Live Data Unavailable"}
DXY: ${marketData.dxy}
US 10Y YIELD: ${marketData.us10Yield}
US 2Y YIELD: ${marketData.us2Yield}
REAL YIELD: ${marketData.realYield}
FED FUNDS RATE: ${marketData.fedFundsRate}
UNEMPLOYMENT RATE: ${marketData.unemploymentRate}
GDP GROWTH: ${marketData.gdpGrowth}
BALANCE SHEET: ${marketData.balanceSheetSize}
VIX: ${marketData.vixLevel}
MARKET SENTIMENT: ${marketData.marketSentiment}
DATA SOURCES: ${marketData.sources.join(", ") || "None"}
DATA ERRORS: ${marketData.errors.join("; ") || "None"}
TIMESTAMP: ${marketData.timestamp}

GOLD NEWS:
${marketData.goldNews.slice(0, 3).map((n, i) => `${i + 1}. ${n.title} (${n.source}, ${n.publishedAt})`).join("\n")}

FED NEWS:
${marketData.fedNews.slice(0, 3).map((n, i) => `${i + 1}. ${n.title} (${n.source}, ${n.publishedAt})`).join("\n")}

INFLATION NEWS:
${marketData.inflationNews.slice(0, 3).map((n, i) => `${i + 1}. ${n.title} (${n.source}, ${n.publishedAt})`).join("\n")}

GEOPOLITICAL NEWS:
${marketData.geopoliticalNews.slice(0, 3).map((n, i) => `${i + 1}. ${n.title} (${n.source}, ${n.publishedAt})`).join("\n")}

ECONOMIC NEWS:
${marketData.economicNews.slice(0, 3).map((n, i) => `${i + 1}. ${n.title} (${n.source})`).join("\n")}

ETF NEWS:
${marketData.etfNews.slice(0, 3).map((n, i) => `${i + 1}. ${n.title} (${n.source})`).join("\n")}

CENTRAL BANK NEWS:
${marketData.centralBankNews.slice(0, 3).map((n, i) => `${i + 1}. ${n.title} (${n.source})`).join("\n")}

SENTIMENT NEWS:
${marketData.sentimentNews.slice(0, 3).map((n, i) => `${i + 1}. ${n.title} (${n.source})`).join("\n")}

POSITIONING NEWS:
${marketData.positioningNews.slice(0, 3).map((n, i) => `${i + 1}. ${n.title} (${n.source})`).join("\n")}

LIQUIDITY NEWS:
${marketData.liquidityNews.slice(0, 3).map((n, i) => `${i + 1}. ${n.title} (${n.source})`).join("\n")}

PRE-MAPPED SECTIONS:
${mapped.sections.map((s) => `- ${s.driver}: ${s.currentDataValue} | Impact: ${s.goldImpact} | ${s.reason}`).join("\n")}
`.trim();
}

function buildAnalystPrompt(reportDate: string, dataContext: string): string {
  return `
Analyze the following PRIMASTA Gold/XAUUSD market data for ${reportDate}.

The data below was collected from multiple verified APIs (FRED, Alpha Vantage, Finnhub, NewsAPI, GNews).
You are the ANALYST. Do NOT search the internet. Do NOT invent prices. Use ONLY the data provided below.

YOUR TASK:
For each of the 9 driver sections, provide:
- goldImpact: "Bullish Gold" | "Bearish Gold" | "Neutral" | "Mixed-Wait"
- reason: 1 sentence explaining the impact based on the provided data
- newsHeadline: from the provided news or "Data not verified"
- newsSummary: 1-2 sentences referencing the actual data point and source
- chartObservation: from the provided data
- sourceLink: from the provided news or "Not found"

Also provide a fullSummary with overallGoldBias, preTradeVerdict, and finalGuidance.

Gold impact rules:
- DXY falling = Bullish Gold. DXY rising = Bearish Gold.
- Yields falling = Bullish Gold. Yields rising = Bearish Gold.
- Real yields falling = Bullish Gold. Rising = Bearish Gold.
- Dovish Fed = Bullish Gold. Hawkish = Bearish Gold.
- Softer inflation = Bullish Gold. Hot inflation = Bearish Gold.
- High geopolitical risk = Bullish Gold. Low risk = Neutral.
- Weak jobs = Bullish Gold. Strong jobs = Bearish Gold.
- ETF inflows + CB buying = Bullish Gold. Outflows = Bearish Gold.
- Bullish technical structure = Bullish Gold. Bearish = Bearish Gold.

DATA:
${dataContext}

Return exactly 9 sections matching these drivers:
${GOLD_AUTO_DRIVER_NAMES.map((d, i) => `${i + 1}. ${d}`).join("\n")}
`.trim();
}

function buildResponseFromMapped(mapped: ReturnType<typeof mapMarketDataToResearch>, reportDate: string): GoldAutoFillResponse {
  const sections = GOLD_AUTO_DRIVER_NAMES.map((driver) => {
    const s = mapped.sections.find((m) => m.driver === driver);
    return {
      driver,
      currentDataValue: s?.currentDataValue || "",
      direction: s?.direction || "",
      tenYearYieldDirection: s?.tenYearYieldDirection || "",
      twoYearYieldDirection: s?.twoYearYieldDirection || "",
      realYieldsDirection: s?.realYieldsDirection || "",
      fedTone: s?.fedTone || "",
      rateExpectation: s?.rateExpectation || "",
      latestInflationData: s?.latestInflationData || "",
      inflationResult: s?.inflationResult || "",
      latestJobsData: s?.latestJobsData || "",
      jobsResult: s?.jobsResult || "",
      unemploymentRate: s?.unemploymentRate || "",
      wageGrowth: s?.wageGrowth || "",
      riskLevel: s?.riskLevel || "",
      dxyReaction: s?.dxyReaction || "",
      etfFlowDirection: s?.etfFlowDirection || "",
      centralBankDemand: s?.centralBankDemand || "",
      higherTimeframeBias: s?.higherTimeframeBias || "",
      keySupport: s?.keySupport || "",
      keyResistance: s?.keyResistance || "",
      liquidityArea: s?.liquidityArea || "",
      marketStructure: s?.marketStructure || "",
      setupPresent: s?.setupPresent || "",
      setupType: s?.setupType || "",
      newsHeadline: s?.newsHeadline || "",
      newsSummary: s?.newsSummary || "",
      chartObservation: s?.chartObservation || "",
      sourceLink: s?.sourceLink || "",
      goldImpact: s?.goldImpact || "Mixed-Wait",
      goldTechnicalVerdict: s?.goldTechnicalVerdict || "",
      reason: s?.reason || "",
      gdpGrowth: s?.gdpGrowth || "",
      pmi: s?.pmi || "",
      ism: s?.ism || "",
      economicActivity: s?.economicActivity || "",
      etfFlowMagnitude: s?.etfFlowMagnitude || "",
      cbBuyingVolume: s?.cbBuyingVolume || "",
      cbSellingVolume: s?.cbSellingVolume || "",
      fearGreedIndex: s?.fearGreedIndex || "",
      vixLevel: s?.vixLevel || "",
      riskAppetite: s?.riskAppetite || "",
      retailPositioning: s?.retailPositioning || "",
      institutionalPositioning: s?.institutionalPositioning || "",
      crowdedTradeRisk: s?.crowdedTradeRisk || "",
      fundingConditions: s?.fundingConditions || "",
      balanceSheetSize: s?.balanceSheetSize || "",
      repoRate: s?.repoRate || "",
      seasonalPattern: s?.seasonalPattern || "",
      historicalReturn: s?.historicalReturn || "",
      positionCrowding: s?.positionCrowding || "",
      shortInterest: s?.shortInterest || "",
      cftcNetLong: s?.cftcNetLong || "",
    };
  });

  return {
    date: reportDate,
    goldCurrentPrice: mapped.goldCurrentPrice,
    sections: sections as GoldAutoFillResponse["sections"],
    fullSummary: mapped.fullSummary as GoldAutoFillResponse["fullSummary"],
  };
}

function mergeOpenAIAnalysis(mapped: ReturnType<typeof mapMarketDataToResearch>, analysis: OpenAIAnalysis, reportDate: string): GoldAutoFillResponse {
  const sections = GOLD_AUTO_DRIVER_NAMES.map((driver) => {
    const s = mapped.sections.find((m) => m.driver === driver);
    const ai = analysis.sections.find((a) => a.driver === driver);

    return {
      driver,
      currentDataValue: s?.currentDataValue || "",
      direction: s?.direction || "",
      tenYearYieldDirection: s?.tenYearYieldDirection || "",
      twoYearYieldDirection: s?.twoYearYieldDirection || "",
      realYieldsDirection: s?.realYieldsDirection || "",
      fedTone: s?.fedTone || "",
      rateExpectation: s?.rateExpectation || "",
      latestInflationData: s?.latestInflationData || "",
      inflationResult: s?.inflationResult || "",
      latestJobsData: s?.latestJobsData || "",
      jobsResult: s?.jobsResult || "",
      unemploymentRate: s?.unemploymentRate || "",
      wageGrowth: s?.wageGrowth || "",
      riskLevel: s?.riskLevel || "",
      dxyReaction: s?.dxyReaction || "",
      etfFlowDirection: s?.etfFlowDirection || "",
      centralBankDemand: s?.centralBankDemand || "",
      higherTimeframeBias: s?.higherTimeframeBias || "",
      keySupport: s?.keySupport || "",
      keyResistance: s?.keyResistance || "",
      liquidityArea: s?.liquidityArea || "",
      marketStructure: s?.marketStructure || "",
      setupPresent: s?.setupPresent || "",
      setupType: s?.setupType || "",
      newsHeadline: ai?.newsHeadline || s?.newsHeadline || "",
      newsSummary: ai?.newsSummary || s?.newsSummary || "",
      chartObservation: ai?.chartObservation || s?.chartObservation || "",
      sourceLink: ai?.sourceLink || s?.sourceLink || "",
      goldImpact: ai?.goldImpact || s?.goldImpact || "Mixed-Wait",
      goldTechnicalVerdict: s?.goldTechnicalVerdict || "",
      reason: ai?.reason || s?.reason || "",
      gdpGrowth: s?.gdpGrowth || "",
      pmi: s?.pmi || "",
      ism: s?.ism || "",
      economicActivity: s?.economicActivity || "",
      etfFlowMagnitude: s?.etfFlowMagnitude || "",
      cbBuyingVolume: s?.cbBuyingVolume || "",
      cbSellingVolume: s?.cbSellingVolume || "",
      fearGreedIndex: s?.fearGreedIndex || "",
      vixLevel: s?.vixLevel || "",
      riskAppetite: s?.riskAppetite || "",
      retailPositioning: s?.retailPositioning || "",
      institutionalPositioning: s?.institutionalPositioning || "",
      crowdedTradeRisk: s?.crowdedTradeRisk || "",
      fundingConditions: s?.fundingConditions || "",
      balanceSheetSize: s?.balanceSheetSize || "",
      repoRate: s?.repoRate || "",
      seasonalPattern: s?.seasonalPattern || "",
      historicalReturn: s?.historicalReturn || "",
      positionCrowding: s?.positionCrowding || "",
      shortInterest: s?.shortInterest || "",
      cftcNetLong: s?.cftcNetLong || "",
    };
  });

  const summary = analysis.fullSummary
    ? {
        ...mapped.fullSummary,
        overallGoldBias: analysis.fullSummary.overallGoldBias,
        preTradeVerdict: analysis.fullSummary.preTradeVerdict,
        finalGuidance: analysis.fullSummary.finalGuidance,
      }
    : mapped.fullSummary;

  return {
    date: reportDate,
    goldCurrentPrice: mapped.goldCurrentPrice,
    sections: sections as GoldAutoFillResponse["sections"],
    fullSummary: summary as GoldAutoFillResponse["fullSummary"],
  };
}

function extractParsedAnalysis(responseBody: unknown): OpenAIAnalysis | null {
  if (!isRecord(responseBody)) return null;

  if (isRecord(responseBody.output_parsed) && Array.isArray(responseBody.output_parsed.sections)) {
    return responseBody.output_parsed as unknown as OpenAIAnalysis;
  }

  const output = Array.isArray(responseBody.output) ? responseBody.output : [];
  for (const item of output) {
    if (!isRecord(item)) continue;
    if (isRecord(item.parsed) && Array.isArray(item.parsed.sections)) {
      return item.parsed as unknown as OpenAIAnalysis;
    }
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (isRecord(part) && isRecord(part.parsed) && Array.isArray(part.parsed.sections)) {
        return part.parsed as unknown as OpenAIAnalysis;
      }
    }
  }

  const outputText = extractOutputText(responseBody);
  if (outputText) {
    try {
      const parsed = JSON.parse(cleanJsonText(outputText));
      if (Array.isArray(parsed.sections)) return parsed as unknown as OpenAIAnalysis;
    } catch {
      // fall through
    }
  }

  return null;
}

function extractOutputText(value: unknown): string {
  if (!isRecord(value)) return "";
  if (typeof value.output_text === "string") return value.output_text;

  const output = Array.isArray(value.output) ? value.output : [];
  const chunks: string[] = [];

  for (const item of output) {
    if (!isRecord(item)) continue;
    if (typeof item.text === "string") chunks.push(item.text);

    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (!isRecord(part)) continue;
      if (typeof part.text === "string") chunks.push(part.text);
      if (typeof part.content === "string") chunks.push(part.content);
    }
  }

  return chunks.join("");
}

function cleanJsonText(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

// ---- Helpers ----

function readJson(request: Request): Promise<Record<string, unknown>> {
  return request.json().then((body) => (isRecord(body) ? body : {})).catch(() => ({}));
}

function errorResponse(code: string, error: string, status: number) {
  return NextResponse.json({ code, error }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function runEngineAnalysis(report: GoldAutoFillResponse): unknown {
  try {
    return buildEnhancedAnalysis(report);
  } catch (error) {
    console.info("[gold-auto-fill] engine_analysis_failed", error instanceof Error ? error.message : "unknown");
    return null;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const ANALYST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sections", "fullSummary"],
  properties: {
    sections: {
      type: "array",
      minItems: 9,
      maxItems: 9,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["driver", "goldImpact", "reason", "newsHeadline", "newsSummary", "chartObservation", "sourceLink"],
        properties: {
          driver: { type: "string", enum: GOLD_AUTO_DRIVER_NAMES },
          goldImpact: { type: "string", enum: ["Bullish Gold", "Bearish Gold", "Neutral", "Mixed-Wait"] },
          reason: { type: "string" },
          newsHeadline: { type: "string" },
          newsSummary: { type: "string" },
          chartObservation: { type: "string" },
          sourceLink: { type: "string" },
        },
      },
    },
    fullSummary: {
      type: "object",
      additionalProperties: false,
      required: ["overallGoldBias", "preTradeVerdict", "finalGuidance"],
      properties: {
        overallGoldBias: { type: "string", enum: ["Bullish", "Bearish", "Neutral", "Mixed-Wait"] },
        preTradeVerdict: { type: "string", enum: ["Trade Allowed", "Wait", "Avoid Before News", "Manage Existing Trade Only"] },
        finalGuidance: { type: "string" },
      },
    },
  },
} as const;
