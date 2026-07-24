import type {
  DriverAnalysisObject,
  CategoryScoreObject,
  DriverBias,
  DriverStrength,
  WeightConfiguration
} from "@/types/goldResearchConfig";
import { calculateCategoryScore, calculateAllCategoryScores, calculateCategoryScoresBatch } from "./categoryScoreEngine";
import { validateCategoryScore, validateDriverAnalyses, validateWeightConfiguration } from "./categoryValidators";
import { resolveWeights, normalizeWeights } from "./weightResolver";
import { CATEGORY_DEFINITIONS } from "@/config/categoryConfig";
import { DEFAULT_WEIGHT_CONFIGURATION } from "@/config/defaultWeights";

export interface VerificationScenario {
  name: string;
  description: string;
  driverAnalyses: DriverAnalysisObject[];
  config?: WeightConfiguration;
  expectedCategoryIds?: string[];
}

export interface VerificationResult {
  scenarioName: string;
  passed: boolean;
  scores: CategoryScoreObject[];
  diagnostics: string[];
  assertionResults: AssertionResult[];
}

export interface AssertionResult {
  description: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
}

function createMockAnalysis(
  driverId: string,
  driverTitle: string,
  categoryId: string,
  bias: DriverBias,
  strength: DriverStrength,
  confidence: number,
  weight: number = 1.0
): DriverAnalysisObject {
  return {
    driverId,
    driverTitle,
    categoryId,
    bias,
    biasReason: `Mock ${bias} reason for ${driverTitle}`,
    strength,
    strengthFactors: [`Mock strength factor for ${driverTitle}`],
    confidence,
    confidenceReason: `Mock confidence reason for ${driverTitle}`,
    technicalObservation: `Mock technical observation for ${driverTitle}`,
    supportingDrivers: [],
    conflictingDrivers: [],
    reason: `Mock reason for ${driverTitle}: ${bias} with ${strength} strength`,
    aiExplanation: `Mock AI explanation for ${driverTitle}`,
    source: "mock",
    sourceUrl: "",
    timestamp: new Date().toISOString(),
    weight,
    contribution: 0,
    dataFields: {}
  };
}

