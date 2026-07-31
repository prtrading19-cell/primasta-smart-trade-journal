import type { ResearchInstitutional, InstitutionalEngineInput } from "../models";
import type { DriverBias } from "@/types/goldResearchConfig";

export function executeInstitutionalEngine(input: InstitutionalEngineInput): ResearchInstitutional {
  const factors: string[] = [];
  const conflicts: string[] = [];

  const etfInterpretation = interpretETF(input.etfFlows);
  if (etfInterpretation) factors.push(etfInterpretation);

  const cotInterpretation = interpretCOT(input.cot);
  if (cotInterpretation) factors.push(cotInterpretation);

  const macroInterpretation = interpretMacro(input.macro);
  if (macroInterpretation) factors.push(macroInterpretation);

  const breadthInterpretation = interpretBreadth(input.breadth);
  if (breadthInterpretation) factors.push(breadthInterpretation);

  const volInterpretation = interpretVolatility(input.volatility);
  if (volInterpretation) factors.push(volInterpretation);

  const { bias: overallBias, score: overallScore } = computeOverallBias(input);
  const confidence = computeConfidence(input);

  const summary = buildSummary(overallBias, overallScore, factors);

  return {
    bias: overallBias,
    score: overallScore,
    confidence,
    strength: confidence >= 70 ? "Strong" : confidence >= 45 ? "Moderate" : "Weak",
    etfFlowInterpretation: etfInterpretation ?? "No ETF data",
    cotInterpretation: cotInterpretation ?? "No COT data",
    macroInterpretation: macroInterpretation ?? "No macro data",
    breadthInterpretation: breadthInterpretation ?? "No breadth data",
    volatilityInterpretation: volInterpretation ?? "No volatility data",
    supportingFactors: factors,
    conflictingFactors: conflicts,
    summary,
  };
}

function interpretETF(etf?: InstitutionalEngineInput["etfFlows"]): string | null {
  if (!etf || !etf.etfs || etf.etfs.length === 0) return null;
  const inflowCount = etf.etfs.filter((e) => e.flowDirection === "Inflow").length;
  const outflowCount = etf.etfs.filter((e) => e.flowDirection === "Outflow").length;
  if (inflowCount > outflowCount) return `ETF accumulation: ${inflowCount} inflows vs ${outflowCount} outflows`;
  if (outflowCount > inflowCount) return `ETF distribution: ${outflowCount} outflows vs ${inflowCount} inflows`;
  return `ETF flows balanced: ${inflowCount} in, ${outflowCount} out`;
}

function interpretCOT(cot?: InstitutionalEngineInput["cot"]): string | null {
  if (!cot || cot.length === 0) return null;
  const entry = cot[0];
  const commNet = entry.commercials?.netLong ?? 0;
  const specNet = entry.nonCommercials?.netLong ?? 0;
  return `COT: Commercials ${commNet >= 0 ? "+" : ""}${commNet}, Speculators ${specNet >= 0 ? "+" : ""}${specNet}`;
}

function interpretMacro(macro?: InstitutionalEngineInput["macro"]): string | null {
  if (!macro?.indicators || macro.indicators.length === 0) return null;
  const improving = macro.indicators.filter((i) => i.trend === "Improving").length;
  const deteriorating = macro.indicators.filter((i) => i.trend === "Deteriorating").length;
  return `Macro: ${improving} improving, ${deteriorating} deteriorating indicators`;
}

function interpretBreadth(breadth?: InstitutionalEngineInput["breadth"]): string | null {
  if (!breadth) return null;
  const total = breadth.advancing + breadth.declining;
  if (total === 0) return null;
  return `Breadth: ${breadth.advancing}/${total} advancing (ratio: ${breadth.ratio?.toFixed(2) ?? (breadth.declining > 0 ? (breadth.advancing / breadth.declining).toFixed(2) : "N/A")})`;
}

function interpretVolatility(vol?: InstitutionalEngineInput["volatility"]): string | null {
  if (!vol) return null;
  const parts: string[] = [];
  if (vol.vix !== undefined) parts.push(`VIX: ${vol.vix.toFixed(1)}`);
  if (vol.gvz !== undefined) parts.push(`GVZ: ${vol.gvz.toFixed(1)}`);
  return parts.length > 0 ? parts.join(", ") : null;
}

function computeOverallBias(input: InstitutionalEngineInput): { bias: DriverBias; score: number } {
  let score = 50;
  let signals = 0;

  if (input.etfFlows?.etfs && input.etfFlows.etfs.length > 0) {
    const inflowCount = input.etfFlows.etfs.filter((e) => e.flowDirection === "Inflow").length;
    const total = input.etfFlows.etfs.length;
    score += ((inflowCount / total) * 100 - 50) * 0.30;
    signals++;
  }

  if (input.cot && input.cot.length > 0) {
    const commNet = input.cot[0].commercials?.netLong ?? 0;
    score += (commNet / 20000) * 20;
    signals++;
  }

  if (input.macro?.indicators) {
    const improving = input.macro.indicators.filter((i) => i.trend === "Improving").length;
    const deteriorating = input.macro.indicators.filter((i) => i.trend === "Deteriorating").length;
    const total = input.macro.indicators.length || 1;
    score += ((improving - deteriorating) / total) * 30;
    signals++;
  }

  if (input.breadth) {
    const total = input.breadth.advancing + input.breadth.declining;
    if (total > 0) {
      score += ((input.breadth.advancing / total) * 100 - 50) * 0.15;
      signals++;
    }
  }

  const finalScore = signals > 0 ? Math.round(Math.max(0, Math.min(100, score))) : 50;
  const bias: DriverBias = finalScore >= 60 ? "Bullish" : finalScore <= 40 ? "Bearish" : "Neutral";

  return { bias, score: finalScore };
}

function computeConfidence(input: InstitutionalEngineInput): number {
  let available = 0;
  if (input.etfFlows?.etfs && input.etfFlows.etfs.length > 0) available++;
  if (input.cot && input.cot.length > 0) available++;
  if (input.macro?.indicators && input.macro.indicators.length > 0) available++;
  if (input.breadth && (input.breadth.advancing > 0 || input.breadth.declining > 0)) available++;
  if (input.volatility) available++;
  return Math.round((available / 5) * 100);
}

function buildSummary(bias: DriverBias, score: number, factors: string[]): string {
  const parts: string[] = [];
  parts.push(`Institutional bias: ${bias} (score: ${score}/100).`);
  if (factors.length > 0) {
    parts.push(`Factors: ${factors.join("; ")}.`);
  }
  return parts.join(" ");
}
