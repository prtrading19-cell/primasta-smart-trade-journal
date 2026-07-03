import { NextResponse } from "next/server";
import { GOLD_AUTO_DRIVER_NAMES, normalizeAutoFillResponse } from "@/lib/goldAutoResearch";
import { GOLD_PERSONAL_RULE } from "@/types/goldResearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";

const SYSTEM_INSTRUCTION =
  "You are PRIMASTA GOLD RESEARCH DESK, a professional Gold/XAUUSD macro, news, and technical pre-trade research assistant. Your job is to collect and summarize current Gold market drivers into a structured 9-point pre-trade checklist. Do not hype trades. Do not give blind buy/sell calls. Always separate bullish, bearish, neutral, and mixed drivers. Always include source links. If data is not verified, say so. Final verdict must be cautious and based on alignment between drivers, liquidity, technical structure, risk, and psychology.";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Add OPENAI_API_KEY to Vercel environment variables and redeploy." },
        { status: 500 }
      );
    }

    const body = await readJson(request);
    const reportDate = typeof body.date === "string" && body.date ? body.date : today();
    const openAiResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        tools: [{ type: "web_search" }],
        tool_choice: "required",
        input: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: buildAutoFillPrompt(reportDate) }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "primasta_gold_research_auto_fill",
            strict: true,
            schema: GOLD_AUTO_FILL_SCHEMA
          }
        }
      })
    });

    const responseBody = await openAiResponse.json();

    if (!openAiResponse.ok) {
      return NextResponse.json({ error: getOpenAiErrorMessage(responseBody) }, { status: openAiResponse.status });
    }

    if (responseBody?.error) {
      return NextResponse.json({ error: getOpenAiErrorMessage(responseBody) }, { status: 502 });
    }

    const outputText = extractOutputText(responseBody);
    if (!outputText) {
      return NextResponse.json({ error: "OpenAI did not return a Gold research report." }, { status: 502 });
    }

    const parsed = JSON.parse(outputText);
    return NextResponse.json(normalizeAutoFillResponse(parsed));
  } catch (error) {
    const message = error instanceof SyntaxError ? "OpenAI returned invalid JSON for the Gold research report." : getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : {};
  } catch {
    return {};
  }
}

function buildAutoFillPrompt(reportDate: string) {
  return `
Create today's PRIMASTA Gold/XAUUSD research report for ${reportDate}.

Use live web search for fresh, source-backed information. Prefer official or reliable public sources where possible:
- US yields: FRED, US Treasury, or reliable market data/news
- Real yields: FRED or reliable market data/news
- Fed/FOMC: Federal Reserve official pages and reputable financial news
- CPI/PCE: BLS, BEA, or reputable economic calendar/news
- NFP/jobs: BLS Employment Situation or reputable news
- ETF/central bank demand: World Gold Council/Goldhub or reputable gold market reports
- Geopolitics: reputable current news sources
- DXY and Gold technicals: market data/news source or clearly mark data not verified

Required sections, in this exact order:
${GOLD_AUTO_DRIVER_NAMES.map((driver, index) => `${index + 1}. ${driver}`).join("\n")}

For the first 8 drivers, fill:
Current Data/Value, Direction or driver-specific dropdown value, News Headline, News Summary, My Chart Observation, Source Link, Gold Impact, Reason.

For Gold Technical Structure, fill:
Higher Timeframe Bias, Key Support, Key Resistance, Liquidity Area, Market Structure, Setup Present, Setup Type, My Chart Observation, Source Link, Gold Technical Verdict, Reason.

Gold impact rules:
- DXY falling, rejecting resistance, or breaking support is Bullish Gold. DXY rising or breaking resistance is Bearish Gold. Sideways is Neutral or Mixed-Wait.
- US 10Y and 2Y yields falling is Bullish Gold. Both rising is Bearish Gold. Mixed yield movement is Mixed-Wait.
- Real yields falling is Bullish Gold. Rising real yields is Bearish Gold. Sideways is Neutral.
- Dovish Fed or cuts expected is Bullish Gold. Hawkish or higher for longer is Bearish Gold. Mixed is Mixed-Wait.
- Softer inflation supporting cuts is Bullish Gold. Hot inflation strengthening yields/USD is Bearish Gold. In-line or conflicting is Neutral or Mixed-Wait.
- Weak jobs, rising unemployment, or slowing wages is Bullish Gold. Strong jobs, low unemployment, or hot wages is Bearish Gold. Mixed jobs data is Mixed-Wait.
- High risk/fear is Bullish Gold. High risk plus very strong DXY is Mixed-Wait. Low risk is Neutral.
- ETF inflows and strong central bank buying is Bullish Gold. ETF outflows and weak demand is Bearish Gold. Mixed flows is Mixed-Wait.
- Bullish HTF plus support/liquidity sweep plus setup present is Buy Setup. Bearish HTF plus resistance/rejection plus setup present is Sell Setup. Unclear structure is Wait.

Source and accuracy rules:
- Do not invent current prices, economic data, market data, or source links.
- Every driver must include a real source link when found.
- If a driver cannot be verified, set sourceLink to "Not found", goldImpact to "Mixed-Wait", and say "Data not verified." in the reason.
- Include the source date inside the news summary if available.
- Do not give a guaranteed buy or sell signal.
- Always require technical confirmation before a trade entry.

Return only JSON that matches the schema. Use this personal rule exactly in the summary:
${GOLD_PERSONAL_RULE}
`.trim();
}

