import type {
  PortfolioIntelligenceResult,
  PortfolioPosition,
  PortfolioWarning,
} from "@/lib/research/portfolio";
import type {
  TradeSignal,
  TradeValidationConfig,
  ValidationCheck,
  ValidationResult,
} from "./types";

export interface TradeValidationInput {
  signal: TradeSignal;
  portfolio?: PortfolioIntelligenceResult | null;
  existingPositions?: PortfolioPosition[];
  config?: Partial<TradeValidationConfig>;
  marketOpen?: boolean;
}

function check(
  id: string,
  label: string,
  passed: boolean,
  severity: "info" | "warning" | "blocking",
  message: string
): ValidationCheck {
  return { id, label, passed, severity, message };
}

export class TradeValidationEngine {
  validate(input: TradeValidationInput): ValidationResult {
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
      ...input.config,
    };

    const { signal, portfolio, existingPositions } = input;
    const checks: ValidationCheck[] = [];
    const rejectedReasons: string[] = [];

    /* 1. Confidence threshold */
    const confidenceOk = signal.confidence >= cfg.confidenceThreshold;
    checks.push(
      check(
        "confidence",
        "Confidence threshold",
        confidenceOk,
        confidenceOk ? "info" : "blocking",
        confidenceOk
          ? `Confidence ${signal.confidence}% meets threshold ${cfg.confidenceThreshold}%`
          : `Confidence ${signal.confidence}% below threshold ${cfg.confidenceThreshold}%`
      )
    );
    if (!confidenceOk) rejectedReasons.push("Confidence below threshold");

    /* 2. Risk threshold */
    const riskLevels = ["Low", "Medium", "High", "Extreme"];
    const riskOk = signal.riskLevel !== "Extreme"
      && riskLevels.indexOf(signal.riskLevel) <= riskLevels.indexOf(cfg.maxRiskLevel);
    checks.push(
      check(
        "risk",
        "Risk threshold",
        riskOk,
        riskOk ? "info" : "blocking",
        riskOk
          ? `Risk level ${signal.riskLevel} within allowed ${cfg.maxRiskLevel}`
          : `Risk level ${signal.riskLevel} exceeds allowed ${cfg.maxRiskLevel}`
      )
    );
    if (!riskOk) rejectedReasons.push("Risk level exceeds threshold");

    /* 3. Portfolio exposure */
    if (portfolio) {
      const exposureOk = portfolio.exposure.netExposure <= cfg.maxPortfolioExposure;
      checks.push(
        check(
          "exposure",
          "Portfolio exposure",
          exposureOk,
          exposureOk ? "info" : "warning",
          exposureOk
            ? `Net exposure ${portfolio.exposure.netExposure} within ${cfg.maxPortfolioExposure}`
            : `Net exposure ${portfolio.exposure.netExposure} exceeds ${cfg.maxPortfolioExposure}`
        )
      );
      if (!exposureOk) rejectedReasons.push("Portfolio exposure exceeds limit");
    }

    /* 4. Hedging status */
    if (portfolio && cfg.requireHedgingReview) {
      const hedgeRelated = portfolio.hedging.suggestions.filter((h) =>
        h.assets.includes(signal.assetId) || h.assets.includes(signal.assetName)
      );
      const highSeverity = hedgeRelated.some((h) => h.severity === "High");
      const hedgeOk = !highSeverity;
      checks.push(
        check(
          "hedging",
          "Hedging review",
          hedgeOk,
          hedgeOk ? "info" : "blocking",
          hedgeOk
            ? (hedgeRelated.length > 0
              ? `${hedgeRelated.length} hedge suggestion(s) reviewed`
              : "No hedging conflict for this asset")
            : `High-severity hedge suggestion active for ${signal.assetName}`
        )
      );
      if (!hedgeOk) rejectedReasons.push("High-severity hedge conflict");
    }

    /* 5. Duplicate positions */
    const active = (existingPositions ?? []).filter((p) =>
      p.assetId === signal.assetId && p.state === "Active"
    );
    const duplicateOk = active.length < cfg.maxPositionsPerAsset;
    checks.push(
      check(
        "duplicate",
        "Duplicate positions",
        duplicateOk,
        duplicateOk ? "info" : "blocking",
        duplicateOk
          ? `No active duplicate for ${signal.assetName}`
          : `${active.length} active position(s) already exist for ${signal.assetName}`
      )
    );
    if (!duplicateOk) rejectedReasons.push("Duplicate position already open");

    /* 6. Asset conflicts */
    if (portfolio && cfg.blockOnConflicts) {
      const assetConflicts = portfolio.conflicts.filter((c) =>
        c.assetA === signal.assetId || c.assetB === signal.assetId
      );
      const conflictOk = assetConflicts.length === 0;
      checks.push(
        check(
          "conflicts",
          "Asset conflicts",
          conflictOk,
          conflictOk ? "info" : "blocking",
          conflictOk
            ? "No portfolio conflicts for this asset"
            : `${assetConflicts.length} conflict(s) involving ${signal.assetName}`
        )
      );
      if (!conflictOk) rejectedReasons.push("Portfolio conflict blocks signal");
    }

    /* 7. Market state */
    if (input.marketOpen != null) {
      const marketOk = input.marketOpen;
      checks.push(
        check(
          "market",
          "Market state",
          marketOk,
          marketOk ? "info" : "warning",
          marketOk ? "Market open" : "Market closed or illiquid"
        )
      );
      if (!marketOk) rejectedReasons.push("Market closed");
    }

    return {
      signalId: signal.id,
      passed: rejectedReasons.length === 0,
      checks,
      rejectedReasons,
      validatedAt: new Date().toISOString(),
    };
  }
}

export function validateTradeSignal(input: TradeValidationInput): ValidationResult {
  return new TradeValidationEngine().validate(input);
}

export function collectWarnings(portfolio: PortfolioIntelligenceResult): PortfolioWarning[] {
  return portfolio.warnings;
}
