import type { ResearchDriver, ResearchCategory, ResearchInstitutional, ResearchTechnical, ResearchBias, ResearchDecision } from "../models";
import { buildEvidenceRecords } from "./EvidenceEngine";
import { calculateDecisionConfidence } from "./ConfidenceEngine";
import { detectConflicts } from "./ConflictEngine";
import { generateScenarios } from "./ScenarioEngine";
import { assessRisk } from "./RiskEngine";
import { buildDecisionExplanation } from "./DecisionExplanationEngine";
import { generateAiSummary } from "./AiSummaryEngine";
import { ResearchTimeline } from "./ResearchTimeline";
import { DecisionHistory } from "./DecisionHistory";
import { getSharedSingleton } from "../infrastructure/singleton";
import type { DecisionIntelligenceResult, DecisionHistoryEntry } from "./types";

export const globalTimeline = getSharedSingleton("globalTimeline", () => new ResearchTimeline());
export const globalDecisionHistory = getSharedSingleton("globalDecisionHistory", () => new DecisionHistory());

export interface DecisionIntelligenceInput {
  asset: string;
  drivers: ResearchDriver[];
  categories: ResearchCategory[];
  institutional: ResearchInstitutional;
  technical: ResearchTechnical;
  bias: ResearchBias;
  decision: ResearchDecision;
  providerHealth?: { successRate: number; averageLatency: number } | null;
}

export function runDecisionIntelligence(input: DecisionIntelligenceInput): DecisionIntelligenceResult {
  const t0 = Date.now();
  const { asset, drivers, categories, institutional, technical, bias, decision, providerHealth } = input;

  /* 1. Evidence */
  const t1 = Date.now();
  const evidence = buildEvidenceRecords(drivers, categories, institutional, technical, bias);
  globalTimeline.add("EvidenceEngine", `${evidence.length} records`, confidenceFromBias(bias), Date.now() - t1);

  /* 2. Confidence */
  const t2 = Date.now();
  const confidence = calculateDecisionConfidence(evidence, providerHealth);
  globalTimeline.add("ConfidenceEngine", `Score: ${confidence.score}`, confidence.score, Date.now() - t2);

  /* 3. Conflicts */
  const t3 = Date.now();
  const conflicts = detectConflicts(evidence);
  globalTimeline.add("ConflictEngine", `${conflicts.conflictingPairs.length} pairs, ${conflicts.severity}`, confidence.score, Date.now() - t3);

  /* 4. Scenarios */
  const t4 = Date.now();
  const scenario = generateScenarios(evidence, conflicts, confidence);
  globalTimeline.add("ScenarioEngine", `Most likely: ${scenario.mostLikely}`, confidence.score, Date.now() - t4);

  /* 5. Risk */
  const t5 = Date.now();
  const risk = assessRisk(evidence, conflicts, bias, decision);
  globalTimeline.add("RiskEngine", `Overall: ${risk.overallRisk}`, confidence.score, Date.now() - t5);

  /* 6. Decision Explanation */
  const t6 = Date.now();
  const decisionExplanation = buildDecisionExplanation(bias, decision, evidence, conflicts, confidence, risk, scenario);
  globalTimeline.add("DecisionExplanationEngine", `Action: ${decisionExplanation.action}`, confidence.score, Date.now() - t6);

  const timeline = globalTimeline.getRecent(20);

  /* 7. History entry */
  const historyEntry: DecisionHistoryEntry = {
    id: `dh-${Date.now()}-${asset.replace(/[^a-zA-Z0-9]/g, "")}`,
    asset,
    timestamp: new Date().toISOString(),
    decision: decisionExplanation,
    confidence,
    conflicts,
    scenario,
    risk,
    evidence,
    timeline,
  };

  globalDecisionHistory.add(historyEntry);

  /* 8. AI Summary */
  const t8 = Date.now();
  const allHistory = globalDecisionHistory.getByAsset(asset);
  const aiSummary = generateAiSummary(
    { asset, timestamp: historyEntry.timestamp, evidence, confidence, conflicts, scenario, risk, decision: decisionExplanation, timeline, historyEntry },
    allHistory
  );
  globalTimeline.add("AiSummaryEngine", `Summary generated`, confidence.score, Date.now() - t8);

  return {
    asset,
    timestamp: historyEntry.timestamp,
    evidence,
    confidence,
    conflicts,
    scenario,
    risk,
    decision: decisionExplanation,
    timeline,
    historyEntry,
    aiSummary,
  };
}

function confidenceFromBias(bias: ResearchBias): number {
  return bias.confidence ?? 50;
}