function extractOutputText(responseBody: any) {
  if (typeof responseBody.output_text === "string") return responseBody.output_text;

  const contentText = responseBody.output
    ?.flatMap((item: any) => (Array.isArray(item.content) ? item.content : []))
    ?.filter((content: any) => content?.type === "output_text" && typeof content.text === "string")
    ?.map((content: any) => content.text)
    ?.join("");

  return typeof contentText === "string" ? contentText : "";
}

function getOpenAiErrorMessage(responseBody: any) {
  const message = responseBody?.error?.message || responseBody?.message;
  return typeof message === "string" ? message : "OpenAI could not auto-fill the Gold research report.";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to auto-fill Gold research.";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const sectionProperties = {
  driver: { type: "string", enum: GOLD_AUTO_DRIVER_NAMES },
  currentDataValue: { type: "string" },
  direction: { type: "string" },
  tenYearYieldDirection: { type: "string" },
  twoYearYieldDirection: { type: "string" },
  realYieldsDirection: { type: "string" },
  fedTone: { type: "string" },
  rateExpectation: { type: "string" },
  latestInflationData: { type: "string" },
  inflationResult: { type: "string" },
  latestJobsData: { type: "string" },
  jobsResult: { type: "string" },
  unemploymentRate: { type: "string" },
  wageGrowth: { type: "string" },
  riskLevel: { type: "string" },
  dxyReaction: { type: "string" },
  etfFlowDirection: { type: "string" },
  centralBankDemand: { type: "string" },
  higherTimeframeBias: { type: "string" },
  keySupport: { type: "string" },
  keyResistance: { type: "string" },
  liquidityArea: { type: "string" },
  marketStructure: { type: "string" },
  setupPresent: { type: "string" },
  setupType: { type: "string" },
  newsHeadline: { type: "string" },
  newsSummary: { type: "string" },
  chartObservation: { type: "string" },
  sourceLink: { type: "string" },
  goldImpact: { type: "string", enum: ["Bullish Gold", "Bearish Gold", "Neutral", "Mixed-Wait"] },
  goldTechnicalVerdict: { type: "string" },
  reason: { type: "string" }
} as const;

const GOLD_AUTO_FILL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["date", "goldCurrentPrice", "sections", "fullSummary"],
  properties: {
    date: { type: "string" },
    goldCurrentPrice: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: Object.keys(sectionProperties),
        properties: sectionProperties
      }
    },
    fullSummary: {
      type: "object",
      additionalProperties: false,
      required: [
        "overallGoldBias",
        "bullishDrivers",
        "bearishDrivers",
        "mixedDrivers",
        "strongestBullishDriver",
        "strongestBearishDriver",
        "mainRiskToday",
        "bestSessionToTrade",
        "preTradeVerdict",
        "finalGuidance",
        "personalRule"
      ],
      properties: {
        overallGoldBias: { type: "string", enum: ["Bullish", "Bearish", "Neutral", "Mixed-Wait"] },
        bullishDrivers: { type: "array", items: { type: "string" } },
        bearishDrivers: { type: "array", items: { type: "string" } },
        mixedDrivers: { type: "array", items: { type: "string" } },
        strongestBullishDriver: { type: "string" },
        strongestBearishDriver: { type: "string" },
        mainRiskToday: { type: "string" },
        bestSessionToTrade: { type: "string" },
        preTradeVerdict: { type: "string", enum: ["Trade Allowed", "Wait", "Avoid Before News", "Manage Existing Trade Only"] },
        finalGuidance: { type: "string" },
        personalRule: { type: "string" }
      }
    }
  }
} as const;
