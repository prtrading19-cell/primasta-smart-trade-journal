import { NextResponse } from "next/server";
import { GOLD_AUTO_DRIVER_NAMES, normalizeAutoFillResponse } from "@/lib/goldAutoResearch";
import { GOLD_PERSONAL_RULE, type GoldAutoFillResponse } from "@/types/goldResearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
// Change this later only if you want to manually use a different OpenAI model.
// gpt-4.1 is more reliable than gpt-4o-mini at actually invoking web_search
// and transcribing exact figures instead of blending in memorized values.
const DEFAULT_MODEL = "gpt-4.1";

const SYSTEM_INSTRUCTION =
  "You are PRIMASTA GOLD RESEARCH DESK, a professional Gold/XAUUSD macro, news, and technical pre-trade research assistant. Be concise. Do not hype trades. Do not give blind buy/sell calls. Separate bullish, bearish, neutral, and mixed drivers. Always include source links. If data is not verified, say so. Final verdict must be cautious and based on alignment between drivers, liquidity, technical structure, risk, and psychology.";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  console.info("[gold-auto-fill] api_key_exists", Boolean(apiKey));
  console.info("[gold-auto-fill] using_model", process.env.OPENAI_MODEL || DEFAULT_MODEL);

  if (!apiKey) {
    return errorResponse("missing_api_key", "OpenAI API key is missing in Vercel.", 500);
  }

  const body = await readJson(request);
  const reportDate = typeof body.date === "string" && body.date ? body.date : today();

  try {
    const firstAttempt = await requestStructuredReport(apiKey, reportDate, "full");
    const firstParsed = parseStructuredReport(firstAttempt.body);
    logAttempt(firstAttempt.status, firstAttempt.body, firstParsed.ok, 1);

    if (firstAttempt.statusOk && firstParsed.ok) {
      return NextResponse.json(firstParsed.report);
    }

    if (!firstAttempt.statusOk) {
      return openAiErrorResponse(firstAttempt.body, firstAttempt.status);
    }

    const retryAttempt = await requestStructuredReport(apiKey, reportDate, "retry");
    const retryParsed = parseStructuredReport(retryAttempt.body);
    logAttempt(retryAttempt.status, retryAttempt.body, retryParsed.ok, 2);

    if (retryAttempt.statusOk && retryParsed.ok) {
      return NextResponse.json(retryParsed.report);
    }

    if (!retryAttempt.statusOk) {
      return openAiErrorResponse(retryAttempt.body, retryAttempt.status);
    }

    return errorResponse("json_parse_error", "AI response format error. Please retry or check server logs.", 502);
  } catch (error) {
    console.info("[gold-auto-fill] parse_success", false);
    return errorResponse("unknown_error", safeErrorMessage(error), 500);
  }
}

async function requestStructuredReport(apiKey: string, reportDate: string, mode: "full" | "retry") {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      max_output_tokens: 6000,
      tools: [{ type: "web_search", search_context_size: "high" }],
      tool_choice: "required",
      input: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: mode === "full" ? buildAutoFillPrompt(reportDate) : buildRetryPrompt(reportDate) }
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

  return {
    status: response.status,
    statusOk: response.ok,
    body: await readOpenAiBody(response)
  };
}

function parseStructuredReport(responseBody: unknown): { ok: true; report: GoldAutoFillResponse } | { ok: false } {
  const parsedObject = extractParsedObject(responseBody);

  if (parsedObject) {
    return { ok: true, report: normalizeAutoFillResponse(parsedObject) };
  }

  const outputText = cleanJsonText(extractOutputText(responseBody));
  if (!outputText) return { ok: false };

  try {
    return { ok: true, report: normalizeAutoFillResponse(JSON.parse(outputText)) };
  } catch {
    return { ok: false };
  }
}

function extractParsedObject(value: unknown): unknown | null {
  if (!isRecord(value)) return null;
  if (looksLikeReport(value)) return value;
  if (isRecord(value.output_parsed) && looksLikeReport(value.output_parsed)) return value.output_parsed;

  const output = Array.isArray(value.output) ? value.output : [];
  for (const item of output) {
    if (!isRecord(item)) continue;
    if (isRecord(item.parsed) && looksLikeReport(item.parsed)) return item.parsed;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (isRecord(part) && isRecord(part.parsed) && looksLikeReport(part.parsed)) return part.parsed;
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

async function readOpenAiBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { output_text: text };
  }
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return isRecord(body) ? body : {};
  } catch {
    return {};
  }
}

