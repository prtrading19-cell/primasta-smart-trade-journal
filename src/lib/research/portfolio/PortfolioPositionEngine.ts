import type { PortfolioAssetConfig, PortfolioPosition, PositionDirection, PositionState } from "./types";
import type { ResearchSnapshot } from "../repository/types";
import type { DriverBias } from "@/types/goldResearchConfig";
import { RISK_SCORE_BY_LEVEL } from "./config";

const ACTION_SCORE: Record<string, number> = {
  "STRONG BUY": 100,
  "BUY": 70,
  "WAIT": 0,
  "SELL": -70,
  "STRONG SELL": -100,
};

const ACTION_BIAS: Record<string, DriverBias> = {
  "STRONG BUY": "Strong Bullish",
  "BUY": "Bullish",
  "WAIT": "Neutral",
  "SELL": "Bearish",
  "STRONG SELL": "Strong Bearish",
};

export interface PositionEngineInput {
  asset: PortfolioAssetConfig;
  snapshot: ResearchSnapshot | null;
  history: ResearchSnapshot[];
}

export interface PositionEngineOutput {
  position: PortfolioPosition | null;
  reason: string;
}

function directionForScore(score: number): PositionDirection {
  if (score > 0) return "long";
  if (score < 0) return "short";
  return "flat";
}

function invalidatePosition(snapshot: ResearchSnapshot): string[] {
  const reasons: string[] = [];
  if (snapshot.result.risk.overallRisk === "Extreme") {
    reasons.push("Overall risk rated Extreme");
  }
  if (snapshot.result.conflicts.severity === "Extreme") {
    reasons.push("Extreme conflicting evidence");
  }
  if (snapshot.result.confidence.score < 25) {
    reasons.push(`Confidence critically low (${snapshot.result.confidence.score})`);
  }
  return reasons;
}

export class PortfolioPositionEngine {
  evaluate(input: PositionEngineInput): PositionEngineOutput {
    const { asset, snapshot, history } = input;

    if (!snapshot) {
      return {
        position: null,
        reason: `${asset.displayName}: no decision snapshot available yet`,
      };
    }

    const action = snapshot.result.decision.action;
    const score = ACTION_SCORE[action] ?? 0;
    const confidence = snapshot.result.confidence.score;
    const riskScore = snapshot.result.risk.overallScore;
    const riskLevel = snapshot.result.risk.overallRisk;
    const conflictScore = snapshot.result.conflicts.score;
    const conflictSeverity = snapshot.result.conflicts.severity;
    const invalidationReasons = invalidatePosition(snapshot);

    const prevSnapshot = history.length > 1 ? history[1] : null;
    const prevAction = prevSnapshot?.result.decision.action ?? null;
    const prevScore = prevAction != null ? ACTION_SCORE[prevAction] ?? 0 : 0;

    let state: PositionState;
    if (invalidationReasons.length > 0) {
      state = "Invalidated";
    } else if (action === "WAIT") {
      state = prevScore !== 0 ? "Closed" : "Waiting";
    } else if (prevScore !== 0 && Math.sign(prevScore) !== Math.sign(score)) {
      state = "Reduced";
    } else if (score !== 0 && confidence >= 60) {
      state = "Active";
    } else {
      state = "Waiting";
    }

    const position: PortfolioPosition = {
      assetId: asset.assetId,
      assetName: asset.displayName,
      assetClass: asset.assetClass,
      state,
      direction: directionForScore(score),
      action,
      bias: ACTION_BIAS[action] ?? "Neutral",
      score,
      confidence,
      riskLevel,
      riskScore,
      conflictScore,
      conflictSeverity,
      openedAt: null,
      updatedAt: snapshot.timestamp,
      reason: snapshot.result.decision.summary || `${asset.displayName} research signal: ${action}`,
      invalidationReasons,
    };

    return {
      position,
      reason: `${asset.displayName} → ${action} (${state}), confidence ${confidence}, risk ${riskLevel}, score ${riskScore}`,
    };
  }
}

export function evaluatePortfolioPosition(input: PositionEngineInput): PositionEngineOutput {
  return new PortfolioPositionEngine().evaluate(input);
}

export function actionScore(action: string): number {
  return ACTION_SCORE[action] ?? 0;
}

export function riskScoreToLevel(score: number): DriverBias {
  return score > 60 ? "Bullish" : score < -60 ? "Bearish" : "Neutral";
}

export function biasToScore(bias: DriverBias): number {
  switch (bias) {
    case "Strong Bullish": return 100;
    case "Bullish": return 70;
    case "Bearish": return -70;
    case "Strong Bearish": return -100;
    default: return 0;
  }
}

export { RISK_SCORE_BY_LEVEL };
