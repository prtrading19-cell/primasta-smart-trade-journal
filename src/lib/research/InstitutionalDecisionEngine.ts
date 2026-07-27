import type { ResearchDecisionInput, ResearchProfile } from "./ResearchTypes";
import type { DriverAnalysisObject, DriverBias } from "@/types/goldResearchConfig";
import type { CategoryScoreBatchResult } from "@/lib/categoryScoreEngine";
import type { TechnicalBiasResult } from "@/types/technicalBias";
import type { InstitutionalFlowResult } from "@/types/institutionalFlow";
import type {
  InstitutionalDecisionResult,
  CategoryBreakdown,
  InstitutionalExplanation,
  InstitutionalMarketBias,
  InstitutionalRiskRating,
  TradeRecommendation,
  CategoryStatus,
} from "./InstitutionalDecisionTypes";
import { calculateResearchDecision } from "./ResearchDecisionEngine";

export function calculateInstitutionalDecision(
  input: ResearchDecisionInput
): InstitutionalDecisionResult {
  const ts = new Date().toISOString();
  const baseDecision = calculateResearchDecision(input);

  const categoryBreakdown = computeCategoryBreakdown(input);
  const overallScore = computeOverallScore(input, categoryBreakdown);
  const marketBias = deriveMarketBias(overallScore, baseDecision.overallConfidence, input.categoryScores);
  const riskRating = deriveInstitutionalRiskRating(
    overallScore,
    baseDecision.overallConfidence,
    baseDecision.conflictScore,
    input.institutionalFlow,
    input.technicalBias
  );
  const confidence = computeInstitutionalConfidence(input, categoryBreakdown);
  const recommendation = deriveRecommendation(marketBias, confidence, overallScore, riskRating, input);
  const topBullishDrivers = gatherTopBullish(categoryBreakdown, input);
  const topBearishDrivers = gatherTopBearish(categoryBreakdown, input);
  const explanation = buildInstitutionalExplanation(
    marketBias, recommendation, riskRating, confidence,
    topBullishDrivers, topBearishDrivers, input, categoryBreakdown
  );
  const diagnosticsSummary = buildDiagnosticsSummary(input, categoryBreakdown, confidence);

  return {
    baseDecision,
    overallScore,
    marketBias,
    recommendation,
    riskRating,
    confidence,
    categoryBreakdown,
    topBullishDrivers,
    topBearishDrivers,
    explanation,
    diagnosticsSummary,
    timestamp: ts,
  };
}

function computeCategoryBreakdown(input: ResearchDecisionInput): CategoryBreakdown[] {
  const profile = input.profile;
  const catScores = input.categoryScores;
  const driverAnalyses = input.driverAnalyses;

  const weightMap = buildWeightMap(profile);
  const totalWeight = sumWeights(weightMap);

  const allCatDefIds = profile.categoryDefinitions.map((c) => c.id);

  return allCatDefIds.map((catId) => {
    const catDef = profile.categoryDefinitions.find((c) => c.id === catId);
    const catTitle = catDef?.title ?? catId;
    const catScore = catScores.scores.find((s) => s.categoryId === catId);

    const rawScore = catScore?.score ?? 50;
    const weight = (weightMap.get(catId) ?? 0) / totalWeight;
    const weightedScore = rawScore * weight;
    const contribution = weightedScore;
    const confidence = catScore?.confidence ?? 0;

    const catDrivers = driverAnalyses.filter((d) => d.categoryId === catId);
    const expectedDriverIds = catDef?.driverIds ?? [];

    const bullishDrivers = catDrivers
      .filter((d) => d.bias.includes("Bullish"))
      .sort((a, b) => b.confidence - a.confidence)
      .map((d) => d.driverTitle);

    const bearishDrivers = catDrivers
      .filter((d) => d.bias.includes("Bearish"))
      .sort((a, b) => b.confidence - a.confidence)
      .map((d) => d.driverTitle);

    const providedDriverIds = new Set(catDrivers.map((d) => d.driverId));
    const missingDrivers = expectedDriverIds
      .filter((id) => !providedDriverIds.has(id))
      .map((id) => {
        const reg = profile.driverRegistry.find((r) => r.id === id);
        return reg?.title ?? id;
      });

    const status: CategoryStatus = catDrivers.length === 0
      ? "Unavailable"
      : missingDrivers.length > expectedDriverIds.length * 0.5
        ? "Partial"
        : "Available";

    return {
      categoryId: catId,
      categoryTitle: catTitle,
      rawScore,
      weightedScore,
      weight,
      contribution,
      confidence,
      status,
      bullishDrivers,
      bearishDrivers,
      missingDrivers,
    };
  });
}

