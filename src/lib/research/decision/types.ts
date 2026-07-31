import type { DriverBias } from "@/types/goldResearchConfig";
import type { DecisionAction } from "../models/ResearchDecision";

export type RiskLevel = "Low" | "Medium" | "High" | "Extreme";
export type ScenarioType = "bull" | "base" | "bear";

export interface EvidenceRecord {
  id: string;
  category: string;
  driverId: string;
  driverTitle: string;
  bias: DriverBias;
  confidence: number;
  source: string;
  timestamp: string;
  value: string;
  interpretation: string;
  weight: number;
}

export interface ConfidenceBreakdown {
  score: number;
  level: "Very High" | "High" | "Moderate" | "Low" | "Very Low";
  components: {
    freshness: number;
    providerHealth: number;
    evidenceCount: number;
    agreement: number;
    completeness: number;
  };
}

export interface ConflictResult {
  score: number;
  severity: "None" | "Low" | "Moderate" | "High" | "Extreme";
  conflictingPairs: { driverA: string; driverB: string; biasA: DriverBias; biasB: DriverBias; severity: number; explanation: string }[];
  consensusDrivers: string[];
  discordDrivers: string[];
  explanation: string;
}

export interface ScenarioCase {
  type: ScenarioType;
  title: string;
  probability: number;
  supportingEvidence: string[];
  invalidationConditions: string[];
  catalysts: string[];
  risks: string[];
  targetPrice?: number;
  targetDate?: string;
}

export interface ScenarioResult {
  bull: ScenarioCase;
  base: ScenarioCase;
  bear: ScenarioCase;
  mostLikely: ScenarioType;
}

export interface RiskAssessment {
  marketRisk: RiskLevel;
  liquidityRisk: RiskLevel;
  volatilityRisk: RiskLevel;
  macroRisk: RiskLevel;
  institutionalRisk: RiskLevel;
  newsRisk: RiskLevel;
  eventRisk: RiskLevel;
  overallRisk: RiskLevel;
  overallScore: number;
  breakdown: {
    category: string;
    score: number;
    level: RiskLevel;
    driver: string;
  }[];
}

export interface DecisionExplanation {
  action: DecisionAction;
  confidence: number;
  summary: string;
  reasonsFor: string[];
  reasonsAgainst: string[];
  keyDrivers: { name: string; impact: "supporting" | "conflicting" | "neutral"; contribution: number }[];
  invalidationConditions: string[];
  catalysts: string[];
  worstCase: string;
  bestCase: string;
}

export interface TimelineEntry {
  timestamp: string;
  engine: string;
  result: string;
  confidence: number;
  durationMs: number;
}

export interface DecisionHistoryEntry {
  id: string;
  asset: string;
  timestamp: string;
  decision: DecisionExplanation;
  confidence: ConfidenceBreakdown;
  conflicts: ConflictResult;
  scenario: ScenarioResult;
  risk: RiskAssessment;
  evidence: EvidenceRecord[];
  timeline: TimelineEntry[];
  pipelineResultRef?: unknown;
}

export interface DecisionIntelligenceResult {
  asset: string;
  timestamp: string;
  evidence: EvidenceRecord[];
  confidence: ConfidenceBreakdown;
  conflicts: ConflictResult;
  scenario: ScenarioResult;
  risk: RiskAssessment;
  decision: DecisionExplanation;
  timeline: TimelineEntry[];
  historyEntry: DecisionHistoryEntry;
  aiSummary?: string;
}