export const SCENARIOS: VerificationScenario[] = [
  {
    name: "mixed-bullish-bearish",
    description: "Mixed bullish and bearish drivers across categories",
    driverAnalyses: [
      createMockAnalysis("dxy-us-dollar", "DXY / US Dollar", "macro", "Bullish", "Strong", 80),
      createMockAnalysis("us-yields", "US Yields", "macro", "Bearish", "Moderate", 65),
      createMockAnalysis("real-yields", "Real Yields", "macro", "Bullish", "Weak", 50),
      createMockAnalysis("fed-tone-fomc", "Fed Tone / FOMC", "macro", "Neutral", "Moderate", 70),
      createMockAnalysis("cpi-pce", "CPI / PCE", "inflation", "Bearish", "Strong", 85),
      createMockAnalysis("nfp-jobs", "NFP / Jobs", "employment", "Bullish", "Moderate", 75),
      createMockAnalysis("economic-growth", "Economic Growth", "growth", "Neutral", "Weak", 40),
      createMockAnalysis("etf-flows", "Gold ETF Flows", "institutional", "Bullish", "Strong", 90),
      createMockAnalysis("central-bank-demand", "Central Bank Demand", "institutional", "Bullish", "Moderate", 80),
      createMockAnalysis("market-sentiment", "Market Sentiment", "sentiment", "Bearish", "Weak", 55),
      createMockAnalysis("crowd-positioning", "Crowd Positioning", "sentiment", "Neutral", "Moderate", 60),
      createMockAnalysis("geopolitics", "Geopolitics", "geopolitics", "Bullish", "Moderate", 70),
      createMockAnalysis("gold-technical-structure", "Gold Technical Structure", "technical", "Bullish", "Strong", 85),
      createMockAnalysis("liquidity-conditions", "Liquidity Conditions", "liquidity", "Bullish", "Moderate", 75),
      createMockAnalysis("seasonality", "Seasonality", "seasonality", "Bullish", "Weak", 45),
      createMockAnalysis("position-risk", "Position Risk", "seasonality", "Bearish", "Moderate", 65),
    ]
  },
  {
    name: "missing-drivers",
    description: "Some drivers missing from categories",
    driverAnalyses: [
      createMockAnalysis("dxy-us-dollar", "DXY / US Dollar", "macro", "Bullish", "Strong", 80),
      createMockAnalysis("us-yields", "US Yields", "macro", "Bearish", "Moderate", 65),
      createMockAnalysis("cpi-pce", "CPI / PCE", "inflation", "Bullish", "Strong", 85),
      createMockAnalysis("nfp-jobs", "NFP / Jobs", "employment", "Bearish", "Moderate", 70),
      createMockAnalysis("etf-flows", "Gold ETF Flows", "institutional", "Bullish", "Strong", 90),
      createMockAnalysis("gold-technical-structure", "Gold Technical Structure", "technical", "Bullish", "Strong", 85),
    ]
  },
  {
    name: "disabled-drivers",
    description: "Testing with disabled drivers (should be ignored)",
    driverAnalyses: [
      createMockAnalysis("dxy-us-dollar", "DXY / US Dollar", "macro", "Bullish", "Strong", 80),
      createMockAnalysis("cpi-pce", "CPI / PCE", "inflation", "Bearish", "Moderate", 75),
      createMockAnalysis("nfp-jobs", "NFP / Jobs", "employment", "Neutral", "Weak", 40),
      createMockAnalysis("gold-technical-structure", "Gold Technical Structure", "technical", "Bullish", "Strong", 85),
    ]
  },
  {
    name: "weighted-calculations",
    description: "Verifying weighted score calculations",
    config: {
      categoryWeights: [
        {
          categoryId: "macro",
          weight: 0.30,
          driverWeights: [
            { driverId: "dxy-us-dollar", weight: 0.40 },
            { driverId: "us-yields", weight: 0.30 },
            { driverId: "real-yields", weight: 0.20 },
            { driverId: "fed-tone-fomc", weight: 0.10 },
          ]
        },
        {
          categoryId: "inflation",
          weight: 0.20,
          driverWeights: [
            { driverId: "cpi-pce", weight: 1.0 },
          ]
        },
        {
          categoryId: "technical",
          weight: 0.25,
          driverWeights: [
            { driverId: "gold-technical-structure", weight: 1.0 },
          ]
        },
        {
          categoryId: "institutional",
          weight: 0.15,
          driverWeights: [
            { driverId: "etf-flows", weight: 0.60 },
            { driverId: "central-bank-demand", weight: 0.40 },
          ]
        },
        {
          categoryId: "sentiment",
          weight: 0.10,
          driverWeights: [
            { driverId: "market-sentiment", weight: 0.50 },
            { driverId: "crowd-positioning", weight: 0.50 },
          ]
        },
      ]
    },
    driverAnalyses: [
      createMockAnalysis("dxy-us-dollar", "DXY / US Dollar", "macro", "Bullish", "Strong", 85),
      createMockAnalysis("us-yields", "US Yields", "macro", "Bearish", "Moderate", 70),
      createMockAnalysis("real-yields", "Real Yields", "macro", "Bullish", "Weak", 55),
      createMockAnalysis("fed-tone-fomc", "Fed Tone / FOMC", "macro", "Neutral", "Moderate", 75),
      createMockAnalysis("cpi-pce", "CPI / PCE", "inflation", "Bearish", "Strong", 90),
      createMockAnalysis("gold-technical-structure", "Gold Technical Structure", "technical", "Bullish", "Strong", 88),
      createMockAnalysis("etf-flows", "Gold ETF Flows", "institutional", "Bullish", "Moderate", 80),
      createMockAnalysis("central-bank-demand", "Central Bank Demand", "institutional", "Bullish", "Strong", 85),
      createMockAnalysis("market-sentiment", "Market Sentiment", "sentiment", "Neutral", "Weak", 50),
      createMockAnalysis("crowd-positioning", "Crowd Positioning", "sentiment", "Bearish", "Moderate", 65),
    ]
  },
  {
    name: "category-confidence",
    description: "Verifying confidence calculations across categories",
    driverAnalyses: [
      createMockAnalysis("dxy-us-dollar", "DXY / US Dollar", "macro", "Bullish", "Strong", 95),
      createMockAnalysis("us-yields", "US Yields", "macro", "Bearish", "Strong", 90),
      createMockAnalysis("real-yields", "Real Yields", "macro", "Bullish", "Strong", 92),
      createMockAnalysis("fed-tone-fomc", "Fed Tone / FOMC", "macro", "Neutral", "Strong", 88),
      createMockAnalysis("cpi-pce", "CPI / PCE", "inflation", "Bullish", "Moderate", 75),
      createMockAnalysis("nfp-jobs", "NFP / Jobs", "employment", "Bearish", "Weak", 40),
      createMockAnalysis("gold-technical-structure", "Gold Technical Structure", "technical", "Bullish", "Strong", 85),
    ]
  }
];