function buildWeightMap(profile: ResearchProfile): Map<string, number> {
  const map = new Map<string, number>();

  if (profile.categoryWeights?.categoryWeights) {
    for (const cw of profile.categoryWeights.categoryWeights) {
      map.set(cw.categoryId, cw.weight);
    }
  }

  for (const catDef of profile.categoryDefinitions) {
    if (!map.has(catDef.id)) {
      map.set(catDef.id, catDef.defaultWeight);
    }
  }

  return map;
}

function sumWeights(map: Map<string, number>): number {
  let total = 0;
  for (const w of map.values()) total += w;
  return total > 0 ? total : 1;
}

function computeOverallScore(
  input: ResearchDecisionInput,
  categoryBreakdown: CategoryBreakdown[]
): number {
  const catScore = categoryBreakdown.reduce((sum, cb) => sum + cb.contribution, 0);
  const techScore = input.technicalBias.technicalScore;
  const instScore = input.institutionalFlow.institutionalScore;

  const catWeight = 0.45;
  const techWeight = 0.30;
  const instWeight = 0.25;

  const rawScore = catScore * catWeight + techScore * techWeight + instScore * instWeight;
  return Math.round(Math.max(0, Math.min(100, rawScore)));
}

function deriveMarketBias(
  overallScore: number,
  confidence: number,
  categoryScores: CategoryScoreBatchResult
): InstitutionalMarketBias {
  const bullishCount = categoryScores.scores.filter((s) => s.bias.includes("Bullish")).length;
  const bearishCount = categoryScores.scores.filter((s) => s.bias.includes("Bearish")).length;
  const totalCategories = categoryScores.scores.length || 1;
  const agreement = Math.max(bullishCount, bearishCount) / totalCategories;

  const hasStrongAgreement = agreement >= 0.6;
  const hasMajority = agreement >= 0.4;

  if (overallScore >= 70 && confidence >= 60 && hasStrongAgreement) return "Strong Bullish";
  if (overallScore >= 58 && confidence >= 45 && hasMajority) return "Bullish";
  if (overallScore <= 30 && confidence >= 60 && hasStrongAgreement) return "Strong Bearish";
  if (overallScore <= 42 && confidence >= 45 && hasMajority) return "Bearish";
  return "Neutral";
}

function deriveInstitutionalRiskRating(
  overallScore: number,
  confidence: number,
  conflictScore: number,
  institutionalFlow: InstitutionalFlowResult,
  technicalBias: TechnicalBiasResult
): InstitutionalRiskRating {
  let riskScore = 0;

  riskScore += (100 - confidence) * 0.25;
  riskScore += conflictScore * 0.20;

  const extremeConcentration = institutionalFlow.concentrationRisks.filter(
    (r) => r.severity === "Extreme"
  ).length;
  const highConcentration = institutionalFlow.concentrationRisks.filter(
    (r) => r.severity === "High"
  ).length;
  riskScore += extremeConcentration * 15;
  riskScore += highConcentration * 8;

  if (technicalBias.setupPresent) riskScore -= 5;
  if (technicalBias.conflictingFactors.length > 2) riskScore += 10;

  const extremeVolatility = overallScore < 25 || overallScore > 85;
  if (extremeVolatility) riskScore += 10;

  if (institutionalFlow.dataQuality?.missingDrivers) {
    const missing = institutionalFlow.dataQuality.missingDrivers.length;
    riskScore += missing * 2;
  }

  if (technicalBias.dataQuality) {
    const missingTech = technicalBias.dataQuality.missingFields?.length ?? 0;
    riskScore += missingTech * 1.5;
  }

  riskScore = Math.max(0, Math.min(100, riskScore));

  if (riskScore >= 70) return "Extreme";
  if (riskScore >= 50) return "High";
  if (riskScore >= 30) return "Moderate";
  if (riskScore >= 15) return "Low";
  return "Very Low";
}

