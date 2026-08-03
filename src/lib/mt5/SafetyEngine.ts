import type {
  Mt5AccountSynchronizerState,
  Mt5PlaceRequest,
  Mt5SafetyCheck,
  Mt5SafetyConfig,
  Mt5SafetyResult,
} from "./types";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

function check(
  id: string,
  label: string,
  passed: boolean,
  severity: "blocking" | "warning",
  message: string
): Mt5SafetyCheck {
  return { id, label, passed, severity, message };
}

interface DailySession {
  date: string;
  trades: number;
  pnl: number;
}

export class SafetyEngine {
  private killSwitch: boolean;
  private session: DailySession;
  private peakEquity: number | null = null;

  constructor(private safetyConfig: Mt5SafetyConfig) {
    this.killSwitch = safetyConfig.emergencyKillSwitch;
    this.session = { date: this.todayKey(), trades: 0, pnl: 0 };
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private rollSession(): void {
    const today = this.todayKey();
    if (this.session.date !== today) {
      this.session = { date: today, trades: 0, pnl: 0 };
    }
  }

  getKillSwitch(): boolean {
    return this.killSwitch;
  }

  setKillSwitch(enabled: boolean): void {
    this.killSwitch = enabled;
  }

  setSafetyConfig(config: Mt5SafetyConfig): void {
    this.safetyConfig = config;
    this.killSwitch = config.emergencyKillSwitch;
  }

  getSafetyConfig(): Mt5SafetyConfig {
    return { ...this.safetyConfig };
  }

  recordExecutedTrade(pnl: number | null): void {
    this.rollSession();
    this.session.trades += 1;
    if (pnl != null) this.session.pnl += pnl;
  }

  recordEquity(equity: number | null): void {
    if (equity == null) return;
    if (this.peakEquity == null || equity > this.peakEquity) {
      this.peakEquity = equity;
    }
  }

  getDailyTrades(): number {
    this.rollSession();
    return this.session.trades;
  }

  validate(
    request: Mt5PlaceRequest,
    context: {
      account?: Mt5AccountSynchronizerState | null;
      equity?: number | null;
      existingPositionsVolume?: number;
      pendingProposalVolume?: number;
    } = {}
  ): Mt5SafetyResult {
    this.rollSession();
    const now = new Date();
    const checks: Mt5SafetyCheck[] = [];
    const blockedReasons: string[] = [];
    const warnings: string[] = [];
    const cfg = this.safetyConfig;

    /* 1. Emergency kill switch */
    const killOk = !this.killSwitch;
    checks.push(
      check(
        "kill-switch",
        "Emergency kill switch",
        killOk,
        "blocking",
        killOk ? "Kill switch is OFF" : "Emergency kill switch is ON — all orders blocked"
      )
    );
    if (!killOk) blockedReasons.push("Emergency kill switch is active");

    /* 2. Maximum lots per order */
    const lotsOk = request.volume > 0 && request.volume <= cfg.maxLotsPerOrder;
    checks.push(
      check(
        "max-lots",
        "Maximum lots per order",
        lotsOk,
        "blocking",
        lotsOk
          ? `Volume ${request.volume} within max ${cfg.maxLotsPerOrder}`
          : `Volume ${request.volume} exceeds max ${cfg.maxLotsPerOrder}`
      )
    );
    if (!lotsOk) blockedReasons.push("Volume exceeds maximum lots per order");

    /* 3. Trading hours */
    const inDay = cfg.tradingDays.includes(now.getDay());
    const hour = now.getHours();
    const inHours = hour >= cfg.tradingOpenHour && hour < cfg.tradingCloseHour;
    const marketOk = inDay && inHours;
    checks.push(
      check(
        "trading-hours",
        "Trading hours",
        marketOk,
        "blocking",
        marketOk
          ? `Market open (${cfg.tradingOpenHour}:00–${cfg.tradingCloseHour}:00, days ${cfg.tradingDays.join(",")})`
          : `Outside trading hours (${cfg.tradingOpenHour}:00–${cfg.tradingCloseHour}:00)`
      )
    );
    if (!marketOk) blockedReasons.push("Outside trading hours");

    /* 4. Maximum daily trades */
    const dailyTradesOk = this.session.trades < cfg.maxDailyTrades;
    checks.push(
      check(
        "daily-trades",
        "Maximum daily trades",
        dailyTradesOk,
        "blocking",
        dailyTradesOk
          ? `${this.session.trades}/${cfg.maxDailyTrades} trades today`
          : `Daily trade limit reached (${this.session.trades}/${cfg.maxDailyTrades})`
      )
    );
    if (!dailyTradesOk) blockedReasons.push("Daily trade limit reached");

    /* 5. Margin available */
    const account = context.account;
    const freeMargin = account?.latest?.marginFree ?? context.equity;
    const marginKnown = freeMargin != null;
    const marginOk = marginKnown && freeMargin >= cfg.minFreeMarginRequired;
    checks.push(
      check(
        "margin",
        "Margin available",
        marginOk,
        "blocking",
        marginOk
          ? `Free margin ${freeMargin} meets minimum ${cfg.minFreeMarginRequired}`
          : marginKnown
            ? `Free margin ${freeMargin} below minimum ${cfg.minFreeMarginRequired}`
            : "Cannot verify free margin — account not synchronized"
      )
    );
    if (!marginOk) {
      blockedReasons.push(marginKnown ? "Insufficient free margin" : "Cannot verify margin (account not synchronized)");
    }

    /* 6. Risk per trade */
    const equity = account?.latest?.equity ?? null;
    if (request.riskPercent != null) {
      const riskOk = request.riskPercent <= cfg.maxRiskPerTradePercent;
      checks.push(
        check(
          "risk-per-trade",
          "Maximum risk per trade",
          riskOk,
          "blocking",
          riskOk
            ? `Risk ${request.riskPercent}% within max ${cfg.maxRiskPerTradePercent}%`
            : `Risk ${request.riskPercent}% exceeds max ${cfg.maxRiskPerTradePercent}%`
        )
      );
      if (!riskOk) blockedReasons.push("Risk per trade exceeds limit");
    } else if (equity != null && request.volume > 0 && request.sl != null) {
      const riskMoney = Math.abs(request.price != null ? (request.price - request.sl) * request.volume : request.volume * request.sl);
      const riskPct = equity > 0 ? (riskMoney / equity) * 100 : 0;
      const riskOk = riskPct <= cfg.maxRiskPerTradePercent;
      checks.push(
        check(
          "risk-per-trade",
          "Maximum risk per trade",
          riskOk,
          "blocking",
          riskOk
            ? `Estimated risk ${riskPct.toFixed(2)}% within max ${cfg.maxRiskPerTradePercent}%`
            : `Estimated risk ${riskPct.toFixed(2)}% exceeds max ${cfg.maxRiskPerTradePercent}%`
        )
      );
      if (!riskOk) blockedReasons.push("Risk per trade exceeds limit");
    } else {
      checks.push(
        check(
          "risk-per-trade",
          "Maximum risk per trade",
          true,
          "warning",
          "Risk per trade not computable (no equity or SL) — skipped"
        )
      );
      warnings.push("Risk per trade not computable");
    }

    /* 7. Daily loss */
    const lossLimit = cfg.maxDailyLossPercent / 100;
    const dailyLossOk = equity != null && equity > 0
      ? this.session.pnl >= -(equity * lossLimit)
      : true;
    checks.push(
      check(
        "daily-loss",
        "Maximum daily loss",
        dailyLossOk,
        "blocking",
        equity != null
          ? dailyLossOk
            ? `Daily P/L ${this.session.pnl} within ${cfg.maxDailyLossPercent}% of equity`
            : `Daily loss exceeds ${cfg.maxDailyLossPercent}% of equity`
          : "Daily loss not computable (no equity) — skipped"
      )
    );
    if (!dailyLossOk) blockedReasons.push("Daily loss limit reached");
    if (equity == null) warnings.push("Daily loss not computable");

    /* 8. Max drawdown */
    const peak = this.peakEquity;
    const current = equity;
    const drawdownKnown = peak != null && current != null && peak > 0;
    const drawdownPct = drawdownKnown ? ((peak - current) / peak) * 100 : null;
    const drawdownOk = drawdownPct == null || drawdownPct <= cfg.maxDrawdownPercent;
    checks.push(
      check(
        "drawdown",
        "Maximum drawdown",
        drawdownOk,
        "blocking",
        drawdownPct != null
          ? drawdownOk
            ? `Drawdown ${drawdownPct.toFixed(2)}% within ${cfg.maxDrawdownPercent}%`
            : `Drawdown exceeds ${cfg.maxDrawdownPercent}%`
          : "Drawdown not computable — skipped"
      )
    );
    if (!drawdownOk) blockedReasons.push("Maximum drawdown exceeded");
    if (!drawdownKnown) warnings.push("Drawdown not computable");

    /* 9. Existing exposure (informational) */
    if (context.existingPositionsVolume != null || context.pendingProposalVolume != null) {
      const gross = (context.existingPositionsVolume ?? 0) + (context.pendingProposalVolume ?? 0);
      checks.push(
        check(
          "exposure",
          "Open exposure",
          true,
          "warning",
          `Gross open volume ${gross} lots across positions and pending proposals`
        )
      );
    }

    const passed = blockedReasons.length === 0;
    return {
      passed,
      checks,
      blockedReasons,
      warnings,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export function getSafetyEngine(safetyConfig?: Mt5SafetyConfig): SafetyEngine {
  return getSharedSingleton("Mt5SafetyEngine", () => new SafetyEngine(safetyConfig ?? {
    maxRiskPerTradePercent: 2,
    maxLotsPerOrder: 10,
    maxDailyLossPercent: 5,
    maxDailyTrades: 10,
    maxDrawdownPercent: 20,
    minFreeMarginRequired: 1000,
    tradingDays: [1, 2, 3, 4, 5],
    tradingOpenHour: 0,
    tradingCloseHour: 24,
    emergencyKillSwitch: false,
  }));
}
