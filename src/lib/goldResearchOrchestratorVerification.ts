import type {
  GoldResearchAnalysisInput,
  GoldResearchAnalysis
} from "@/types/goldResearchAnalysis";
import type { DriverAnalysisObject } from "@/types/goldResearchConfig";
import type { TechnicalInput } from "@/types/technicalBias";
import type { InstitutionalFlowInput } from "@/types/institutionalFlow";
import { orchestrateGoldResearch } from "./goldResearchOrchestrator";

interface VerificationScenario {
  name: string;
  description: string;
  input: GoldResearchAnalysisInput;
  validate: (analysis: GoldResearchAnalysis) => {
    passed: boolean;
    message: string;
    details: string[];
  };
}

function makeDriverAnalyses(overrides: Partial<DriverAnalysisObject>[] = []): DriverAnalysisObject[] {
  const base: DriverAnalysisObject = {
    driverId: "gold-price-action",
    driverTitle: "Gold Price Action",
    categoryId: "macro",
    bias: "Bullish",
    biasReason: "Price trending up.",
    strength: "Moderate",
    strengthFactors: ["Higher highs", "Higher lows"],
    confidence: 70,
    confidenceReason: "Clear trend.",
    technicalObservation: "Price above key MAs.",
    supportingDrivers: [],
    conflictingDrivers: [],
    reason: "Bullish trend.",
    aiExplanation: "Gold is trending bullish.",
    source: "manual",
    sourceUrl: "",
    timestamp: new Date().toISOString(),
    weight: 1.0,
    contribution: 0.7,
    dataFields: {}
  };

  return overrides.length > 0
    ? overrides.map(o => ({ ...base, ...o }))
    : [base];
}

function makeTechnicalInput(overrides: Partial<TechnicalInput> = {}): TechnicalInput {
  return {
    timeframe: "H4",
    currentPrice: 2400,
    trend: {
      direction: "Bullish",
      strength: "Moderate"
    },
    momentum: {
      rsi: 60,
      rsiInterpretation: "Neutral"
    },
    ...overrides
  };
}

function makeInstitutionalInput(overrides: Partial<InstitutionalFlowInput> = {}): InstitutionalFlowInput {
  return {
    etfFlows: {
      direction: "Inflow",
      magnitude: "Moderate"
    },
    centralBank: {
      netPurchases: 200,
      buyingVolume: "Moderate"
    },
    ...overrides
  };
}