function computeInstitutionalConfidence(
  input: ResearchDecisionInput,
  categoryBreakdown: CategoryBreakdown[]
): number {
  const totalDrivers = input.driverAnalyses.length;
  const driversWithBias = input.driverAnalyses.filter(
    (d) => d.bias !== "Neutral"
  ).length;
  const biasRatio = totalDrivers > 0 ? driversWithBias / totalDrivers : 0;

  const availableCategories = categoryBreakdown.filter(
    (cb) => cb.status === "Available"
  ).length;
  const totalCategories = categoryBreakdown.length || 1;
  const categoryCompleteness = availableCategories / totalCategories;

  const missingDriverCount = categoryBreakdown.reduce(
    (sum, cb) => sum + cb.missingDrivers.length, 0
  );
  const totalExpectedDrivers = categoryBreakdown.reduce(
    (sum, cb) => sum + cb.bullishDrivers.length + cb.bearishDrivers.length + cb.missingDrivers.length, 0
  ) || 1;
  const driverCompleteness = 1 - (missingDriverCount / totalExpectedDrivers);

  const sourceConfidences: number[] = [];
  if (input.categoryScores.overallConfidence > 0) sourceConfidences.push(input.categoryScores.overallConfidence);
  if (input.technicalBias.confidence > 0) sourceConfidences.push(input.technicalBias.confidence);
  if (input.institutionalFlow.confidence > 0) sourceConfidences.push(input.institutionalFlow.confidence);
  const avgSourceConfidence = sourceConfidences.length > 0
    ? sourceConfidences.reduce((a, b) => a + b, 0) / sourceConfidences.length
    : 0;

  const alignment = input.categoryScores.driverAlignment;

  const missingSourceCount = sourceConfidences.length < 3 ? (3 - sourceConfidences.length) * 10 : 0;

  const confidence =
    biasRatio * 20 +
    categoryCompleteness * 20 +
    driverCompleteness * 20 +
    avgSourceConfidence * 0.30 +
    alignment * 0.10 -
    missingSourceCount;

  return Math.round(Math.max(0, Math.min(100, confidence)));
}

function deriveRecommendation(
  marketBias: InstitutionalMarketBias,
  confidence: number,
  overallScore: number,
  riskRating: InstitutionalRiskRating,
  input: ResearchDecisionInput
): TradeRecommendation {
  const hasUpcomingEarnings = input.driverAnalyses.some(
    (d) => d.categoryId === "earnings" && d.bias !== "Neutral"
  );

  if (riskRating === "Extreme") {
    if (marketBias.includes("Bearish")) return "STRONG SELL";
    if (marketBias.includes("Bullish")) return "REDUCE RISK";
    return "WAIT";
  }

  if (marketBias === "Strong Bullish" && confidence >= 65 && overallScore >= 70) {
    return riskRating === "High" ? "BUY ON PULLBACK" : "BUY";
  }

  if (marketBias === "Bullish" && confidence >= 50) {
    if (riskRating === "High" || riskRating === "Moderate") return "BUY ON PULLBACK";
    return "BUY";
  }

  if (marketBias === "Strong Bearish" && confidence >= 65 && overallScore <= 30) {
    return riskRating === "High" ? "REDUCE RISK" : "STRONG SELL";
  }

  if (marketBias === "Bearish" && confidence >= 50) {
    if (riskRating === "High") return "REDUCE RISK";
    return "SELL";
  }

  if (hasUpcomingEarnings && confidence < 55) return "WAIT";

  if (confidence < 35) return "WAIT";

  return "WAIT";
}

function gatherTopBullish(
  categoryBreakdown: CategoryBreakdown[],
  input: ResearchDecisionInput
): string[] {
  const allBullish: { name: string; score: number }[] = [];

  for (const cb of categoryBreakdown) {
    for (const driver of cb.bullishDrivers) {
      const analysis = input.driverAnalyses.find((d) => d.driverTitle === driver);
      allBullish.push({
        name: driver,
        score: (analysis?.confidence ?? 50) * (analysis?.weight ?? 1),
      });
    }
  }

  return allBullish
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((d) => d.name);
}

