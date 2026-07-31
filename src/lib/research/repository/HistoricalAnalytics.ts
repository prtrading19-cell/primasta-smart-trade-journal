import type { ResearchSnapshot } from "./types";

export interface ConfidenceTimePoint {
  timestamp: string;
  score: number;
  level: string;
}

export interface RiskTimePoint {
  timestamp: string;
  overallScore: number;
  overallRisk: string;
}

export interface ConflictTimePoint {
  timestamp: string;
  score: number;
  severity: string;
}

export interface HistoricalAnalyticsResult {
  confidenceOverTime: ConfidenceTimePoint[];
  riskOverTime: RiskTimePoint[];
  conflictOverTime: ConflictTimePoint[];
  averageConfidence: number;
  averageRisk: number;
  averageConflict: number;
  confidenceTrend: "improving" | "declining" | "stable";
  riskTrend: "improving" | "declining" | "stable";
  conflictTrend: "improving" | "declining" | "stable";
}

export function computeHistoricalAnalytics(snapshots: ResearchSnapshot[]): HistoricalAnalyticsResult {
  if (snapshots.length === 0) {
    return {
      confidenceOverTime: [],
      riskOverTime: [],
      conflictOverTime: [],
      averageConfidence: 0,
      averageRisk: 0,
      averageConflict: 0,
      confidenceTrend: "stable",
      riskTrend: "stable",
      conflictTrend: "stable",
    };
  }

  const confidenceOverTime: ConfidenceTimePoint[] = [];
  const riskOverTime: RiskTimePoint[] = [];
  const conflictOverTime: ConflictTimePoint[] = [];
  let totalConf = 0;
  let totalRisk = 0;
  let totalConflict = 0;

  for (const s of snapshots) {
    confidenceOverTime.push({ timestamp: s.timestamp, score: s.result.confidence.score, level: s.result.confidence.level });
    riskOverTime.push({ timestamp: s.timestamp, overallScore: s.result.risk.overallScore, overallRisk: s.result.risk.overallRisk });
    conflictOverTime.push({ timestamp: s.timestamp, score: s.result.conflicts.score, severity: s.result.conflicts.severity });
    totalConf += s.result.confidence.score;
    totalRisk += s.result.risk.overallScore;
    totalConflict += s.result.conflicts.score;
  }

  const n = snapshots.length;
  const avgConf = Math.round(totalConf / n);
  const avgRisk = Math.round(totalRisk / n);
  const avgConflict = Math.round(totalConflict / n);

  const half = Math.floor(n / 2);
  const firstHalf = snapshots.slice(0, half);
  const secondHalf = snapshots.slice(half);

  const firstAvgConf = firstHalf.length > 0 ? firstHalf.reduce((s, r) => s + r.result.confidence.score, 0) / firstHalf.length : 0;
  const secondAvgConf = secondHalf.length > 0 ? secondHalf.reduce((s, r) => s + r.result.confidence.score, 0) / secondHalf.length : 0;
  const firstAvgRisk = firstHalf.length > 0 ? firstHalf.reduce((s, r) => s + r.result.risk.overallScore, 0) / firstHalf.length : 0;
  const secondAvgRisk = secondHalf.length > 0 ? secondHalf.reduce((s, r) => s + r.result.risk.overallScore, 0) / secondHalf.length : 0;
  const firstAvgConflict = firstHalf.length > 0 ? firstHalf.reduce((s, r) => s + r.result.conflicts.score, 0) / firstHalf.length : 0;
  const secondAvgConflict = secondHalf.length > 0 ? secondHalf.reduce((s, r) => s + r.result.conflicts.score, 0) / secondHalf.length : 0;

  return {
    confidenceOverTime,
    riskOverTime,
    conflictOverTime,
    averageConfidence: avgConf,
    averageRisk: avgRisk,
    averageConflict: avgConflict,
    confidenceTrend: secondAvgConf > firstAvgConf + 2 ? "improving" : secondAvgConf < firstAvgConf - 2 ? "declining" : "stable",
    riskTrend: secondAvgRisk < firstAvgRisk - 2 ? "improving" : secondAvgRisk > firstAvgRisk + 2 ? "declining" : "stable",
    conflictTrend: secondAvgConflict < firstAvgConflict - 2 ? "improving" : secondAvgConflict > firstAvgConflict + 2 ? "declining" : "stable",
  };
}