function buildAutoFillPrompt(reportDate: string) {
  return `
Create today's PRIMASTA Gold/XAUUSD research report for ${reportDate}.

Use web search for fresh source-backed information. Prefer official or reliable sources:
US yields/Treasury/FRED, real yields/FRED, Fed/FOMC/Federal Reserve, CPI/PCE/BLS/BEA, jobs/BLS, ETF and central bank demand/World Gold Council or reputable gold reports, geopolitics/reputable news, DXY and Gold technicals/reliable market source.

Return exactly 9 sections in this order:
${GOLD_AUTO_DRIVER_NAMES.map((driver, index) => `${index + 1}. ${driver}`).join("\n")}

Keep each section compact:
- newsHeadline: one headline
- newsSummary: 1-2 short sentences, include source date if available
- chartObservation: short practical chart note; if not verified, say Data not verified.
- sourceLink: a single raw URL only (e.g. https://example.com/article), starting with http:// or https://, with nothing else appended — no notes, no parentheses, no "(via X)" annotations. Use "Not found" if no URL is available.
- reason: short reason for Gold impact

Gold impact rules:
DXY falling/rejecting resistance/breaking support = Bullish Gold. DXY rising/breaking resistance = Bearish Gold. Sideways = Neutral or Mixed-Wait.
US 10Y and 2Y yields falling = Bullish Gold. Both rising = Bearish Gold. Mixed yields = Mixed-Wait.
Real yields falling = Bullish Gold. Rising real yields = Bearish Gold. Sideways = Neutral.
Dovish Fed/cuts expected = Bullish Gold. Hawkish/higher for longer = Bearish Gold. Mixed = Mixed-Wait.
Softer inflation supporting cuts = Bullish Gold. Hot inflation strengthening yields/USD = Bearish Gold. In-line/conflicting = Neutral or Mixed-Wait.
Weak jobs/rising unemployment/slowing wages = Bullish Gold. Strong jobs/low unemployment/hot wages = Bearish Gold. Mixed jobs data = Mixed-Wait.
High risk/fear = Bullish Gold. High risk plus very strong DXY = Mixed-Wait. Low risk = Neutral.
ETF inflows plus strong central bank buying = Bullish Gold. ETF outflows plus weak demand = Bearish Gold. Mixed flows = Mixed-Wait.
Bullish technical structure/support/liquidity sweep/setup present = Bullish Gold. Bearish structure/resistance/rejection/setup present = Bearish Gold. Unclear structure = Mixed-Wait.

Do not invent prices, data, or source links. If not verified, set sourceLink to "Not found" and goldImpact to "Mixed-Wait".
Personal rule must be exactly: ${GOLD_PERSONAL_RULE}
`.trim();
}

function buildRetryPrompt(reportDate: string) {
  return `
Create a compact PRIMASTA Gold/XAUUSD research JSON object for ${reportDate}.
You MUST use the web_search tool to verify fresh data before answering. Do not invent, estimate,
or recall prices, data, or source links from memory. If a value cannot be verified via a fresh
web search, set that field to "Data not verified", sourceLink to "Not found", and goldImpact to "Mixed-Wait".

Use exactly these 9 section driver names, in order:
${GOLD_AUTO_DRIVER_NAMES.join("\n")}

Each section must be short and must include a sourceLink value.
Use the personalRule exactly: ${GOLD_PERSONAL_RULE}
`.trim();
}

function openAiErrorResponse(responseBody: unknown, status: number) {
  const { code, message } = getOpenAiError(responseBody);
  console.info("[gold-auto-fill] openai_error_code", code || status);

  if (status === 429 || /quota|billing|credit|insufficient/i.test(`${code} ${message}`)) {
    return errorResponse("billing_or_quota", "OpenAI billing or credits issue. Check OpenAI usage/billing.", status);
  }

  if (/web_search|search|source/i.test(`${code} ${message}`)) {
    return errorResponse("web_search_failed", "Could not verify fresh sources. Try again later.", status);
  }

  if (status === 401 || status === 403) {
    return errorResponse("openai_auth_error", "OpenAI API key is missing in Vercel.", status);
  }

  return errorResponse(code || "openai_error", "Could not verify fresh sources. Try again later.", status || 502);
}

function errorResponse(code: string, error: string, status: number) {
  return NextResponse.json({ code, error }, { status });
}

function getOpenAiError(responseBody: unknown) {
  if (!isRecord(responseBody)) return { code: "", message: "" };
  const error = isRecord(responseBody.error) ? responseBody.error : responseBody;

  return {
    code: typeof error.code === "string" ? error.code : "",
    message: typeof error.message === "string" ? error.message : ""
  };
}

function logAttempt(status: number, responseBody: unknown, parseSuccess: boolean, attempt: number) {
  const outputTextLength = extractOutputText(responseBody).length;
  console.info("[gold-auto-fill] openai_status", status, "attempt", attempt);
  console.info("[gold-auto-fill] response_text_length", outputTextLength, "attempt", attempt);
  console.info("[gold-auto-fill] parse_success", parseSuccess, "attempt", attempt);
}

function looksLikeReport(value: Record<string, unknown>) {
  return typeof value.date === "string" && Array.isArray(value.sections) && isRecord(value.fullSummary);
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/quota|billing|credit|insufficient/i.test(message)) return "OpenAI billing or credits issue. Check OpenAI usage/billing.";
  if (/search|source/i.test(message)) return "Could not verify fresh sources. Try again later.";
  return "Could not verify fresh sources. Try again later.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const GOLD_AUTO_FILL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["date", "goldCurrentPrice", "sections", "fullSummary"],
  properties: {
    date: { type: "string" },
    goldCurrentPrice: { type: "string" },
    sections: {
      type: "array",
      minItems: 9,
      maxItems: 9,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["driver", "currentDataValue", "direction", "newsHeadline", "newsSummary", "chartObservation", "sourceLink", "goldImpact", "reason"],
        properties: {
          driver: { type: "string", enum: GOLD_AUTO_DRIVER_NAMES },
          currentDataValue: { type: "string" },
          direction: { type: "string" },
          newsHeadline: { type: "string" },
          newsSummary: { type: "string" },
          chartObservation: { type: "string" },
          sourceLink: { type: "string" },
          goldImpact: { type: "string", enum: ["Bullish Gold", "Bearish Gold", "Neutral", "Mixed-Wait"] },
          reason: { type: "string" }
        }
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