function gatherTopBearish(
  categoryBreakdown: CategoryBreakdown[],
  input: ResearchDecisionInput
): string[] {
  const allBearish: { name: string; score: number }[] = [];

  for (const cb of categoryBreakdown) {
    for (const driver of cb.bearishDrivers) {
      const analysis = input.driverAnalyses.find((d) => d.driverTitle === driver);
      allBearish.push({
        name: driver,
        score: (analysis?.confidence ?? 50) * (analysis?.weight ?? 1),
      });
    }
  }

  return allBearish
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((d) => d.name);
}

function buildInstitutionalExplanation(
  marketBias: InstitutionalMarketBias,
  recommendation: TradeRecommendation,
  riskRating: InstitutionalRiskRating,
  confidence: number,
  topBullish: string[],
  topBearish: string[],
  input: ResearchDecisionInput,
  categoryBreakdown: CategoryBreakdown[]
): InstitutionalExplanation {
  const unavailableCategories = categoryBreakdown.filter((cb) => cb.status === "Unavailable");
  const partialCategories = categoryBreakdown.filter((cb) => cb.status === "Partial");

  const biasReason = `Overall score ${input.categoryScores.totalScore.toFixed(1)} with ${marketBias.toLowerCase()} bias across ${input.categoryScores.scores.length} categories.`;

  const risks: string[] = [];
  if (riskRating === "Extreme" || riskRating === "High") {
    risks.push(`Risk rating: ${riskRating}.`);
  }
  for (const cat of unavailableCategories) {
    risks.push(`${cat.categoryTitle} data unavailable — confidence reduced.`);
  }
  for (const cat of partialCategories) {
    risks.push(`${cat.categoryTitle} partial data — ${cat.missingDrivers.length} driver(s) missing.`);
  }
  if (input.institutionalFlow.concentrationRisks.length > 0) {
    risks.push(`${input.institutionalFlow.concentrationRisks.length} concentration risk(s) detected.`);
  }
  if (input.technicalBias.conflictingFactors.length > 2) {
    risks.push(`${input.technicalBias.conflictingFactors.length} conflicting technical factors.`);
  }

  const planParts: string[] = [];
  planParts.push(`Recommendation: ${recommendation}.`);
  if (topBullish.length > 0) {
    planParts.push(`Bullish drivers: ${topBullish.slice(0, 3).join(", ")}.`);
  }
  if (topBearish.length > 0) {
    planParts.push(`Bearish drivers: ${topBearish.slice(0, 3).join(", ")}.`);
  }
  planParts.push(`Confidence: ${confidence}%. Risk: ${riskRating}.`);

  return {
    marketBias: biasReason,
    topBullishDrivers: topBullish,
    topBearishDrivers: topBearish,
    institutionalRisks: risks,
    tradePlan: planParts.join(" "),
    confidenceSummary: `Confidence: ${confidence}%. Sources: ${input.categoryScores.scores.length} categories, ${input.driverAnalyses.length} drivers analyzed.`,
  };
}

function buildDiagnosticsSummary(
  input: ResearchDecisionInput,
  categoryBreakdown: CategoryBreakdown[],
  confidence: number
): string[] {
  const lines: string[] = [];

  const unavailable = categoryBreakdown.filter((cb) => cb.status === "Unavailable");
  const partial = categoryBreakdown.filter((cb) => cb.status === "Partial");
  const available = categoryBreakdown.filter((cb) => cb.status === "Available");

  lines.push(`Categories: ${available.length} available, ${partial.length} partial, ${unavailable.length} unavailable.`);
  lines.push(`Drivers: ${input.driverAnalyses.length} analyzed.`);
  lines.push(`Overall confidence: ${confidence}%.`);

  if (unavailable.length > 0) {
    lines.push(`Unavailable categories: ${unavailable.map((c) => c.categoryTitle).join(", ")}.`);
  }

  const totalMissing = categoryBreakdown.reduce((sum, cb) => sum + cb.missingDrivers.length, 0);
  if (totalMissing > 0) {
    lines.push(`Missing drivers: ${totalMissing}.`);
  }

  return lines;
}
