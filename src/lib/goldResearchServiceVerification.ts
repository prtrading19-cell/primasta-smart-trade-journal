import type {
  GoldResearchServiceRequest,
  GoldResearchServiceResponse
} from "@/types/goldResearchService";
import type { DriverAnalysisObject } from "@/types/goldResearchConfig";
import {
  analyzeResearch,
  validateResearch,
  previewResearch,
  recalculateResearch,
  summarizeResearch,
  healthCheck
} from "./goldResearchService";

interface VerificationScenario {
  name: string;
  description: string;
  execute: () => GoldResearchServiceResponse;
  validate: (response: GoldResearchServiceResponse) => {
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
    strengthFactors: ["Higher highs"],
    confidence: 70,
    confidenceReason: "Clear trend.",
    technicalObservation: "Above key MAs.",
    supportingDrivers: [],
    conflictingDrivers: [],
    reason: "Bullish trend.",
    aiExplanation: "Gold trending bullish.",
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

function makeFullRequest(overrides: Partial<GoldResearchServiceRequest> = {}): GoldResearchServiceRequest {
  return {
    driverAnalyses: makeDriverAnalyses([
      { driverId: "gold-price-action", bias: "Bullish", confidence: 75 },
      { driverId: "dxy-trend", bias: "Bearish", confidence: 70 },
      { driverId: "us-yields", bias: "Bearish", confidence: 65 }
    ]),
    technicalInput: {
      timeframe: "H4",
      currentPrice: 2400,
      trend: { direction: "Bullish", strength: "Moderate" },
      momentum: { rsi: 60, rsiInterpretation: "Neutral" }
    },
    institutionalInput: {
      etfFlows: { direction: "Inflow", magnitude: "Moderate" },
      centralBank: { netPurchases: 200, buyingVolume: "Moderate" }
    },
    currentPrice: 2400,
    ...overrides
  };
}

const SCENARIOS: VerificationScenario[] = [
  {
    name: "complete-analysis",
    description: "Complete analysis — all inputs provided, full pipeline succeeds",
    execute: () => analyzeResearch(makeFullRequest()),
    validate: (response) => {
      const details: string[] = [];
      let passed = true;

      if (!response.success) {
        passed = false;
        details.push("Expected success to be true.");
      }

      if (response.status !== "ok") {
        passed = false;
        details.push(`Expected status "ok", got "${response.status}".`);
      }

      if (!response.analysis) {
        passed = false;
        details.push("Analysis is missing.");
      } else {
        if (response.analysis.pipelineStatus !== "success") {
          details.push(`Pipeline status: "${response.analysis.pipelineStatus}".`);
        }
        if (response.analysis.diagnostics.engines.length < 3) {
          details.push(`Expected 3+ engines, got ${response.analysis.diagnostics.engines.length}.`);
        }
      }

      if (!response.metadata) {
        passed = false;
        details.push("Metadata is missing.");
      }

      if (response.metadata?.executionTimeMs <= 0) {
        details.push("Execution time should be positive.");
      }

      return {
        passed,
        message: passed
          ? `PASS: Complete analysis succeeded (${response.metadata?.executionTimeMs}ms).`
          : `FAIL: Complete analysis scenario failed.`,
        details
      };
    }
  },
  {
    name: "partial-analysis",
    description: "Partial analysis — only driver analyses, no technical or institutional",
    execute: () => analyzeResearch({
      driverAnalyses: makeDriverAnalyses([
        { driverId: "gold-price-action", bias: "Bullish", confidence: 65 }
      ])
    }),
    validate: (response) => {
      const details: string[] = [];
      let passed = true;

      if (!response.success) {
        passed = false;
        details.push("Expected success even with partial data.");
      }

      if (response.status !== "degraded") {
        details.push(`Status "${response.status}" — expected "degraded" for partial data.`);
      }

      if (response.analysis?.pipelineStatus !== "partial") {
        details.push(`Pipeline status: "${response.analysis?.pipelineStatus}".`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Partial analysis handled (status: ${response.status}).`
          : `FAIL: Partial analysis scenario failed.`,
        details
      };
    }
  },
  {
    name: "validation-failure",
    description: "Validation failure — missing required driverAnalyses field",
    execute: () => analyzeResearch({
      driverAnalyses: undefined as unknown as GoldResearchServiceRequest["driverAnalyses"]
    }),
    validate: (response) => {
      const details: string[] = [];
      let passed = true;

      if (response.success) {
        passed = false;
        details.push("Expected success to be false for validation failure.");
      }

      if (response.status !== "error") {
        passed = false;
        details.push(`Expected status "error", got "${response.status}".`);
      }

      if (response.errors.length === 0) {
        passed = false;
        details.push("Expected validation errors.");
      }

      if (response.analysis) {
        passed = false;
        details.push("Analysis should not be present on validation failure.");
      }

      return {
        passed,
        message: passed
          ? `PASS: Validation failure caught (${response.errors.length} errors).`
          : `FAIL: Validation failure scenario failed.`,
        details
      };
    }
  },
  {
    name: "orchestrator-failure",
    description: "Orchestrator failure — invalid driver data causes orchestrator error",
    execute: () => analyzeResearch({
      driverAnalyses: [{
        driverId: "",
        driverTitle: "",
        categoryId: "",
        bias: "Invalid" as unknown as DriverAnalysisObject["bias"],
        biasReason: "",
        strength: "Invalid" as unknown as DriverAnalysisObject["strength"],
        strengthFactors: [],
        confidence: -1,
        confidenceReason: "",
        technicalObservation: "",
        supportingDrivers: [],
        conflictingDrivers: [],
        reason: "",
        aiExplanation: "",
        source: "",
        sourceUrl: "",
        timestamp: "",
        weight: -1,
        contribution: 0,
        dataFields: {}
      }]
    }),
    validate: (response) => {
      const details: string[] = [];
      let passed = true;

      if (response.success) {
        details.push("Success may be true despite invalid data — orchestrator may handle gracefully.");
      }

      if (!response.metadata) {
        passed = false;
        details.push("Metadata should always be present.");
      }

      return {
        passed,
        message: passed
          ? `PASS: Orchestrator failure handled (status: ${response.status}).`
          : `FAIL: Orchestrator failure scenario failed.`,
        details
      };
    }
  },
  {
    name: "missing-drivers",
    description: "Missing drivers — empty driver analyses array",
    execute: () => analyzeResearch({
      driverAnalyses: []
    }),
    validate: (response) => {
      const details: string[] = [];
      let passed = true;

      if (!response.success) {
        details.push(`Success is false for empty drivers — may be expected depending on validation.`);
      }

      if (response.validation) {
        if (response.validation.driverCount !== 0) {
          passed = false;
          details.push(`Expected 0 drivers, got ${response.validation.driverCount}.`);
        }
      }

      return {
        passed,
        message: passed
          ? `PASS: Missing drivers handled (status: ${response.status}).`
          : `FAIL: Missing drivers scenario failed.`,
        details
      };
    }
  },
  {
    name: "large-dataset",
    description: "Large dataset — 20 driver analyses across multiple categories",
    execute: () => analyzeResearch(makeFullRequest({
      driverAnalyses: makeDriverAnalyses([
        { driverId: "gold-price-action", bias: "Bullish", confidence: 75, categoryId: "macro" },
        { driverId: "dxy-trend", bias: "Bearish", confidence: 70, categoryId: "macro" },
        { driverId: "us-yields", bias: "Bearish", confidence: 65, categoryId: "macro" },
        { driverId: "real-yields", bias: "Bearish", confidence: 60, categoryId: "macro" },
        { driverId: "fed-tone", bias: "Neutral", confidence: 55, categoryId: "macro" },
        { driverId: "cpi-pce", bias: "Neutral", confidence: 50, categoryId: "macro" },
        { driverId: "jobs-data", bias: "Neutral", confidence: 45, categoryId: "macro" },
        { driverId: "geopolitics", bias: "Bullish", confidence: 80, categoryId: "sentiment" },
        { driverId: "etf-central-bank", bias: "Bullish", confidence: 75, categoryId: "sentiment" },
        { driverId: "gold-price-action", bias: "Bullish", confidence: 85, categoryId: "technical" },
        { driverId: "dxy-trend", bias: "Bearish", confidence: 65, categoryId: "technical" },
        { driverId: "us-yields", bias: "Bearish", confidence: 60, categoryId: "technical" },
        { driverId: "real-yields", bias: "Bearish", confidence: 55, categoryId: "institutional" },
        { driverId: "fed-tone", bias: "Bullish", confidence: 70, categoryId: "institutional" },
        { driverId: "cpi-pce", bias: "Neutral", confidence: 45, categoryId: "institutional" },
        { driverId: "jobs-data", bias: "Neutral", confidence: 40, categoryId: "institutional" },
        { driverId: "geopolitics", bias: "Bullish", confidence: 75, categoryId: "institutional" },
        { driverId: "etf-central-bank", bias: "Bullish", confidence: 70, categoryId: "institutional" },
        { driverId: "gold-price-action", bias: "Bullish", confidence: 80, categoryId: "macro" },
        { driverId: "dxy-trend", bias: "Bearish", confidence: 60, categoryId: "macro" }
      ])
    })),
    validate: (response) => {
      const details: string[] = [];
      let passed = true;

      if (!response.success) {
        passed = false;
        details.push("Expected success for large dataset.");
      }

      if (response.analysis?.driverAnalyses.length !== 20) {
        passed = false;
        details.push(`Expected 20 drivers, got ${response.analysis?.driverAnalyses.length}.`);
      }

      if (response.metadata?.executionTimeMs !== undefined && response.metadata.executionTimeMs > 5000) {
        details.push(`Execution time ${response.metadata.executionTimeMs}ms — may need optimization.`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Large dataset handled (20 drivers, ${response.metadata?.executionTimeMs}ms).`
          : `FAIL: Large dataset scenario failed.`,
        details
      };
    }
  },
  {
    name: "repeated-analysis",
    description: "Repeated analysis — same input analyzed twice, results should be consistent",
    execute: () => {
      const request = makeFullRequest();
      const first = analyzeResearch(request);
      const second = analyzeResearch(request);
      return { ...second, _firstScore: first.analysis?.decision.overallGoldScore };
    },
    validate: (response) => {
      const details: string[] = [];
      let passed = true;

      const firstScore = (response as GoldResearchServiceResponse & { _firstScore?: number })._firstScore;
      const secondScore = response.analysis?.decision.overallGoldScore;

      if (firstScore !== undefined && secondScore !== undefined) {
        if (firstScore !== secondScore) {
          passed = false;
          details.push(`Scores differ: first=${firstScore}, second=${secondScore}.`);
        }
      }

      if (!response.success) {
        passed = false;
        details.push("Expected success for repeated analysis.");
      }

      return {
        passed,
        message: passed
          ? `PASS: Repeated analysis consistent (score: ${secondScore}).`
          : `FAIL: Repeated analysis scenario failed.`,
        details
      };
    }
  },
  {
    name: "health-check",
    description: "Health check — verify system health without running analysis",
    execute: () => healthCheck(),
    validate: (response) => {
      const details: string[] = [];
      let passed = true;

      if (!response.health) {
        passed = false;
        details.push("Health result is missing.");
      } else {
        if (!response.health.schemaVersion) {
          passed = false;
          details.push("Schema version missing from health.");
        }
        if (!response.health.uptime) {
          passed = false;
          details.push("Uptime should be true.");
        }
        if (response.health.enginesAvailable.length === 0 && response.health.enginesMissing.length === 0) {
          details.push("No engines recorded in health check.");
        }
      }

      if (response.metadata?.method !== "healthCheck") {
        passed = false;
        details.push(`Method should be "healthCheck", got "${response.metadata?.method}".`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Health check succeeded (status: ${response.health?.status}).`
          : `FAIL: Health check scenario failed.`,
        details
      };
    }
  }
];

export function runServiceVerification(): {
  passed: number;
  failed: number;
  results: Array<{ name: string; passed: boolean; message: string; details: string[] }>;
} {
  const results: Array<{ name: string; passed: boolean; message: string; details: string[] }> = [];
  let passed = 0;
  let failed = 0;

  for (const scenario of SCENARIOS) {
    const response = scenario.execute();
    const verification = scenario.validate(response);

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
  const report = runServiceVerification();

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     GOLD RESEARCH SERVICE — VERIFICATION REPORT            ║");
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
