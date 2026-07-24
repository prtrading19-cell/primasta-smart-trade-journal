import type { DecisionEngineInput, DecisionEngineResult } from "@/types/decisionEngine";
import type { CategoryScoreBatchResult } from "@/lib/categoryScoreEngine";
import type { TechnicalBiasResult } from "@/types/technicalBias";
import type { InstitutionalFlowResult } from "@/types/institutionalFlow";
import { calculateDecision } from "./decisionEngine";

interface VerificationScenario {
  name: string;
  description: string;
  input: DecisionEngineInput;
  validate: (result: DecisionEngineResult) => {
    passed: boolean;
    message: string;
    details: string[];
  };
}

function makeCategoryScores(overrides: Partial<CategoryScoreBatchResult> = {}): CategoryScoreBatchResult {
  return {
    scores: [],
    totalScore: 70,
    overallBias: "Bullish",
    overallConfidence: 70,
    driverAlignment: 80,
    alignmentStrength: "Strong",
    hasConflict: false,
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

function makeTechnicalBias(overrides: Partial<TechnicalBiasResult> = {}): TechnicalBiasResult {
  return {
    technicalBias: "Bullish",
    technicalScore: 70,
    confidence: 70,
    strength: "Moderate",
    supportingFactors: [],
    conflictingFactors: [],
    summary: "Technical analysis bullish.",
    timestamp: new Date().toISOString(),
    dataQuality: {
      score: 80,
      completeness: 0.8,
      hasTrend: true,
      hasMomentum: true,
      hasStructure: true,
      hasVolatility: true,
      hasMovingAverages: true,
      missingFields: []
    },
    factors: [],
    timeframe: "H4",
    marketStructure: "Bullish BOS",
    setupPresent: true,
    setupType: "BOS",
    riskLevel: "Moderate",
    ...overrides
  };
}

function makeInstitutionalFlow(overrides: Partial<InstitutionalFlowResult> = {}): InstitutionalFlowResult {
  return {
    institutionalBias: "Bullish",
    institutionalScore: 70,
    confidence: 70,
    strength: "Moderate",
    supportingFactors: [],
    conflictingFactors: [],
    concentrationRisks: [],
    summary: "Institutional flow bullish.",
    timestamp: new Date().toISOString(),
    dataQuality: {
      score: 70,
      completeness: 0.7,
      hasEtfFlows: true,
      hasCentralBank: true,
      hasCotPositioning: false,
      hasOpenInterest: false,
      hasCrowdPositioning: false,
      hasPositionRisk: false,
      availableDrivers: ["ETF Flows", "Central Bank"],
      missingDrivers: ["COT", "OI", "Crowd", "Risk"],
      freshness: "Unknown"
    },
    factors: [],
    ...overrides
  };
}

const SCENARIOS: VerificationScenario[] = [
  {
    name: "strong-buy",
    description: "Strong Buy — all sources strongly bullish, high confidence, low conflict",
    input: {
      categoryScores: makeCategoryScores({
        totalScore: 80,
        overallBias: "Strong Bullish",
        overallConfidence: 80,
        driverAlignment: 90,
        hasConflict: false
      }),
      technicalBias: makeTechnicalBias({
        technicalScore: 80,
        technicalBias: "Strong Bullish",
        confidence: 80,
        strength: "Strong",
        setupPresent: true,
        conflictingFactors: []
      }),
      institutionalFlow: makeInstitutionalFlow({
        institutionalScore: 80,
        institutionalBias: "Strong Bullish",
        confidence: 80,
        strength: "Strong",
        conflictingFactors: [],
        concentrationRisks: []
      })
    },
    validate: (result) => {
      const details: string[] = [];
      let passed = true;

      if (result.decision !== "Strong Buy" && result.decision !== "Buy") {
        passed = false;
        details.push(`Expected Strong Buy or Buy, got "${result.decision}".`);
      }

      if (result.overallGoldScore < 65) {
        passed = false;
        details.push(`Score ${result.overallGoldScore}% too low for strong buy scenario.`);
      }

      if (!result.overallBias.includes("Bullish")) {
        passed = false;
        details.push(`Expected bullish bias, got "${result.overallBias}".`);
      }

      if (result.overallConfidence < 55) {
        details.push(`Confidence ${result.overallConfidence}% may be low for this scenario.`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Strong Buy correctly identified (score ${result.overallGoldScore}%, decision ${result.decision}, confidence ${result.overallConfidence}%).`
          : `FAIL: Strong Buy scenario failed.`,
        details
      };
    }
  },
  {
    name: "buy",
    description: "Buy — moderately bullish across sources, good confidence",
    input: {
      categoryScores: makeCategoryScores({
        totalScore: 65,
        overallBias: "Bullish",
        overallConfidence: 65,
        driverAlignment: 70,
        hasConflict: false
      }),
      technicalBias: makeTechnicalBias({
        technicalScore: 65,
        technicalBias: "Bullish",
        confidence: 65,
        strength: "Moderate",
        setupPresent: false,
        conflictingFactors: []
      }),
      institutionalFlow: makeInstitutionalFlow({
        institutionalScore: 60,
        institutionalBias: "Bullish",
        confidence: 60,
        strength: "Moderate",
        conflictingFactors: [],
        concentrationRisks: []
      })
    },
    validate: (result) => {
      const details: string[] = [];
      let passed = true;

      if (result.decision !== "Buy" && result.decision !== "Wait") {
        passed = false;
        details.push(`Expected Buy or Wait, got "${result.decision}".`);
      }

      if (result.overallGoldScore < 50 || result.overallGoldScore > 75) {
        passed = false;
        details.push(`Score ${result.overallGoldScore}% unexpected for buy scenario.`);
      }

      if (!result.overallBias.includes("Bullish") && result.overallBias !== "Neutral") {
        passed = false;
        details.push(`Expected bullish or neutral bias, got "${result.overallBias}".`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Buy correctly identified (score ${result.overallGoldScore}%, decision ${result.decision}).`
          : `FAIL: Buy scenario failed.`,
        details
      };
    }
  },
  {
    name: "wait",
    description: "Wait — neutral signals across all sources, moderate confidence",
    input: {
      categoryScores: makeCategoryScores({
        totalScore: 50,
        overallBias: "Neutral",
        overallConfidence: 55,
        driverAlignment: 50,
        hasConflict: false
      }),
      technicalBias: makeTechnicalBias({
        technicalScore: 50,
        technicalBias: "Neutral",
        confidence: 55,
        strength: "Weak",
        setupPresent: false,
        conflictingFactors: []
      }),
      institutionalFlow: makeInstitutionalFlow({
        institutionalScore: 50,
        institutionalBias: "Neutral",
        confidence: 55,
        strength: "Weak",
        conflictingFactors: [],
        concentrationRisks: []
      })
    },
    validate: (result) => {
      const details: string[] = [];
      let passed = true;

      if (result.decision !== "Wait") {
        passed = false;
        details.push(`Expected Wait, got "${result.decision}".`);
      }

      if (result.overallGoldScore < 40 || result.overallGoldScore > 60) {
        details.push(`Score ${result.overallGoldScore}% outside expected range for wait.`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Wait correctly identified (score ${result.overallGoldScore}%, decision ${result.decision}).`
          : `FAIL: Wait scenario failed.`,
        details
      };
    }
  },
  {
    name: "sell",
    description: "Sell — bearish signals across sources, moderate confidence",
    input: {
      categoryScores: makeCategoryScores({
        totalScore: 35,
        overallBias: "Bearish",
        overallConfidence: 65,
        driverAlignment: 70,
        hasConflict: false
      }),
      technicalBias: makeTechnicalBias({
        technicalScore: 35,
        technicalBias: "Bearish",
        confidence: 65,
        strength: "Moderate",
        setupPresent: false,
        conflictingFactors: []
      }),
      institutionalFlow: makeInstitutionalFlow({
        institutionalScore: 40,
        institutionalBias: "Bearish",
        confidence: 60,
        strength: "Moderate",
        conflictingFactors: [],
        concentrationRisks: []
      })
    },
    validate: (result) => {
      const details: string[] = [];
      let passed = true;

      if (result.decision !== "Sell" && result.decision !== "Wait") {
        passed = false;
        details.push(`Expected Sell or Wait, got "${result.decision}".`);
      }

      if (result.overallGoldScore > 55) {
        passed = false;
        details.push(`Score ${result.overallGoldScore}% too high for sell scenario.`);
      }

      if (!result.overallBias.includes("Bearish") && result.overallBias !== "Neutral") {
        passed = false;
        details.push(`Expected bearish or neutral bias, got "${result.overallBias}".`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Sell correctly identified (score ${result.overallGoldScore}%, decision ${result.decision}).`
          : `FAIL: Sell scenario failed.`,
        details
      };
    }
  },
  {
    name: "strong-sell",
    description: "Strong Sell — all sources strongly bearish, high confidence, low conflict",
    input: {
      categoryScores: makeCategoryScores({
        totalScore: 20,
        overallBias: "Strong Bearish",
        overallConfidence: 80,
        driverAlignment: 90,
        hasConflict: false
      }),
      technicalBias: makeTechnicalBias({
        technicalScore: 20,
        technicalBias: "Strong Bearish",
        confidence: 80,
        strength: "Strong",
        setupPresent: false,
        conflictingFactors: []
      }),
      institutionalFlow: makeInstitutionalFlow({
        institutionalScore: 20,
        institutionalBias: "Strong Bearish",
        confidence: 80,
        strength: "Strong",
        conflictingFactors: [],
        concentrationRisks: []
      })
    },
    validate: (result) => {
      const details: string[] = [];
      let passed = true;

      if (result.decision !== "Strong Sell" && result.decision !== "Sell") {
        passed = false;
        details.push(`Expected Strong Sell or Sell, got "${result.decision}".`);
      }

      if (result.overallGoldScore > 35) {
        passed = false;
        details.push(`Score ${result.overallGoldScore}% too high for strong sell scenario.`);
      }

      if (!result.overallBias.includes("Bearish")) {
        passed = false;
        details.push(`Expected bearish bias, got "${result.overallBias}".`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Strong Sell correctly identified (score ${result.overallGoldScore}%, decision ${result.decision}).`
          : `FAIL: Strong Sell scenario failed.`,
        details
      };
    }
  },
  {
    name: "high-conflict",
    description: "High Conflict — bullish categories vs bearish technicals, extreme crowding risk",
    input: {
      categoryScores: makeCategoryScores({
        totalScore: 70,
        overallBias: "Bullish",
        overallConfidence: 65,
        driverAlignment: 50,
        hasConflict: true
      }),
      technicalBias: makeTechnicalBias({
        technicalScore: 30,
        technicalBias: "Bearish",
        confidence: 70,
        strength: "Moderate",
        setupPresent: false,
        conflictingFactors: ["RSI overbought", "Bearish structure"]
      }),
      institutionalFlow: makeInstitutionalFlow({
        institutionalScore: 30,
        institutionalBias: "Bearish",
        confidence: 70,
        strength: "Moderate",
        conflictingFactors: ["Extreme crowding", "High position risk"],
        concentrationRisks: [
          {
            detected: true,
            type: "Extreme Crowding",
            severity: "Extreme",
            description: "Extreme crowding detected.",
            recommendation: "Wait for normalization."
          }
        ]
      })
    },
    validate: (result) => {
      const details: string[] = [];
      let passed = true;

      if (result.decision !== "Wait") {
        passed = false;
        details.push(`Expected Wait due to high conflict, got "${result.decision}".`);
      }

      if (result.conflictScore < 30) {
        details.push(`Conflict score ${result.conflictScore}% may be too low for high conflict scenario.`);
      }

      if (result.riskRating === "Low") {
        details.push(`Risk rating should not be Low with extreme concentration risk.`);
      }

      return {
        passed,
        message: passed
          ? `PASS: High conflict correctly handled (conflict ${result.conflictScore}%, decision ${result.decision}, risk ${result.riskRating}).`
          : `FAIL: High conflict scenario failed.`,
        details
      };
    }
  },
  {
    name: "low-confidence",
    description: "Low Confidence — very limited data, should default to Wait",
    input: {
      categoryScores: makeCategoryScores({
        totalScore: 65,
        overallBias: "Bullish",
        overallConfidence: 20,
        driverAlignment: 40,
        hasConflict: false
      }),
      technicalBias: makeTechnicalBias({
        technicalScore: 60,
        technicalBias: "Bullish",
        confidence: 25,
        strength: "Weak",
        setupPresent: false,
        conflictingFactors: [],
        dataQuality: {
          score: 30,
          completeness: 0.3,
          hasTrend: false,
          hasMomentum: false,
          hasStructure: false,
          hasVolatility: false,
          hasMovingAverages: false,
          missingFields: ["trend", "momentum", "structure"]
        }
      }),
      institutionalFlow: makeInstitutionalFlow({
        institutionalScore: 55,
        institutionalBias: "Bullish",
        confidence: 20,
        strength: "Weak",
        conflictingFactors: [],
        concentrationRisks: [],
        dataQuality: {
          score: 20,
          completeness: 0.2,
          hasEtfFlows: false,
          hasCentralBank: false,
          hasCotPositioning: false,
          hasOpenInterest: false,
          hasCrowdPositioning: false,
          hasPositionRisk: false,
          availableDrivers: [],
          missingDrivers: ["ETF", "CB", "COT", "OI", "Crowd", "Risk"],
          freshness: "Unknown"
        }
      })
    },
    validate: (result) => {
      const details: string[] = [];
      let passed = true;

      if (result.decision !== "Wait") {
        passed = false;
        details.push(`Expected Wait due to low confidence, got "${result.decision}".`);
      }

      if (result.overallConfidence > 40) {
        details.push(`Overall confidence ${result.overallConfidence}% may be inflated for limited data.`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Low confidence correctly handled (confidence ${result.overallConfidence}%, decision ${result.decision}).`
          : `FAIL: Low confidence scenario failed.`,
        details
      };
    }
  },
  {
    name: "missing-inputs",
    description: "Missing Inputs — only category scores provided, no technical or institutional data",
    input: {
      categoryScores: makeCategoryScores({
        totalScore: 60,
        overallBias: "Bullish",
        overallConfidence: 60,
        driverAlignment: 70,
        hasConflict: false
      }),
      technicalBias: makeTechnicalBias({
        technicalScore: 50,
        technicalBias: "Neutral",
        confidence: 0,
        strength: "None",
        setupPresent: false,
        conflictingFactors: [],
        factors: [],
        dataQuality: {
          score: 0,
          completeness: 0,
          hasTrend: false,
          hasMomentum: false,
          hasStructure: false,
          hasVolatility: false,
          hasMovingAverages: false,
          missingFields: ["all"]
        }
      }),
      institutionalFlow: makeInstitutionalFlow({
        institutionalScore: 50,
        institutionalBias: "Neutral",
        confidence: 0,
        strength: "None",
        conflictingFactors: [],
        concentrationRisks: [],
        factors: [],
        dataQuality: {
          score: 0,
          completeness: 0,
          hasEtfFlows: false,
          hasCentralBank: false,
          hasCotPositioning: false,
          hasOpenInterest: false,
          hasCrowdPositioning: false,
          hasPositionRisk: false,
          availableDrivers: [],
          missingDrivers: ["all"],
          freshness: "Unknown"
        }
      })
    },
    validate: (result) => {
      const details: string[] = [];
      let passed = true;

      if (result.decision !== "Wait") {
        passed = false;
        details.push(`Expected Wait with missing inputs, got "${result.decision}".`);
      }

      if (result.overallConfidence > 40) {
        details.push(`Overall confidence ${result.overallConfidence}% too high for missing inputs.`);
      }

      if (result.decisionQuality === "High") {
        passed = false;
        details.push(`Decision quality should not be High with missing inputs.`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Missing inputs correctly handled (confidence ${result.overallConfidence}%, quality ${result.decisionQuality}, decision ${result.decision}).`
          : `FAIL: Missing inputs scenario failed.`,
        details
      };
    }
  }
];

export function runDecisionEngineVerification(): {
  passed: number;
  failed: number;
  results: Array<{ name: string; passed: boolean; message: string; details: string[] }>;
} {
  const results: Array<{ name: string; passed: boolean; message: string; details: string[] }> = [];
  let passed = 0;
  let failed = 0;

  for (const scenario of SCENARIOS) {
    const result = calculateDecision(scenario.input);
    const verification = scenario.validate(result);

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
  const report = runDecisionEngineVerification();

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     GOLD DECISION ENGINE — VERIFICATION REPORT             ║");
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
