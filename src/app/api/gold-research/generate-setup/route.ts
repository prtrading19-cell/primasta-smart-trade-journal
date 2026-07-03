import { NextResponse } from "next/server";
import { normalizeGoldTradeSetupResult } from "@/lib/goldTradeSetup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o-mini";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OpenAI API key is missing in Vercel." }, { status: 500 });

  try {
    const body = await request.json();
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        max_output_tokens: 1600,
        input: [
          {
            role: "system",
            content:
              "You are PRIMASTA GOLD TRADE SETUP ASSISTANT. You are not a signal bot. Use saved Gold research as the research source, user-entered chart/liquidity fields as the only liquidity source, and the Smart Journal strategy list as the strategy source. Market-data levels are suggestions only unless the user confirms them on a chart. Default to WAIT unless Gold research, chart-confirmed liquidity, technical structure, strategy match, and 1:2 risk-to-reward align. Do not invent exact liquidity levels, support, resistance, entry, stop loss, or take profit. If market-data levels are not confirmed, return Pending Confirmation unless another rule requires WAIT."
          },
          {
            role: "user",
            content: JSON.stringify({
              instruction:
                "Generate one compact Gold/XAUUSD trade setup assistant result. Use the supplied saved research, manual chart/liquidity input, market-data confirmation flag, risk fields, and strategy list. AI may reason about alignment only. It must not invent liquidity or price levels. Require technical confirmation. Return strict JSON only.",
              data: body
            })
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "primasta_gold_trade_setup",
            strict: true,
            schema: GOLD_TRADE_SETUP_SCHEMA
          }
        }
      })
    });

    const responseBody = await readOpenAiBody(response);
    if (!response.ok) return NextResponse.json({ error: getOpenAiMessage(responseBody) }, { status: response.status });

    const parsed = extractParsedObject(responseBody) ?? JSON.parse(cleanJsonText(extractOutputText(responseBody)));
    return NextResponse.json(normalizeGoldTradeSetupResult(parsed));
  } catch {
    return NextResponse.json({ error: "Unable to generate Gold trade setup. Please retry or use Manual mode." }, { status: 500 });
  }
}

async function readOpenAiBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { output_text: text };
  }
}

function extractParsedObject(value: unknown): unknown | null {
  if (!isRecord(value)) return null;
  if (isRecord(value.output_parsed)) return value.output_parsed;

  const output = Array.isArray(value.output) ? value.output : [];
  for (const item of output) {
    if (!isRecord(item)) continue;
    if (isRecord(item.parsed)) return item.parsed;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (isRecord(part) && isRecord(part.parsed)) return part.parsed;
    }
  }

  return null;
}

function extractOutputText(value: unknown) {
  if (!isRecord(value)) return "";
  if (typeof value.output_text === "string") return value.output_text;
  const output = Array.isArray(value.output) ? value.output : [];
  return output
    .flatMap((item) => (isRecord(item) && Array.isArray(item.content) ? item.content : []))
    .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
    .join("");
}

function cleanJsonText(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function getOpenAiMessage(value: unknown) {
  if (!isRecord(value)) return "Unable to generate Gold trade setup.";
  const error = isRecord(value.error) ? value.error : value;
  return typeof error.message === "string" ? error.message : "Unable to generate Gold trade setup.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const GOLD_TRADE_SETUP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "setupVerdict",
    "confidence",
    "currentGoldPrice",
    "overallGoldBias",
    "selectedStrategy",
    "strategyReason",
    "buySideLiquidity",
    "sellSideLiquidity",
    "liquidityTarget",
    "entryArea",
    "stopLossArea",
    "takeProfitArea",
    "riskRewardRatio",
    "invalidationLevel",
    "confirmationNeeded",
    "mainRisk",
    "finalGuidance"
  ],
  properties: {
    setupVerdict: { type: "string", enum: ["Buy Setup", "Sell Setup", "Wait", "Pending Confirmation"] },
    confidence: { type: "string", enum: ["Low", "Medium", "High"] },
    currentGoldPrice: { type: "string" },
    overallGoldBias: { type: "string" },
    selectedStrategy: { type: "string" },
    strategyReason: { type: "string" },
    buySideLiquidity: { type: "string" },
    sellSideLiquidity: { type: "string" },
    liquidityTarget: { type: "string" },
    entryArea: { type: "string" },
    stopLossArea: { type: "string" },
    takeProfitArea: { type: "string" },
    riskRewardRatio: { type: "string" },
    invalidationLevel: { type: "string" },
    confirmationNeeded: { type: "string" },
    mainRisk: { type: "string" },
    finalGuidance: { type: "string" }
  }
} as const;
