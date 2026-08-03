import type {
  PortfolioIntelligenceResult,
  PortfolioPosition,
} from "@/lib/research/portfolio";
import type { TradeSignal } from "./types";
import type { PositionSizingConfig, PositionSizingMethod, PositionSizingResult } from "./types";

export interface PositionSizingInput {
  signal: TradeSignal;
  portfolio?: PortfolioIntelligenceResult | null;
  position?: PortfolioPosition | null;
  config?: Partial<PositionSizingConfig>;
}

const METHOD_LABELS: Record<PositionSizingMethod, string> = {
  "fixed-lots": "Fixed lots",
  "fixed-risk": "Fixed risk %",
  kelly: "Kelly criterion",
  atr: "ATR based",
  portfolio: "Portfolio %",
  institutional: "Institutional %",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundLots(value: number): number {
  return Math.round(value * 100) / 100;
}

export class PositionSizingEngine {
  calculate(input: PositionSizingInput): PositionSizingResult {
    const cfg: PositionSizingConfig = {
      method: "fixed-risk",
      accountBalance: 100000,
      baseRiskPercent: 1,
      maxRiskPercent: 2,
      fixedLots: 1,
      kellyFraction: 0.25,
      atrMultiplier: 2,
      atrDistance: 50,
      portfolioPercent: 5,
      institutionalPercent: 3,
      contractSize: 100,
      minLot: 0.01,
      maxLot: 100,
      maxPortfolioRiskPercent: 6,
      maxRiskPerTradePercent: 2,
      ...input.config,
    };

    const { signal, portfolio, position } = input;
    const balance = cfg.accountBalance;
    const strength = clamp(signal.strength, 0, 100) / 100;
    const confidence = clamp(signal.confidence, 0, 100) / 100;

    let sizeRaw = 0;
    let notes: string[] = [];

    switch (cfg.method) {
      case "fixed-lots":
        sizeRaw = cfg.fixedLots;
        notes.push(`Fixed ${cfg.fixedLots} lots`);
        break;
      case "fixed-risk":
        sizeRaw = this.fixedRiskLots(balance, cfg, strength, confidence);
        notes.push(`Risk ${cfg.baseRiskPercent}% of ${balance}`);
        break;
      case "kelly":
        sizeRaw = this.kellyLots(cfg, signal, strength, confidence);
        notes.push(`Kelly fraction ${cfg.kellyFraction}`);
        break;
      case "atr":
        sizeRaw = this.atrLots(balance, cfg, signal, strength, confidence);
        notes.push(`ATR stop ${cfg.atrMultiplier} × ${cfg.atrDistance}`);
        break;
      case "portfolio":
        sizeRaw = this.portfolioPercentLots(balance, cfg, signal, portfolio, confidence);
        notes.push(`Portfolio allocation ${cfg.portfolioPercent}%`);
        break;
      case "institutional":
        sizeRaw = this.institutionalLots(balance, cfg, confidence);
        notes.push(`Institutional allocation ${cfg.institutionalPercent}%`);
        break;
    }

    const rawRiskPercent = this.estimatedRiskPercent(cfg, signal, sizeRaw);
    let size = roundLots(clamp(sizeRaw, cfg.minLot, cfg.maxLot));

    if (rawRiskPercent > cfg.maxRiskPerTradePercent) {
      const scale = cfg.maxRiskPerTradePercent / Math.max(rawRiskPercent, 0.0001);
      size = roundLots(clamp(size * scale, cfg.minLot, cfg.maxLot));
      notes.push(`Scaled to cap risk at ${cfg.maxRiskPerTradePercent}%`);
    }

    if (portfolio) {
      const suggestion = portfolio.allocation.suggestions.find(
        (s) => s.assetId === signal.assetId || s.assetName === signal.assetName
      );
      if (suggestion) {
        const delta = suggestion.suggestedWeight - suggestion.currentWeight;
        notes.push(`Delta to target weight ${delta.toFixed(2)}%`);
      }
    }

    const riskAmount = (balance * cfg.baseRiskPercent) / 100;
    const estimatedPnl = size * cfg.contractSize * cfg.atrDistance * Math.sign(signal.strength || 1);

    return {
      method: cfg.method,
      methodLabel: METHOD_LABELS[cfg.method],
      lots: size,
      riskAmount: Math.round(riskAmount),
      riskPercent: cfg.baseRiskPercent,
      estimatedPnl: Math.round(estimatedPnl),
      estimatedNotional: Math.round(size * cfg.contractSize * cfg.atrDistance),
      stopDistance: cfg.atrDistance,
      confidenceFactor: confidence,
      strengthFactor: strength,
      notes,
      positionSizingConfig: cfg,
      calculatedAt: new Date().toISOString(),
    };
  }

  private fixedRiskLots(
    balance: number,
    cfg: PositionSizingConfig,
    strength: number,
    confidence: number
  ): number {
    const riskAmount = (balance * (cfg.baseRiskPercent + strength * 0.5) * confidence) / 100;
    return riskAmount / (cfg.contractSize * cfg.atrDistance);
  }

  private kellyLots(cfg: PositionSizingConfig, signal: TradeSignal, strength: number, confidence: number): number {
    const winProb = clamp(confidence, 0.05, 0.95);
    const edge = clamp(signal.strength, 0, 100) / 100;
    const kelly = winProb - (1 - winProb) / Math.max(edge, 0.02);
    const fraction = clamp(kelly * cfg.kellyFraction, 0.001, cfg.maxRiskPercent / 100);
    return fraction * 100; // scale to lots
  }

  private atrLots(
    balance: number,
    cfg: PositionSizingConfig,
    signal: TradeSignal,
    strength: number,
    confidence: number
  ): number {
    const riskBudget = (balance * cfg.baseRiskPercent * confidence) / 100;
    const stopPips = cfg.atrMultiplier * cfg.atrDistance;
    return riskBudget / (cfg.contractSize * stopPips);
  }

  private portfolioPercentLots(
    balance: number,
    cfg: PositionSizingConfig,
    signal: TradeSignal,
    portfolio: PortfolioIntelligenceResult | null | undefined,
    confidence: number
  ): number {
    const available = portfolio?.exposure.totalExposure != null ? balance : balance;
    const target = (available * cfg.portfolioPercent * confidence) / 100;
    return target / (cfg.contractSize * cfg.atrDistance);
  }

  private institutionalLots(balance: number, cfg: PositionSizingConfig, confidence: number): number {
    const target = (balance * cfg.institutionalPercent * confidence) / 100;
    return target / (cfg.contractSize * cfg.atrDistance);
  }

  private estimatedRiskPercent(cfg: PositionSizingConfig, signal: TradeSignal, sizeRaw: number): number {
    const stopPips = cfg.atrMultiplier * cfg.atrDistance;
    const riskAmount = sizeRaw * cfg.contractSize * stopPips;
    return (riskAmount / cfg.accountBalance) * 100;
  }
}

export function calculatePositionSize(input: PositionSizingInput): PositionSizingResult {
  return new PositionSizingEngine().calculate(input);
}
