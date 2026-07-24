import type {
  TechnicalInput,
  TechnicalBiasResult
} from "@/types/technicalBias";
import { calculateTechnicalBias } from "./technicalBiasEngine";
import { validateTechnicalInput, validateTechnicalBiasResult } from "./technicalBiasValidators";

export interface VerificationScenario {
  name: string;
  description: string;
  input: TechnicalInput;
}

export interface VerificationResult {
  scenarioName: string;
  passed: boolean;
  result: TechnicalBiasResult;
  inputValidation: ReturnType<typeof validateTechnicalInput>;
  outputValidation: ReturnType<typeof validateTechnicalBiasResult>;
  assertionResults: AssertionResult[];
  diagnostics: string[];
}

export interface AssertionResult {
  description: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
}

export const SCENARIOS: VerificationScenario[] = [
  {
    name: "strong-bullish-trend",
    description: "Strong bullish trend with supporting momentum and structure",
    input: {
      timeframe: "H4",
      currentPrice: 2420,
      trend: {
        direction: "Bullish",
        strength: "Strong",
        duration: "3 weeks",
        description: "Clear uptrend with higher highs and higher lows"
      },
      momentum: {
        rsi: 62,
        rsiInterpretation: "Neutral",
        macd: "Bullish crossover",
        macdInterpretation: "Bullish"
      },
      movingAverages: {
        sma20: 2395,
        sma50: 2370,
        sma200: 2310,
        ema9: 2410,
        ema21: 2398,
        ema50: 2375,
        price: 2420,
        alignment: "Bullish"
      },
      structure: {
        supportLevels: ["2380", "2350", "2320"],
        resistanceLevels: ["2450", "2480"],
        marketStructure: "Bullish BOS",
        higherTimeframeStructure: "Bullish",
        dailyStructure: "Bullish",
        fourHourStructure: "Bullish",
        liquiditySweep: "No"
      },
      breakout: {
        status: "Breakout",
        level: "2400",
        confirmed: true,
        volumeConfirmation: true,
        retestPending: false
      },
      volatility: {
        level: "Moderate",
        atrValue: 18.5,
        description: "Normal volatility for Gold"
      },
      setup: {
        present: true,
        type: "BOS",
        grade: "A",
        entryZone: "2395-2405",
        invalidationLevel: "2370"
      }
    }
  },
  {
    name: "strong-bearish-trend",
    description: "Strong bearish trend with momentum confirmation",
    input: {
      timeframe: "D1",
      currentPrice: 2280,
      trend: {
        direction: "Bearish",
        strength: "Strong",
        duration: "2 weeks",
        description: "Sharp decline from 2400 area"
      },
      momentum: {
        rsi: 28,
        rsiInterpretation: "Oversold",
        macd: "Bearish crossover",
        macdInterpretation: "Bearish"
      },
      movingAverages: {
        sma20: 2320,
        sma50: 2350,
        sma200: 2310,
        ema9: 2295,
        ema21: 2315,
        ema50: 2340,
        price: 2280,
        alignment: "Bearish"
      },
      structure: {
        supportLevels: ["2260", "2230"],
        resistanceLevels: ["2310", "2350", "2400"],
        marketStructure: "Bearish BOS",
        higherTimeframeStructure: "Bearish",
        dailyStructure: "Bearish",
        fourHourStructure: "Bearish",
        liquiditySweep: "Yes",
        liquiditySweepDirection: "Buy-Side"
      },
      breakout: {
        status: "Breakdown",
        level: "2300",
        confirmed: true,
        volumeConfirmation: true,
        retestPending: true
      },
      volatility: {
        level: "High",
        atrValue: 32.1,
        description: "Elevated volatility during selloff"
      },
      setup: {
        present: false
      }
    }
  },
  {
    name: "sideways-market",
    description: "Sideways ranging market with mixed signals",
    input: {
      timeframe: "H1",
      currentPrice: 2350,
      trend: {
        direction: "Sideways",
        strength: "Weak",
        duration: "5 days",
        description: "Price consolidating between 2340 and 2360"
      },
      momentum: {
        rsi: 52,
        rsiInterpretation: "Neutral",
        macd: "Flat",
        macdInterpretation: "Neutral"
      },
      movingAverages: {
        sma20: 2348,
        sma50: 2352,
        sma200: 2345,
        price: 2350,
        alignment: "Mixed"
      },
      structure: {
        supportLevels: ["2340", "2320"],
        resistanceLevels: ["2360", "2380"],
        marketStructure: "Ranging",
        higherTimeframeStructure: "Bullish",
        dailyStructure: "Sideways",
        fourHourStructure: "Sideways"
      },
      breakout: {
        status: "None"
      },
      volatility: {
        level: "Low",
        atrValue: 8.2,
        description: "Compressed volatility in consolidation"
      },
      setup: {
        present: false
      }
    }
  },
  {
    name: "mixed-signals",
    description: "Conflicting signals across timeframes and indicators",
    input: {
      timeframe: "H4",
      currentPrice: 2380,
      trend: {
        direction: "Bullish",
        strength: "Moderate",
        description: "Higher timeframe bullish but showing signs of fatigue"
      },
      momentum: {
        rsi: 72,
        rsiInterpretation: "Overbought",
        macd: "Bullish but weakening",
        macdInterpretation: "Bullish"
      },
      movingAverages: {
        sma20: 2360,
        sma50: 2340,
        sma200: 2300,
        ema9: 2375,
        ema21: 2358,
        ema50: 2342,
        price: 2380,
        alignment: "Bullish"
      },
      structure: {
        supportLevels: ["2350", "2320"],
        resistanceLevels: ["2390", "2400"],
        marketStructure: "Bullish MSS",
        higherTimeframeStructure: "Bullish",
        dailyStructure: "Bullish",
        fourHourStructure: "Bullish"
      },
      breakout: {
        status: "Pending",
        level: "2390",
        confirmed: false
      },
      volatility: {
        level: "Moderate",
        atrValue: 15.3
      },
      setup: {
        present: true,
        type: "FVG",
        grade: "B"
      }
    }
  },
  {
    name: "missing-technical-inputs",
    description: "Minimal data — only trend provided, everything else missing",
    input: {
      timeframe: "D1",
      currentPrice: 2350,
      trend: {
        direction: "Bullish",
        strength: "Weak",
        description: "Price slightly above previous week high"
      }
    }
  }
];