export function runVerificationScenario(scenario: VerificationScenario): VerificationResult {
  const diagnostics: string[] = [];
  const assertionResults: AssertionResult[] = [];

  const validation = validateDriverAnalyses(scenario.driverAnalyses);
  diagnostics.push(`Input validation: ${validation.isValid ? "PASS" : "FAIL"}`);
  diagnostics.push(`Validation errors: ${validation.errors.length}`);
  diagnostics.push(`Validation warnings: ${validation.warnings.length}`);

  if (scenario.config) {
    const weightValidation = validateWeightConfiguration(scenario.config);
    diagnostics.push(`Weight validation: ${weightValidation.isValid ? "PASS" : "FAIL"}`);
  }

  const scores = calculateAllCategoryScores(scenario.driverAnalyses, scenario.config);

  const nonEmptyScores = scores.filter((s) => s.driverCount > 0);

  assertionResults.push({
    description: "All scores should be valid",
    passed: nonEmptyScores.every((s) => !isNaN(s.score) && isFinite(s.score)),
    expected: "All scores valid",
    actual: nonEmptyScores.every((s) => !isNaN(s.score) && isFinite(s.score)) ? "All scores valid" : "Some scores invalid"
  });

  assertionResults.push({
    description: "All confidences should be 0-100",
    passed: nonEmptyScores.every((s) => s.confidence >= 0 && s.confidence <= 100),
    expected: "0-100",
    actual: nonEmptyScores.every((s) => s.confidence >= 0 && s.confidence <= 100) ? "0-100" : "Out of range"
  });

  assertionResults.push({
    description: "All alignment scores should be 0-1",
    passed: nonEmptyScores.every((s) => s.alignmentScore >= 0 && s.alignmentScore <= 1),
    expected: "0-1",
    actual: nonEmptyScores.every((s) => s.alignmentScore >= 0 && s.alignmentScore <= 1) ? "0-1" : "Out of range"
  });

  assertionResults.push({
    description: "All contributions should have non-negative weights",
    passed: nonEmptyScores.every((s) => s.driverContributions.every((c) => c.weight >= 0)),
    expected: "All weights >= 0",
    actual: nonEmptyScores.every((s) => s.driverContributions.every((c) => c.weight >= 0)) ? "All weights >= 0" : "Some weights negative"
  });

  assertionResults.push({
    description: "Conflict detection should be boolean",
    passed: nonEmptyScores.every((s) => typeof s.hasConflict === "boolean"),
    expected: "boolean",
    actual: nonEmptyScores.every((s) => typeof s.hasConflict === "boolean") ? "boolean" : "not boolean"
  });

  assertionResults.push({
    description: "Each score should have a timestamp",
    passed: nonEmptyScores.every((s) => Boolean(s.timestamp)),
    expected: "Non-empty timestamps",
    actual: nonEmptyScores.every((s) => Boolean(s.timestamp)) ? "Non-empty timestamps" : "Some timestamps missing"
  });

  assertionResults.push({
    description: "Each score should have a reason",
    passed: nonEmptyScores.every((s) => Boolean(s.reason)),
    expected: "Non-empty reasons",
    actual: nonEmptyScores.every((s) => Boolean(s.reason)) ? "Non-empty reasons" : "Some reasons missing"
  });

  assertionResults.push({
    description: "Each score should have driver contributions array",
    passed: nonEmptyScores.every((s) => Array.isArray(s.driverContributions)),
    expected: "Array",
    actual: nonEmptyScores.every((s) => Array.isArray(s.driverContributions)) ? "Array" : "Not array"
  });

  const passed = assertionResults.every((a) => a.passed);

  return {
    scenarioName: scenario.name,
    passed,
    scores,
    diagnostics,
    assertionResults
  };
}

