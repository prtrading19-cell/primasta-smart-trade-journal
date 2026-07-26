import type {
  ResearchAsset,
  ResearchProfile,
  ResearchAIRequest,
  ResearchAIResult,
  ResearchAISectionResult,
  ResearchAISummaryResult,
} from "./ResearchTypes";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1";

export function buildAssetAnalystInstruction(profile: ResearchProfile): string {
  return profile.aiAnalystInstruction;
}

export function buildAssetAnalystPrompt(
  reportDate: string,
  dataContext: string,
  sectionNames: string[]
): string {
  return `
Analyze the following market data for ${reportDate}.

The data below was collected from multiple verified APIs.
You are the ANALYST. Do NOT search the internet. Do NOT invent prices. Use ONLY the data provided below.

YOUR TASK:
For each driver section, provide:
- impact: the impact classification for the asset
- reason: 1 sentence explaining the impact based on the provided data
- newsHeadline: from the provided news or "Data not verified"
- newsSummary: 1-2 sentences referencing the actual data point and source
- chartObservation: from the provided data
- sourceLink: from the provided news or "Not found"

Also provide a fullSummary with overallBias, preTradeVerdict, and finalGuidance.

DATA:
${dataContext}

Return exactly ${sectionNames.length} sections matching these drivers:
${sectionNames.map((d, i) => `${i + 1}. ${d}`).join("\n")}
`.trim();
}

export function buildAssetDataContext(
  marketData: Record<string, unknown>,
  mappedSections: Array<Record<string, unknown>>,
  assetLabel: string
): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(marketData)) {
    if (key === "providerResults" || key === "newsItems") continue;
    lines.push(`${key}: ${String(value ?? "N/A")}`);
  }

  if (mappedSections.length > 0) {
    lines.push("");
    lines.push("PRE-MAPPED SECTIONS:");
    for (const s of mappedSections) {
      lines.push(`- ${s.driver ?? "Unknown"}: ${s.currentDataValue ?? ""} | Impact: ${s.impact ?? "N/A"} | ${s.reason ?? ""}`);
    }
  }

  return lines.join("\n");
}

export async function requestAssetAIAnalysis(
  apiKey: string,
  profile: ResearchProfile,
  dataContext: string,
  reportDate: string,
  sectionNames: string[]
): Promise<ResearchAIResult | null> {
  const systemPrompt = buildAssetAnalystInstruction(profile);
  const userPrompt = buildAssetAnalystPrompt(reportDate, dataContext, sectionNames);

  const impactEnum = [
    profile.impactLabels.bullish,
    profile.impactLabels.bearish,
    profile.impactLabels.neutral,
    profile.impactLabels.mixed,
  ];

  const biasEnum = [
    profile.overallBiasLabels.bullish,
    profile.overallBiasLabels.bearish,
    profile.overallBiasLabels.neutral,
    profile.overallBiasLabels.mixed,
  ];

  const verdictEnum = [
    profile.preTradeVerdictLabels.tradeAllowed,
    profile.preTradeVerdictLabels.wait,
    profile.preTradeVerdictLabels.avoidBeforeNews,
    profile.preTradeVerdictLabels.manageExisting,
  ];

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["sections", "fullSummary"],
    properties: {
      sections: {
        type: "array",
        minItems: 1,
        maxItems: 30,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["driver", "impact", "reason", "newsHeadline", "newsSummary", "chartObservation", "sourceLink"],
          properties: {
            driver: { type: "string", enum: sectionNames },
            impact: { type: "string", enum: impactEnum },
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
        required: ["overallBias", "preTradeVerdict", "finalGuidance"],
        properties: {
          overallBias: { type: "string", enum: biasEnum },
          preTradeVerdict: { type: "string", enum: verdictEnum },
          finalGuidance: { type: "string" },
        },
      },
    },
  };

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        text: {
          format: {
            type: "json_schema",
            name: `${profile.asset}_research_analysis`,
            strict: true,
            schema,
          },
        },
      }),
    });

    if (!response.ok) {
      console.info(`[${profile.asset}-ai] openai_error`, response.status);
      return null;
    }

    const responseBody = await response.json();
    return extractParsedAIResult(responseBody);
  } catch (error) {
    console.info(`[${profile.asset}-ai] openai_exception`, error instanceof Error ? error.message : "unknown");
    return null;
  }
}

function extractParsedAIResult(responseBody: unknown): ResearchAIResult | null {
  if (!isRecord(responseBody)) return null;

  if (isRecord(responseBody.output_parsed) && Array.isArray(responseBody.output_parsed.sections)) {
    return responseBody.output_parsed as unknown as ResearchAIResult;
  }

  const output = Array.isArray(responseBody.output) ? responseBody.output : [];
  for (const item of output) {
    if (!isRecord(item)) continue;
    if (isRecord(item.parsed) && Array.isArray(item.parsed.sections)) {
      return item.parsed as unknown as ResearchAIResult;
    }
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (isRecord(part) && isRecord(part.parsed) && Array.isArray(part.parsed.sections)) {
        return part.parsed as unknown as ResearchAIResult;
      }
    }
  }

  const outputText = extractOutputText(responseBody);
  if (outputText) {
    try {
      const parsed = JSON.parse(cleanJsonText(outputText));
      if (Array.isArray(parsed.sections)) return parsed as unknown as ResearchAIResult;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
