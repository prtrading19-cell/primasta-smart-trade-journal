import type { ResearchSnapshot } from "./types";

export interface DecisionAnalyticsResult {
  totalDecisions: number;
  decisionDistribution: Record<string, number>;
  decisionPercentages: Record<string, string>;
  averageConfidence: number;
  averageRisk: number;
  averageConflict: number;
  confidenceDistribution: { range: string; count: number }[];
  scenarioDistribution: Record<string, number>;
  riskDistribution: Record<string, number>;
}

export function computeDecisionAnalytics(snapshots: ResearchSnapshot[]): DecisionAnalyticsResult {
  if (snapshots.length === 0) {
    return {
      totalDecisions: 0,
      decisionDistribution: {},
      decisionPercentages: {},
      averageConfidence: 0,
      averageRisk: 0,
      averageConflict: 0,
      confidenceDistribution: [],
      scenarioDistribution: {},
      riskDistribution: {},
    };
  }

  const decisionDist: Record<string, number> = {};
  const scenarioDist: Record<string, number> = {};
  const riskDist: Record<string, number> = {};
  const confRanges: Record<string, number> = {
    "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0,
  };

  let totalConf = 0;
  let totalRisk = 0;
  let totalConflict = 0;

  for (const s of snapshots) {
    const action = s.result.decision.action;
    decisionDist[action] = (decisionDist[action] ?? 0) + 1;

    const scenario = s.result.scenario.mostLikely;
    scenarioDist[scenario] = (scenarioDist[scenario] ?? 0) + 1;

    const risk = s.result.risk.overallRisk;
    riskDist[risk] = (riskDist[risk] ?? 0) + 1;

    const conf = s.result.confidence.score;
    totalConf += conf;
    totalRisk += s.result.risk.overallScore;
    totalConflict += s.result.conflicts.score;

    if (conf <= 20) confRanges["0-20"]++;
    else if (conf <= 40) confRanges["21-40"]++;
    else if (conf <= 60) confRanges["41-60"]++;
    else if (conf <= 80) confRanges["61-80"]++;
    else confRanges["81-100"]++;
  }

  const n = snapshots.length;
  const decisionPercentages: Record<string, string> = {};
  for (const [action, count] of Object.entries(decisionDist)) {
    decisionPercentages[action] = ((count / n) * 100).toFixed(1) + "%";
  }

  return {
    totalDecisions: n,
    decisionDistribution: decisionDist,
    decisionPercentages,
    averageConfidence: Math.round(totalConf / n),
    averageRisk: Math.round(totalRisk / n),
    averageConflict: Math.round(totalConflict / n),
    confidenceDistribution: Object.entries(confRanges).map(([range, count]) => ({ range, count })),
    scenarioDistribution: scenarioDist,
    riskDistribution: riskDist,
  };
}
