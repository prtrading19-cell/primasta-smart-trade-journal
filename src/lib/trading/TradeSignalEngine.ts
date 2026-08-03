import type {
  PortfolioIntelligenceResult,
  PortfolioPosition,
} from "@/lib/research/portfolio";
import type { DecisionIntelligenceResult } from "@/lib/research/decision";
import type { ResearchDecision } from "@/lib/research/models";
import type { TradeDirection, TradeSignal, TradeSignalType } from "./types";

export interface TradeSignalInput {
  portfolio?: PortfolioIntelligenceResult;
  decisions?: DecisionIntelligenceResult[];
  researchDecisions?: ResearchDecision[];
  symbolResolver?: (assetId: string) => string;
}

const POSITION_TO_SIGNAL: Record<string, TradeSignalType> = {
  "STRONG BUY": "BUY",
  BUY: "SCALE IN",
  SELL: "REDUCE",
  "STRONG SELL": "SELL",
  WAIT: "WAIT",
};

function directionForAction(action: string): TradeDirection {
  if (action === "STRONG BUY" || action === "BUY") return "buy";
  if (action === "STRONG SELL" || action === "SELL") return "sell";
  return "flat";
}

function signalTypeForDecision(action: string): TradeSignalType {
  if (action === "STRONG BUY") return "BUY";
  if (action === "BUY") return "SCALE IN";
  if (action === "SELL") return "REDUCE";
  if (action === "STRONG SELL") return "SELL";
  return "WAIT";
}

function resolveSymbol(assetId: string, resolver?: (assetId: string) => string): string {
  if (resolver) {
    const s = resolver(assetId);
    if (s) return s;
  }
  const map: Record<string, string> = {
    gold: "XAUUSD",
    us100: "US100",
    spx500: "US500",
    btcusd: "BTCUSD",
    eurusd: "EURUSD",
    gbpusd: "GBPUSD",
    silver: "XAGUSD",
    oil: "WTIUSD",
  };
  return map[assetId] ?? assetId.toUpperCase();
}

export class TradeSignalEngine {
  generate(input: TradeSignalInput): TradeSignal[] {
    const signals: TradeSignal[] = [];
    const now = new Date().toISOString();

    if (input.portfolio) {
      signals.push(...this.fromPortfolio(input.portfolio, now));
    }

    for (const decision of input.decisions ?? []) {
      signals.push(this.fromDecision(decision, input.symbolResolver, now));
    }

    for (const research of input.researchDecisions ?? []) {
      signals.push(this.fromResearch(research, input.symbolResolver, now));
    }

    return this.dedupe(signals);
  }

  private fromPortfolio(portfolio: PortfolioIntelligenceResult, now: string): TradeSignal[] {
    return portfolio.positions.map((pos) => this.fromPosition(pos, portfolio, now));
  }

  private fromPosition(pos: PortfolioPosition, portfolio: PortfolioIntelligenceResult, now: string): TradeSignal {
    const baseType = POSITION_TO_SIGNAL[pos.action] ?? "WAIT";
    let type = baseType;

    if (pos.state === "Invalidated") type = "CLOSE";
    else if (pos.state === "Reduced") type = "SCALE OUT";
    else if (pos.state === "Closed") type = "CLOSE";
    else if (pos.state === "Waiting" && pos.direction === "flat") type = "WAIT";

    const reasoning = [
      `${pos.assetName} portfolio action ${pos.action} (${pos.state})`,
      `Signal score ${pos.score}, confidence ${pos.confidence}%, risk ${pos.riskLevel}`,
      pos.reason,
      ...pos.invalidationReasons,
    ].filter(Boolean);

    return {
      id: `sig-${now}-${pos.assetId}-${pos.score}`,
      assetId: pos.assetId,
      assetName: pos.assetName,
      symbol: resolveSymbol(pos.assetId),
      type,
      direction: type === "CLOSE" || type === "SCALE OUT" || type === "REDUCE"
        ? (pos.direction === "long" ? "sell" : pos.direction === "short" ? "buy" : "flat")
        : directionForAction(pos.action),
      strength: pos.score,
      confidence: pos.confidence,
      riskLevel: pos.riskLevel,
      source: "portfolio",
      reasoning,
      createdAt: now,
      metadata: {
        positionState: pos.state,
        conflictScore: pos.conflictScore,
        portfolioBias: portfolio.decision.bias,
        portfolioRisk: portfolio.risk.overallRisk,
      },
    };
  }

  private fromDecision(
    decision: DecisionIntelligenceResult,
    symbolResolver?: (assetId: string) => string,
    now?: string
  ): TradeSignal {
    const ts = now ?? new Date().toISOString();
    const action = decision.decision.action;
    const type = signalTypeForDecision(action);
    return {
      id: `sig-${ts}-${decision.asset}-${action}`,
      assetId: decision.asset,
      assetName: decision.asset,
      symbol: resolveSymbol(decision.asset, symbolResolver),
      type,
      direction: directionForAction(action),
      strength: decision.decision.confidence * (action.includes("SELL") ? -1 : 1),
      confidence: decision.confidence.score,
      riskLevel: decision.risk.overallRisk,
      source: "decision",
      reasoning: [
        `Decision engine: ${action}`,
        decision.decision.summary,
        ...decision.decision.reasonsFor.slice(0, 3),
      ].filter(Boolean),
      createdAt: ts,
      metadata: {
        conflictSeverity: decision.conflicts.severity,
        conflictScore: decision.conflicts.score,
        mostLikelyScenario: decision.scenario.mostLikely,
        riskScore: decision.risk.overallScore,
      },
    };
  }

  private fromResearch(
    research: ResearchDecision,
    symbolResolver?: (assetId: string) => string,
    now?: string
  ): TradeSignal {
    const ts = now ?? new Date().toISOString();
    const type = signalTypeForDecision(research.action);
    return {
      id: `sig-${ts}-research-${research.action}`,
      assetId: "research",
      assetName: "Research Signal",
      symbol: resolveSymbol("research", symbolResolver),
      type,
      direction: directionForAction(research.action),
      strength: research.score,
      confidence: research.confidence,
      riskLevel: research.riskRating,
      source: "research",
      reasoning: research.reasoning,
      createdAt: ts,
      metadata: {
        bias: research.bias,
        decisionQuality: research.decisionQuality,
        topContributors: research.topContributors.slice(0, 3),
      },
    };
  }

  private dedupe(signals: TradeSignal[]): TradeSignal[] {
    const seen = new Map<string, TradeSignal>();
    for (const s of signals) {
      const key = `${s.assetId}:${s.source}`;
      const existing = seen.get(key);
      if (!existing || existing.createdAt < s.createdAt) {
        seen.set(key, s);
      }
    }
    return [...seen.values()];
  }
}

export function generateTradeSignals(input: TradeSignalInput): TradeSignal[] {
  return new TradeSignalEngine().generate(input);
}