export function runAllVerifications(): VerificationResult[] {
  return SCENARIOS.map(runVerificationScenario);
}

export function createMixedBullishBearishScenario(): VerificationScenario {
  return SCENARIOS[0];
}

export function createMissingDriversScenario(): VerificationScenario {
  return SCENARIOS[1];
}

export function createDisabledDriversScenario(): VerificationScenario {
  return SCENARIOS[2];
}

export function createWeightedCalculationsScenario(): VerificationScenario {
  return SCENARIOS[3];
}

export function createCategoryConfidenceScenario(): VerificationScenario {
  return SCENARIOS[4];
}

export function verifyScoreBounds(scores: CategoryScoreObject[]): boolean {
  return scores.every(
    (s) =>
      !isNaN(s.score) &&
      isFinite(s.score) &&
      s.confidence >= 0 &&
      s.confidence <= 100 &&
      s.alignmentScore >= 0 &&
      s.alignmentScore <= 1 &&
      s.weight >= 0
  );
}

export function verifyWeightConsistency(scores: CategoryScoreObject[], config?: WeightConfiguration): boolean {
  const resolved = resolveWeights(config);
  for (const score of scores) {
    const resolvedCat = resolved.categories.find((c) => c.categoryId === score.categoryId);
    if (resolvedCat && Math.abs(resolvedCat.weight - score.weight) > 0.001) {
      return false;
    }
  }
  return true;
}

export function verifyDriverContributions(scores: CategoryScoreObject[]): boolean {
  for (const score of scores) {
    for (const contribution of score.driverContributions) {
      if (contribution.weight < 0) return false;
      if (contribution.contribution !== contribution.contribution) return false;
    }
  }
  return true;
}

export function getVerificationSummary(results: VerificationResult[]): string {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  const lines: string[] = [
    `Verification Summary: ${passed}/${total} scenarios passed`,
    ""
  ];

  for (const result of results) {
    const status = result.passed ? "PASS" : "FAIL";
    lines.push(`  [${status}] ${result.scenarioName}`);
    lines.push(`    ${result.scores.filter((s) => s.driverCount > 0).length} categories scored`);
    for (const diag of result.diagnostics) {
      lines.push(`    ${diag}`);
    }
    const failedAssertions = result.assertionResults.filter((a) => !a.passed);
    if (failedAssertions.length > 0) {
      for (const assertion of failedAssertions) {
        lines.push(`    FAILED: ${assertion.description} (expected: ${assertion.expected}, actual: ${assertion.actual})`);
      }
    }
    lines.push("");
  }

  if (failed > 0) {
    lines.push(`${failed} scenario(s) failed.`);
  } else {
    lines.push("All scenarios passed successfully.");
  }

  return lines.join("\n");
}