const SCENARIOS: VerificationScenario[] = [
  {
    name: "complete-data",
    description: "Complete data — all engines receive full inputs, pipeline succeeds",
    input: {
      driverAnalyses: makeDriverAnalyses([
        { driverId: "gold-price-action", bias: "Bullish", confidence: 75 },
        { driverId: "dxy-trend", bias: "Bearish", confidence: 70 },
        { driverId: "us-yields", bias: "Bearish", confidence: 65 }
      ]),
      technicalInput: makeTechnicalInput(),
      institutionalInput: makeInstitutionalInput(),
      currentPrice: 2400
    },
    validate: (analysis) => {
      const details: string[] = [];
      let passed = true;

      if (analysis.pipelineStatus !== "success") {
        passed = false;
        details.push(`Pipeline status expected "success", got "${analysis.pipelineStatus}".`);
      }

      if (analysis.diagnostics.engines.length < 3) {
        passed = false;
        details.push(`Expected 3+ engine diagnostics, got ${analysis.diagnostics.engines.length}.`);
      }

      const allSucceeded = analysis.diagnostics.engines.every(e => e.status === "success");
      if (!allSucceeded) {
        passed = false;
        details.push("Not all engines succeeded.");
      }

      if (analysis.executionTimeMs <= 0) {
        passed = false;
        details.push(`Execution time should be positive, got ${analysis.executionTimeMs}.`);
      }

      if (!analysis.schemaVersion) {
        passed = false;
        details.push("Schema version missing.");
      }

      return {
        passed,
        message: passed
          ? `PASS: Complete data pipeline succeeded (${analysis.executionTimeMs}ms, ${analysis.diagnostics.engines.length} engines).`
          : `FAIL: Complete data scenario failed.`,
        details
      };
    }
  },
  {
    name: "partial-data",
    description: "Partial data — only driver analyses and technical input, no institutional data",
    input: {
      driverAnalyses: makeDriverAnalyses([
        { driverId: "gold-price-action", bias: "Bullish", confidence: 65 }
      ]),
      technicalInput: makeTechnicalInput(),
      institutionalInput: undefined
    },
    validate: (analysis) => {
      const details: string[] = [];
      let passed = true;

      if (analysis.pipelineStatus !== "partial") {
        details.push(`Pipeline status "${analysis.pipelineStatus}" — expected "partial" for missing institutional data.`);
      }

      const instEngine = analysis.diagnostics.engines.find(e => e.engine === "InstitutionalFlowEngine");
      if (instEngine && instEngine.status !== "not-provided") {
        passed = false;
        details.push(`Institutional engine should be "not-provided", got "${instEngine.status}".`);
      }

      const catEngine = analysis.diagnostics.engines.find(e => e.engine === "CategoryScoreEngine");
      if (catEngine && catEngine.status !== "success") {
        passed = false;
        details.push("Category engine should succeed with driver data.");
      }

      return {
        passed,
        message: passed
          ? `PASS: Partial data handled correctly (status: ${analysis.pipelineStatus}).`
          : `FAIL: Partial data scenario failed.`,
        details
      };
    }
  },
  {
    name: "missing-technical-data",
    description: "Missing technical data — only category scores and institutional flow",
    input: {
      driverAnalyses: makeDriverAnalyses([
        { driverId: "gold-price-action", bias: "Bullish", confidence: 60 }
      ]),
      technicalInput: undefined,
      institutionalInput: makeInstitutionalInput()
    },
    validate: (analysis) => {
      const details: string[] = [];
      let passed = true;

      const techEngine = analysis.diagnostics.engines.find(e => e.engine === "TechnicalBiasEngine");
      if (techEngine && techEngine.status !== "not-provided") {
        passed = false;
        details.push(`Technical engine should be "not-provided", got "${techEngine.status}".`);
      }

      const decisionEngine = analysis.diagnostics.engines.find(e => e.engine === "DecisionEngine");
      if (decisionEngine && decisionEngine.status !== "not-provided") {
        details.push(`Decision engine status: "${decisionEngine.status}" — may not run without all inputs.`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Missing technical data handled correctly.`
          : `FAIL: Missing technical data scenario failed.`,
        details
      };
    }
  },
  {
    name: "missing-institutional-data",
    description: "Missing institutional data — only category scores and technical input",
    input: {
      driverAnalyses: makeDriverAnalyses([
        { driverId: "gold-price-action", bias: "Bullish", confidence: 60 }
      ]),
      technicalInput: makeTechnicalInput(),
      institutionalInput: undefined
    },
    validate: (analysis) => {
      const details: string[] = [];
      let passed = true;

      const instEngine = analysis.diagnostics.engines.find(e => e.engine === "InstitutionalFlowEngine");
      if (instEngine && instEngine.status !== "not-provided") {
        passed = false;
        details.push(`Institutional engine should be "not-provided", got "${instEngine.status}".`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Missing institutional data handled correctly.`
          : `FAIL: Missing institutional data scenario failed.`,
        details
      };
    }
  },
  {
    name: "conflicting-data",
    description: "Conflicting data — bullish categories vs bearish technicals, extreme crowding",
    input: {
      driverAnalyses: makeDriverAnalyses([
        { driverId: "gold-price-action", bias: "Strong Bullish", confidence: 80 },
        { driverId: "dxy-trend", bias: "Bearish", confidence: 75 }
      ]),
      technicalInput: makeTechnicalInput({
        trend: { direction: "Bearish", strength: "Moderate" },
        momentum: { rsi: 35, rsiInterpretation: "Oversold" }
      }),
      institutionalInput: makeInstitutionalInput({
        etfFlows: { direction: "Outflow", magnitude: "Heavy" },
        crowdPositioning: {
          crowdingLevel: "Extreme",
          crowdedTradeRisk: "Extreme"
        },
        positionRisk: { level: "Extreme" }
      })
    },
    validate: (analysis) => {
      const details: string[] = [];
      let passed = true;

      if (analysis.decision.decision !== "Wait") {
        details.push(`Decision "${analysis.decision.decision}" — expected "Wait" for high conflict.`);
      }

      if (analysis.decision.conflictScore < 20) {
        details.push(`Conflict score ${analysis.decision.conflictScore}% seems low for conflicting data.`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Conflicting data handled correctly (decision: ${analysis.decision.decision}, conflict: ${analysis.decision.conflictScore}%).`
          : `FAIL: Conflicting data scenario failed.`,
        details
      };
    }
  },
  {
    name: "engine-failure-simulation",
    description: "Engine failure simulation — skip category scoring to simulate failure path",
    input: {
      driverAnalyses: makeDriverAnalyses([
        { driverId: "gold-price-action", bias: "Bullish", confidence: 60 }
      ]),
      technicalInput: makeTechnicalInput(),
      institutionalInput: makeInstitutionalInput(),
      options: {
        skipCategoryScoring: true,
        continueOnEngineFailure: true
      }
    },
    validate: (analysis) => {
      const details: string[] = [];
      let passed = true;

      const catEngine = analysis.diagnostics.engines.find(e => e.engine === "CategoryScoreEngine");
      if (catEngine && catEngine.status !== "skipped") {
        passed = false;
        details.push(`Category engine should be "skipped", got "${catEngine.status}".`);
      }

      if (analysis.pipelineStatus === "failed") {
        passed = false;
        details.push("Pipeline should not fail when continueOnEngineFailure is true.");
      }

      return {
        passed,
        message: passed
          ? `PASS: Engine failure simulation handled (status: ${analysis.pipelineStatus}).`
          : `FAIL: Engine failure simulation failed.`,
        details
      };
    }
  },
  {
    name: "large-driver-set",
    description: "Large driver set — 15 drivers across multiple categories",
    input: {
      driverAnalyses: makeDriverAnalyses([
        { driverId: "gold-price-action", bias: "Bullish", confidence: 70, categoryId: "macro" },
        { driverId: "dxy-trend", bias: "Bearish", confidence: 65, categoryId: "macro" },
        { driverId: "us-yields", bias: "Bearish", confidence: 60, categoryId: "macro" },
        { driverId: "real-yields", bias: "Bearish", confidence: 55, categoryId: "macro" },
        { driverId: "fed-tone", bias: "Neutral", confidence: 50, categoryId: "macro" },
        { driverId: "cpi-pce", bias: "Neutral", confidence: 45, categoryId: "macro" },
        { driverId: "jobs-data", bias: "Neutral", confidence: 40, categoryId: "macro" },
        { driverId: "geopolitics", bias: "Bullish", confidence: 75, categoryId: "sentiment" },
        { driverId: "etf-central-bank", bias: "Bullish", confidence: 70, categoryId: "sentiment" },
        { driverId: "gold-price-action", bias: "Bullish", confidence: 80, categoryId: "technical" },
        { driverId: "dxy-trend", bias: "Bearish", confidence: 60, categoryId: "technical" },
        { driverId: "us-yields", bias: "Bearish", confidence: 55, categoryId: "technical" },
        { driverId: "real-yields", bias: "Bearish", confidence: 50, categoryId: "institutional" },
        { driverId: "fed-tone", bias: "Bullish", confidence: 65, categoryId: "institutional" },
        { driverId: "cpi-pce", bias: "Neutral", confidence: 40, categoryId: "institutional" }
      ]),
      technicalInput: makeTechnicalInput(),
      institutionalInput: makeInstitutionalInput(),
      currentPrice: 2400
    },
    validate: (analysis) => {
      const details: string[] = [];
      let passed = true;

      if (analysis.driverAnalyses.length < 10) {
        passed = false;
        details.push(`Expected 10+ driver analyses, got ${analysis.driverAnalyses.length}.`);
      }

      if (analysis.executionTimeMs <= 0) {
        passed = false;
        details.push(`Execution time should be positive.`);
      }

      if (!analysis.categoryScores || analysis.categoryScores.scores.length === 0) {
        passed = false;
        details.push("Category scores should have results.");
      }

      return {
        passed,
        message: passed
          ? `PASS: Large driver set handled (${analysis.driverAnalyses.length} drivers, ${analysis.executionTimeMs}ms).`
          : `FAIL: Large driver set scenario failed.`,
        details
      };
    }
  },
  {
    name: "future-custom-driver-set",
    description: "Future custom driver set — custom driver IDs not in registry, should not crash",
    input: {
      driverAnalyses: makeDriverAnalyses([
        { driverId: "custom-future-driver-1", driverTitle: "Custom Future Driver 1", bias: "Bullish", confidence: 60, categoryId: "macro" },
        { driverId: "custom-future-driver-2", driverTitle: "Custom Future Driver 2", bias: "Bearish", confidence: 55, categoryId: "sentiment" },
        { driverId: "gold-price-action", bias: "Bullish", confidence: 70 }
      ]),
      technicalInput: makeTechnicalInput(),
      institutionalInput: makeInstitutionalInput()
    },
    validate: (analysis) => {
      const details: string[] = [];
      let passed = true;

      if (analysis.pipelineStatus === "failed") {
        passed = false;
        details.push(`Pipeline should not fail with custom drivers, got "${analysis.pipelineStatus}".`);
      }

      if (analysis.diagnostics.errors.length > 0) {
        details.push(`Errors: ${analysis.diagnostics.errors.join("; ")}`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Custom driver set handled gracefully (status: ${analysis.pipelineStatus}).`
          : `FAIL: Custom driver set scenario failed.`,
        details
      };
    }
  }
];

export function runOrchestratorVerification(): {
  passed: number;
  failed: number;
  results: Array<{ name: string; passed: boolean; message: string; details: string[] }>;
} {
  const results: Array<{ name: string; passed: boolean; message: string; details: string[] }> = [];
  let passed = 0;
  let failed = 0;

  for (const scenario of SCENARIOS) {
    const analysis = orchestrateGoldResearch(scenario.input);
    const verification = scenario.validate(analysis);

    results.push({
      name: scenario.name,
      passed: verification.passed,
      message: verification.message,
      details: verification.details
    });

    if (verification.passed) {
      passed++;
    } else {
      failed++;
    }
  }

  return { passed, failed, results };
}

export function logVerificationReport(): void {
  const report = runOrchestratorVerification();

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     GOLD RESEARCH ORCHESTRATOR — VERIFICATION REPORT       ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Total: ${report.passed + report.failed}  |  Passed: ${report.passed}  |  Failed: ${report.failed}                  ║`);
  console.log("╠══════════════════════════════════════════════════════════════╣");

  for (const r of report.results) {
    const icon = r.passed ? "PASS" : "FAIL";
    console.log(`║  [${icon}] ${r.name}`);
    console.log(`║     ${r.message}`);
    for (const d of r.details) {
      console.log(`║       → ${d}`);
    }
  }

  console.log("╚══════════════════════════════════════════════════════════════╝");
}

export { SCENARIOS };
export type { VerificationScenario };