export function runVerificationScenario(scenario: VerificationScenario): VerificationResult {
  const diagnostics: string[] = [];
  const assertionResults: AssertionResult[] = [];

  const inputValidation = validateTechnicalInput(scenario.input);
  diagnostics.push(`Input validation: ${inputValidation.isValid ? "PASS" : "FAIL"}`);
  diagnostics.push(`Input errors: ${inputValidation.errors.length}, warnings: ${inputValidation.warnings.length}`);

  const result = calculateTechnicalBias(scenario.input);

  const outputValidation = validateTechnicalBiasResult(result);
  diagnostics.push(`Output validation: ${outputValidation.isValid ? "PASS" : "FAIL"}`);
  diagnostics.push(`Technical Score: ${result.technicalScore}, Bias: ${result.technicalBias}, Confidence: ${result.confidence}`);

  assertionResults.push({
    description: "Technical score should be 0-100",
    passed: result.technicalScore >= 0 && result.technicalScore <= 100,
    expected: "0-100",
    actual: result.technicalScore
  });

  assertionResults.push({
    description: "Confidence should be 0-100",
    passed: result.confidence >= 0 && result.confidence <= 100,
    expected: "0-100",
    actual: result.confidence
  });

  assertionResults.push({
    description: "Should have a summary",
    passed: Boolean(result.summary && result.summary.length > 0),
    expected: "Non-empty summary",
    actual: result.summary ? `${result.summary.length} chars` : "Empty"
  });

  assertionResults.push({
    description: "Should have a timestamp",
    passed: Boolean(result.timestamp),
    expected: "Non-empty timestamp",
    actual: result.timestamp || "Empty"
  });

  assertionResults.push({
    description: "Should have data quality assessment",
    passed: Boolean(result.dataQuality),
    expected: "DataQuality object",
    actual: result.dataQuality ? `score: ${result.dataQuality.score}` : "Missing"
  });

  assertionResults.push({
    description: "Should have factors array",
    passed: Array.isArray(result.factors) && result.factors.length >= 0,
    expected: "Array",
    actual: Array.isArray(result.factors) ? `${result.factors.length} factors` : "Not array"
  });

  assertionResults.push({
    description: "Factors should have valid contribution values",
    passed: result.factors.every((f) => !isNaN(f.contribution) && isFinite(f.contribution)),
    expected: "All contributions valid numbers",
    actual: result.factors.every((f) => !isNaN(f.contribution) && isFinite(f.contribution)) ? "Valid" : "Invalid"
  });

  assertionResults.push({
    description: "Supporting factors should be bullish or neutral",
    passed: result.supportingFactors.every((f) => Boolean(f)),
    expected: "Non-empty strings",
    actual: result.supportingFactors.every((f) => Boolean(f)) ? "Valid" : "Invalid"
  });

  assertionResults.push({
    description: "Output validation should pass",
    passed: outputValidation.isValid,
    expected: "Valid output",
    actual: outputValidation.isValid ? "Valid" : `${outputValidation.errors.length} errors`
  });

  const passed = assertionResults.every((a) => a.passed);

  return {
    scenarioName: scenario.name,
    passed,
    result,
    inputValidation,
    outputValidation,
    assertionResults,
    diagnostics
  };
}

export function runAllVerifications(): VerificationResult[] {
  return SCENARIOS.map(runVerificationScenario);
}

export function getVerificationSummary(results: VerificationResult[]): string {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  const lines: string[] = [
    `Technical Bias Engine Verification: ${passed}/${total} scenarios passed`,
    ""
  ];

  for (const result of results) {
    const status = result.passed ? "PASS" : "FAIL";
    lines.push(`  [${status}] ${result.scenarioName}`);
    lines.push(`    Bias: ${result.result.technicalBias} | Score: ${result.result.technicalScore} | Confidence: ${result.result.confidence}`);
    lines.push(`    Data Quality: ${result.result.dataQuality.score}% | Factors: ${result.result.factors.length}`);
    lines.push(`    Supporting: ${result.result.supportingFactors.length} | Conflicting: ${result.result.conflictingFactors.length}`);
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
