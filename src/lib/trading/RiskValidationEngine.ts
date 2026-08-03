import type {
  PortfolioIntelligenceResult,
  PortfolioRiskResult,
} from "@/lib/research/portfolio";
import type { TradeSignal, TradeValidationConfig } from "./types";

export interface RiskValidationInput {
  signal: TradeSignal;
  portfolio?: PortfolioIntelligenceResult | null;
  risk?: PortfolioRiskResult | null;
  positionSize?: number;
  config?: Partial<TradeValidationConfig>;
}

export interface RiskValidationItem {
  id: string;
  label: string;
  value: string;
  limit: string;
  passed: boolean;
  severity: "info" | "warning" | "blocking";
  message: string;
}

export interface RiskValidationResult {
  signalId: string;
  passed: boolean;
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High" | "Extreme";
  checks: RiskValidationItem[];
  blockedReasons: string[];
  suggestedSize: number;
  estimatedRiskAmount: number;
  estimatedRiskPercent: number;
  validatedAt: string;
}

const RISK_LEVEL_SCORES: Record<string, number> = { Low: 20, Medium: 45, High: 70, Extreme: 92 };

export class RiskValidationEngine {
  validate(input: RiskValidationInput): RiskValidationResult {
    const cfg: TradeValidationConfig = {
      confidenceThreshold: 60,
      maxRiskLevel: "High",
      maxRiskScore: 80,
      maxPortfolioExposure: 100,
      maxRiskPerTradePercent: 2,
      maxPortfolioRiskPercent: 6,
      maxPositionsPerAsset: 1,
      requireHedgingReview: true,
      blockOnConflicts: true,
      allowLive: false,
      accountBalance: 100000,
      ...input.config,
    } as TradeValidationConfig;

    const { signal, portfolio } = input;
    const checks: RiskValidationItem[] = [];
    const blockedReasons: string[] = [];

    const riskLevelScore = RISK_LEVEL_SCORES[signal.riskLevel] ?? 40;
    let riskScore = riskLevelScore;
    if (input.risk?.overallScore != null) riskScore = riskScore * 0.5 + input.risk.overallScore * 0.5;

    const levelOk = riskScore <= cfg.maxRiskScore;
    checks.push({
      id: "risk-score",
      label: "Risk score",
      value: `${Math.round(riskScore)}`,
      limit: `≤ ${cfg.maxRiskScore}`,
      passed: levelOk,
      severity: levelOk ? "info" : "blocking",
      message: levelOk
        ? "Combined signal & portfolio risk score within limit"
        : "Combined risk score exceeds limit",
    });
    if (!levelOk) blockedReasons.push("Risk score exceeds limit");

    const signalRiskLevelOk =
      signal.riskLevel !== "Extreme" &&
      ["Low", "Medium", "High", "Extreme"].indexOf(signal.riskLevel) <=
        ["Low", "Medium", "High", "Extreme"].indexOf(cfg.maxRiskLevel);
    checks.push({
      id: "signal-risk-level",
      label: "Signal risk level",
      value: signal.riskLevel,
      limit: `≤ ${cfg.maxRiskLevel}`,
      passed: signalRiskLevelOk,
      severity: signalRiskLevelOk ? "info" : "blocking",
      message: signalRiskLevelOk
        ? `${signal.riskLevel} risk within allowed ceiling`
        : `${signal.riskLevel} risk exceeds ceiling ${cfg.maxRiskLevel}`,
    });
    if (!signalRiskLevelOk) blockedReasons.push("Signal risk level too high");

    if (portfolio) {
      const portfolioRiskOk = portfolio.risk.overallRisk !== "Extreme";
      checks.push({
        id: "portfolio-risk",
        label: "Portfolio risk state",
        value: `${portfolio.risk.overallRisk} (${portfolio.risk.overallScore})`,
        limit: "not Extreme",
        passed: portfolioRiskOk,
        severity: portfolioRiskOk ? "info" : "blocking",
        message: portfolioRiskOk
          ? `Portfolio overall risk ${portfolio.risk.overallRisk}`
          : "Portfolio risk is Extreme; block new exposure",
      });
      if (!portfolioRiskOk) blockedReasons.push("Portfolio risk is Extreme");
    }

    const riskPercent = input.positionSize != null ? input.positionSize : 0;
    const riskOk = riskPercent <= cfg.maxRiskPerTradePercent;
    checks.push({
      id: "risk-per-trade",
      label: "Risk per trade",
      value: `${riskPercent.toFixed(2)}%`,
      limit: `≤ ${cfg.maxRiskPerTradePercent}%`,
      passed: riskOk,
      severity: riskOk ? "info" : "blocking",
      message: riskOk
        ? "Estimated risk per trade within limit"
        : "Estimated risk per trade exceeds limit",
    });
    if (!riskOk) blockedReasons.push("Risk per trade exceeds limit");

    const estimatedRiskPercent = input.positionSize ?? 0;
    const accountBalance = cfg.accountBalance ?? 100000;
    const estimatedRiskAmount = (accountBalance * estimatedRiskPercent) / 100;
    const passed = blockedReasons.length === 0;
    const level =
      riskScore >= 85 ? "Extreme" : riskScore >= 65 ? "High" : riskScore >= 40 ? "Medium" : "Low";

    return {
      signalId: signal.id,
      passed,
      riskScore: Math.round(riskScore),
      riskLevel: level,
      checks,
      blockedReasons,
      suggestedSize: estimatedRiskPercent,
      estimatedRiskAmount: Math.round(estimatedRiskAmount),
      estimatedRiskPercent,
      validatedAt: new Date().toISOString(),
    };
  }
}

export function validateRisk(input: RiskValidationInput): RiskValidationResult {
  return new RiskValidationEngine().validate(input);
}
