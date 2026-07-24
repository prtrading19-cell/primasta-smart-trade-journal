import type {
  InstitutionalFlowInput,
  InstitutionalFlowResult,
  InstitutionalFactor
} from "@/types/institutionalFlow";
import { calculateInstitutionalFlow } from "./institutionalFlowEngine";

interface VerificationScenario {
  name: string;
  description: string;
  input: InstitutionalFlowInput;
  validate: (result: InstitutionalFlowResult) => {
    passed: boolean;
    message: string;
    details: string[];
  };
}

const SCENARIOS: VerificationScenario[] = [
  {
    name: "strong-accumulation",
    description: "Strong institutional accumulation — ETF inflows, CB buying, COT net longs, rising OI",
    input: {
      etfFlows: {
        direction: "Inflow",
        magnitude: "Heavy",
        weeklyChange: 25
      },
      centralBank: {
        buyingVolume: "Heavy",
        sellingVolume: "Light",
        netPurchases: 500,
        trend: "Inflow"
      },
      cotPositioning: {
        commercials: { netLong: 80000, netShort: 30000 },
        nonCommercials: { netLong: 90000, netShort: 20000 },
        managedMoney: { netLong: 85000, netShort: 25000 }
      },
      openInterest: {
        currentLevel: 500000,
        changeFromPrevious: 15000,
        trend: "Inflow"
      },
      crowdPositioning: {
        retailBias: "Net Long",
        institutionalBias: "Net Long",
        crowdingLevel: "Moderate",
        crowdedTradeRisk: "Moderate"
      },
      positionRisk: {
        level: "Moderate",
        crowdingFactor: 0.5
      }
    },
    validate: (result) => {
      const details: string[] = [];
      let passed = true;

      if (result.institutionalBias !== "Strong Bullish" && result.institutionalBias !== "Bullish") {
        passed = false;
        details.push(`Expected Bullish or Strong Bullish bias, got "${result.institutionalBias}".`);
      }

      if (result.institutionalScore < 50) {
        passed = false;
        details.push(`Score ${result.institutionalScore}% too low for strong accumulation.`);
      }

      const etfFactor = result.factors.find(f => f.name.includes("ETF"));
      if (etfFactor && etfFactor.direction !== "Bullish") {
        details.push(`ETF factor should be Bullish, got "${etfFactor.direction}".`);
      }

      const cotFactor = result.factors.find(f => f.name === "Commercials");
      if (cotFactor && cotFactor.direction !== "Bullish") {
        details.push(`COT factor should be Bullish, got "${cotFactor.direction}".`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Strong accumulation correctly identified (score ${result.institutionalScore}%, bias ${result.institutionalBias}).`
          : `FAIL: Strong accumulation scenario failed.`,
        details
      };
    }
  },
  {
    name: "strong-distribution",
    description: "Strong institutional distribution — ETF outflows, CB selling, COT net shorts, falling OI",
    input: {
      etfFlows: {
        direction: "Outflow",
        magnitude: "Heavy",
        weeklyChange: -20
      },
      centralBank: {
        buyingVolume: "Light",
        sellingVolume: "Heavy",
        netPurchases: -300,
        trend: "Outflow"
      },
      cotPositioning: {
        commercials: { netLong: 20000, netShort: 60000 },
        nonCommercials: { netLong: 15000, netShort: 70000 },
        managedMoney: { netLong: 10000, netShort: 65000 }
      },
      openInterest: {
        currentLevel: 450000,
        changeFromPrevious: -10000,
        trend: "Outflow"
      },
      crowdPositioning: {
        retailBias: "Net Short",
        institutionalBias: "Net Short",
        crowdingLevel: "High",
        crowdedTradeRisk: "High"
      },
      positionRisk: {
        level: "High",
        crowdingFactor: 0.7
      }
    },
    validate: (result) => {
      const details: string[] = [];
      let passed = true;

      if (result.institutionalBias !== "Strong Bearish" && result.institutionalBias !== "Bearish") {
        passed = false;
        details.push(`Expected Bearish or Strong Bearish bias, got "${result.institutionalBias}".`);
      }

      if (result.institutionalScore > 50) {
        passed = false;
        details.push(`Score ${result.institutionalScore}% too high for distribution.`);
      }

      const etfFactor = result.factors.find(f => f.name.includes("ETF"));
      if (etfFactor && etfFactor.direction !== "Bearish") {
        details.push(`ETF factor should be Bearish, got "${etfFactor.direction}".`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Strong distribution correctly identified (score ${result.institutionalScore}%, bias ${result.institutionalBias}).`
          : `FAIL: Strong distribution scenario failed.`,
        details
      };
    }
  },
  {
    name: "mixed-signals",
    description: "Conflicting signals — ETF inflows but CB selling and COT positioning diverge",
    input: {
      etfFlows: {
        direction: "Inflow",
        magnitude: "Moderate",
        weeklyChange: 10
      },
      centralBank: {
        buyingVolume: "Light",
        sellingVolume: "Heavy",
        netPurchases: -200,
        trend: "Outflow"
      },
      cotPositioning: {
        commercials: { netLong: 40000, netShort: 35000 },
        nonCommercials: { netLong: 30000, netShort: 40000 },
        managedMoney: { netLong: 25000, netShort: 45000 }
      },
      openInterest: {
        currentLevel: 400000,
        changeFromPrevious: 5000,
        trend: "Inflow"
      },
      crowdPositioning: {
        retailBias: "Net Short",
        institutionalBias: "Flat",
        crowdingLevel: "Moderate",
        crowdedTradeRisk: "Moderate"
      },
      positionRisk: {
        level: "Moderate",
        crowdingFactor: 0.5
      }
    },
    validate: (result) => {
      const details: string[] = [];
      let passed = true;

      if (result.supportingFactors.length === 0 || result.conflictingFactors.length === 0) {
        details.push("Expected both supporting and conflicting factors in mixed scenario.");
      }

      if (result.confidence > 65) {
        details.push(`Confidence ${result.confidence}% may be too high for mixed signals.`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Mixed signals correctly identified (score: ${result.institutionalScore}%, bias: ${result.institutionalBias}).`
          : `FAIL: Mixed signals scenario failed.`,
        details
      };
    }
  },
  {
    name: "missing-inputs",
    description: "Only 2 data sources available — reduced data quality expected",
    input: {
      etfFlows: {
        direction: "Inflow",
        magnitude: "Moderate"
      },
      openInterest: {
        currentLevel: 480000,
        changeFromPrevious: 12000,
        trend: "Inflow"
      }
    },
    validate: (result) => {
      const details: string[] = [];
      let passed = true;

      if (result.dataQuality.score > 50) {
        passed = false;
        details.push(`Data quality ${result.dataQuality.score}% too high for only 2 sources.`);
      }

      if (result.dataQuality.availableDrivers.length < 2) {
        passed = false;
        details.push(`Expected 2+ available drivers, got ${result.dataQuality.availableDrivers.length}.`);
      }

      if (result.confidence > 60) {
        details.push(`Confidence ${result.confidence}% may be inflated for limited data.`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Limited data correctly handled (quality: ${result.dataQuality.score}%, drivers: ${result.dataQuality.availableDrivers.length}).`
          : `FAIL: Missing inputs scenario failed.`,
        details
      };
    }
  },
  {
    name: "extreme-positioning-risk",
    description: "Extreme crowding detected — concentration risk flagged",
    input: {
      etfFlows: {
        direction: "Inflow",
        magnitude: "Heavy"
      },
      cotPositioning: {
        nonCommercials: { netLong: 120000, netShort: 15000 }
      },
      crowdPositioning: {
        retailBias: "Net Long",
        institutionalBias: "Net Long",
        crowdingLevel: "Extreme",
        crowdedTradeRisk: "Extreme"
      },
      positionRisk: {
        level: "Extreme",
        crowdingFactor: 0.92
      }
    },
    validate: (result) => {
      const details: string[] = [];
      let passed = true;

      const hasCrowdingRisk = result.concentrationRisks.some(
        r => r.type.includes("Crowding") || r.type.includes("Extreme")
      );

      if (!hasCrowdingRisk) {
        passed = false;
        details.push("No extreme crowding concentration risk detected.");
      }

      const crowdingFactor = result.factors.find(f => f.name === "Crowding Level");
      if (crowdingFactor && crowdingFactor.strength !== "Strong") {
        details.push(`Crowding factor strength should be Strong, got "${crowdingFactor.strength}".`);
      }

      const positionRiskFactor = result.factors.find(f => f.name === "Position Risk Level");
      if (positionRiskFactor && positionRiskFactor.strength !== "Strong") {
        details.push(`Position risk strength should be Strong, got "${positionRiskFactor.strength}".`);
      }

      return {
        passed,
        message: passed
          ? `PASS: Extreme positioning risk correctly flagged (${result.concentrationRisks.length} concentration risks detected).`
          : `FAIL: Extreme positioning risk scenario failed.`,
        details
      };
    }
  }
];

export function runInstitutionalFlowVerification(): {
  passed: number;
  failed: number;
  results: Array<{ name: string; passed: boolean; message: string; details: string[] }>;
} {
  const results: Array<{ name: string; passed: boolean; message: string; details: string[] }> = [];
  let passed = 0;
  let failed = 0;

  for (const scenario of SCENARIOS) {
    const result = calculateInstitutionalFlow(scenario.input);
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
  const report = runInstitutionalFlowVerification();

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║     INSTITUTIONAL FLOW ENGINE — VERIFICATION REPORT        ║");
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
