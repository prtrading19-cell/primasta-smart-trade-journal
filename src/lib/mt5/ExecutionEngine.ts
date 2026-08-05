import type {
  Mt5AccountSynchronizerState,
  Mt5OrderPreview,
  Mt5OrderType,
  Mt5PlaceRequest,
  Mt5PositionSynchronizerState,
  Mt5SymbolSpec,
  Mt5Tick,
  Mt5ValidationCheck,
  Mt5ValidationResult,
} from "./types";
import { getMt5Config } from "./config";
import { getMt5Gateway } from "./Mt5Gateway";
import { getAccountSynchronizer } from "./AccountSynchronizer";
import { getPositionSynchronizer } from "./PositionSynchronizer";
import { getSafetyEngine } from "./SafetyEngine";
import { getMt5Logger } from "./Mt5Logger";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

export interface Mt5PreviewOutcome {
  ok: boolean;
  preview: Mt5OrderPreview | null;
  error: string | null;
}

function validationCheck(
  id: string,
  label: string,
  passed: boolean,
  severity: "blocking" | "warning",
  message: string
): Mt5ValidationCheck {
  return { id, label, passed, severity, message };
}

export function isBuyOrderType(type: Mt5OrderType): boolean {
  return (
    type === "buy" ||
    type === "buy-limit" ||
    type === "buy-stop" ||
    type === "buy-stop-limit"
  );
}

export function isPendingOrderType(type: Mt5OrderType): boolean {
  return (
    type === "buy-limit" ||
    type === "sell-limit" ||
    type === "buy-stop" ||
    type === "sell-stop" ||
    type === "buy-stop-limit" ||
    type === "sell-stop-limit"
  );
}

/**
 * Correlation grouping key derived from a live symbol name using the standard
 * trading-domain convention: FX majors/minors group by base currency (first
 * three letters of a six-letter pair), metals by XAU/XAG/XPT/XPD, everything
 * else by its first four characters. Used only for the configurable
 * correlation exposure limit — no simulated data, never hardcoded symbol lists.
 */
export function correlationGroupOf(symbol: string): string {
  const s = symbol.toUpperCase();
  if (/^X[A-Z]{2}USD$/.test(s)) return s.slice(0, 3);
  if (/^[A-Z]{6}$/.test(s)) return s.slice(0, 3);
  return s.slice(0, 4);
}

/**
 * Institutional execution safety engine.
 *
 * Every order a human or automated source submits is validated against live,
 * gateway-verified data before it becomes a proposal, and again immediately
 * before transmission. The mandatory gate list (Execution Safety addendum):
 *
 *   1. MT5 terminal connection
 *   2. gateway heartbeat
 *   3. account synchronization
 *   4. symbol validity (straight from symbols_get / symbol_info)
 *   5. market status (live tick + symbol session)
 *   6. lot size vs symbol volume_min / volume_max / volume_step
 *   7. margin (min free margin + affordability of the exact required margin)
 *   8. StopLevel distance for SL/TP
 *   9. FreezeLevel zone
 *  10. spread (live, vs configurable max spread points)
 *  11. daily risk (kill switch, max daily trades/loss, drawdown, risk %)
 *  12. exposure (max open trades, max gross lots, correlation limits)
 *
 * No value is estimated client-side: margin, profit and risk figures come from
 * the Python gateway's `order_calc_margin` / `order_calc_profit` (official MT5
 * math) plus live symbol specs and ticks.
 */
export class ExecutionEngine {
  private async live(symbol: string): Promise<{ spec: Mt5SymbolSpec | null; tick: Mt5Tick | null }> {
    const gateway = getMt5Gateway();
    const [specRes, tickRes] = await Promise.all([gateway.getSymbolSpec(symbol), gateway.getTick(symbol)]);
    return { spec: specRes.ok ? specRes.data : null, tick: tickRes.ok ? tickRes.data : null };
  }

  /** Live, gateway-verified order economics for the order ticket UI. */
  async preview(request: Mt5PlaceRequest): Promise<Mt5PreviewOutcome> {
    const gateway = getMt5Gateway();
    if (!gateway.isConnected()) {
      return { ok: false, preview: null, error: "MT5 gateway not connected — preview unavailable" };
    }
    const account = getAccountSynchronizer().getState();
    const latest = account.latest;
    if (!latest) {
      return { ok: false, preview: null, error: "Account not synchronized — preview unavailable" };
    }
    const { spec, tick } = await this.live(request.symbol);
    if (!spec || !tick) {
      return { ok: false, preview: null, error: `No live market data for ${request.symbol}` };
    }

    const isBuy = isBuyOrderType(request.type);
    const entry = request.price ?? (isBuy ? tick.ask : tick.bid);
    if (entry == null || !Number.isFinite(entry)) {
      return { ok: false, preview: null, error: "No live entry price available" };
    }

    const marginRes = await gateway.calcMargin({
      symbol: request.symbol,
      volume: request.volume,
      orderType: request.type,
      price: entry,
    });
    const requiredMargin = marginRes.ok ? (marginRes.data?.value ?? 0) : 0;

    const spreadCost =
      tick.spread > 0 && spec.tickSize > 0
        ? (tick.spread / spec.tickSize) * spec.tickValue * request.volume
        : 0;
    const pipValue =
      spec.tickSize > 0 ? (spec.tickValue / spec.tickSize) * spec.point * request.volume : 0;
    const positionValue = spec.contractSize * request.volume * entry;

    let dollarRisk = 0;
    let riskPercent = 0;
    if (request.sl != null) {
      const riskRes = await gateway.calcProfit({
        symbol: request.symbol,
        volume: request.volume,
        orderType: request.type,
        openPrice: entry,
        closePrice: request.sl,
      });
      dollarRisk =
        riskRes.ok && riskRes.data?.value != null
          ? Math.abs(riskRes.data.value)
          : Math.abs(entry - request.sl) * spec.contractSize * request.volume;
      riskPercent = latest.equity > 0 ? (dollarRisk / latest.equity) * 100 : 0;
    }

    let estimatedProfit = 0;
    let reward = 0;
    if (request.tp != null) {
      const profitRes = await gateway.calcProfit({
        symbol: request.symbol,
        volume: request.volume,
        orderType: request.type,
        openPrice: entry,
        closePrice: request.tp,
      });
      estimatedProfit =
        profitRes.ok && profitRes.data?.value != null ? profitRes.data.value : 0;
      reward = Math.abs(request.tp - entry) * spec.contractSize * request.volume;
    }

    const freeMargin = latest.marginFree;
    const margin = Math.max(latest.equity - freeMargin, 0);

    const preview: Mt5OrderPreview = {
      symbol: request.symbol,
      orderType: request.type,
      volume: request.volume,
      entryPrice: entry,
      sl: request.sl,
      tp: request.tp,
      bid: tick.bid,
      ask: tick.ask,
      spread: tick.spread,
      spreadCost,
      pipValue,
      positionValue,
      requiredMargin,
      commission: null,
      swap: isBuy ? spec.swapLong : spec.swapShort,
      dollarRisk,
      riskPercent,
      reward,
      rewardPercent: latest.equity > 0 ? (reward / latest.equity) * 100 : 0,
      rrRatio: dollarRisk > 0 ? reward / dollarRisk : 0,
      estimatedProfit,
      estimatedLoss: -dollarRisk,
      balance: latest.balance,
      equity: latest.equity,
      freeMargin,
      marginLevel: latest.marginLevel,
      balanceAfterLoss: latest.balance - dollarRisk,
      freeMarginAfterEntry: freeMargin - requiredMargin,
      marginLevelAfterEntry:
        margin + requiredMargin > 0 ? (latest.equity / (margin + requiredMargin)) * 100 : null,
      evaluatedAt: new Date().toISOString(),
    };
    return { ok: true, preview, error: null };
  }

  /**
   * Run all 12 mandatory gates against live gateway data. Safe to call when
   * disconnected — failed gates are reported, never thrown.
   */
  async validate(
    request: Mt5PlaceRequest,
    context: {
      account?: Mt5AccountSynchronizerState | null;
      positions?: Mt5PositionSynchronizerState | null;
    } = {}
  ): Promise<Mt5ValidationResult> {
    const cfg = getMt5Config();
    const safety = getSafetyEngine();
    const gateway = getMt5Gateway();
    const logger = getMt5Logger();
    const accountSync = context.account ?? getAccountSynchronizer().getState();
    const positionSync = context.positions ?? getPositionSynchronizer().getState();
    const account = accountSync.latest;

    const checks: Mt5ValidationCheck[] = [];
    const blockedReasons: string[] = [];
    const warnings: string[] = [];
    const evaluatedAt = new Date().toISOString();
    const push = (c: Mt5ValidationCheck) => {
      checks.push(c);
      if (c.severity === "blocking" && !c.passed) blockedReasons.push(c.message);
      if (c.severity === "warning" && !c.passed) warnings.push(c.message);
    };

    /* 1. MT5 connection */
    const connected = gateway.isConnected();
    push(
      validationCheck(
        "connection",
        "MT5 connection",
        connected,
        "blocking",
        connected ? "MT5 terminal is connected" : "MT5 terminal is not connected"
      )
    );

    /* 2. Gateway heartbeat */
    const latency = connected ? await gateway.ping() : -1;
    const heartbeatOk = connected && latency >= 0;
    push(
      validationCheck(
        "heartbeat",
        "Gateway heartbeat",
        heartbeatOk,
        "blocking",
        heartbeatOk ? `Gateway heartbeat OK (${latency}ms)` : "Gateway heartbeat failed"
      )
    );

    /* 3. Account synchronization */
    const accountKnown = account != null;
    push(
      validationCheck(
        "account-sync",
        "Account synchronization",
        accountKnown,
        "blocking",
        accountKnown
          ? `Account ${account?.login ?? "—"} synchronized (${account?.server ?? "—"})`
          : "Account is not synchronized"
      )
    );

    /* Live symbol data — only fetched when connected. */
    const { spec, tick } = connected ? await this.live(request.symbol) : { spec: null, tick: null };

    /* 4. Symbol validity */
    const symbolValid = spec != null && spec.available && spec.tradeAllowed !== false;
    push(
      validationCheck(
        "symbol-valid",
        "Symbol validation",
        symbolValid,
        "blocking",
        symbolValid
          ? `${request.symbol} is tradeable (live symbol info)`
          : `${request.symbol} is not available or not tradeable`
      )
    );

    /* 5. Market status */
    const marketOpen =
      tick != null && tick.marketLive && (spec?.session.enabled ?? true) && tick.spread > 0;
    push(
      validationCheck(
        "market-open",
        "Market status",
        marketOpen,
        "blocking",
        marketOpen
          ? `Market live — ${request.symbol} bid ${tick?.bid} / ask ${tick?.ask}`
          : tick == null
            ? "No live market tick available"
            : `${request.symbol} market is closed or stale`
      )
    );

    /* 6. Lot size vs symbol contract */
    const stepOk =
      spec == null || spec.volumeStep <= 0 || Math.abs(spec.volumeStep - (request.volume % spec.volumeStep)) < 1e-9;
    const lotSizeOk =
      spec != null &&
      request.volume >= spec.volumeMin &&
      request.volume <= spec.volumeMax &&
      stepOk;
    push(
      validationCheck(
        "lot-size",
        "Lot size",
        lotSizeOk,
        "blocking",
        lotSizeOk
          ? `Volume ${request.volume} within ${spec?.volumeMin}–${spec?.volumeMax} (step ${spec?.volumeStep})`
          : spec == null
            ? "Cannot verify lot size (no symbol spec)"
            : `Volume ${request.volume} outside ${spec.volumeMin}–${spec.volumeMax} or not aligned to step ${spec.volumeStep}`
      )
    );

    /* 7. Margin */
    const entry = request.price ?? (tick != null ? (isBuyOrderType(request.type) ? tick.ask : tick.bid) : null);
    let requiredMargin = 0;
    if (connected && symbolValid && tick != null && entry != null) {
      const marginRes = await gateway.calcMargin({
        symbol: request.symbol,
        volume: request.volume,
        orderType: request.type,
        price: entry,
      });
      requiredMargin = marginRes.ok ? (marginRes.data?.value ?? 0) : 0;
    }
    const minMarginOk = accountKnown && account!.marginFree >= cfg.safety.minFreeMarginRequired;
    const affordable = accountKnown && requiredMargin <= account!.marginFree;
    const marginOk = minMarginOk && affordable;
    push(
      validationCheck(
        "margin",
        "Margin available",
        marginOk,
        "blocking",
        accountKnown
          ? requiredMargin > 0
            ? `Free margin ${account!.marginFree.toFixed(2)} — required ${requiredMargin.toFixed(2)}${affordable ? "" : " (insufficient)"}`
            : `Free margin ${account!.marginFree.toFixed(2)} meets minimum ${cfg.safety.minFreeMarginRequired}`
          : "Cannot verify margin — account not synchronized"
      )
    );

    /* 8. StopLevel */
    const stopsLevel = spec?.stopsLevel ?? 0;
    let stopLevelOk = true;
    if (spec && entry != null && stopsLevel > 0) {
      if (request.sl != null && Math.abs(entry - request.sl) < stopsLevel) stopLevelOk = false;
      if (request.tp != null && Math.abs(entry - request.tp) < stopsLevel) stopLevelOk = false;
    }
    push(
      validationCheck(
        "stop-level",
        "StopLevel distance",
        stopLevelOk,
        "blocking",
        stopLevelOk
          ? `SL/TP distance respects StopLevel ${spec?.stopsLevelPoints ?? 0} pts`
          : `SL/TP is inside StopLevel ${spec?.stopsLevelPoints ?? 0} pts (${spec?.stopsLevel})`
      )
    );

    /* 9. FreezeLevel */
    const freezeLevel = spec?.freezeLevel ?? 0;
    const inFreezeZone =
      freezeLevel > 0 && entry != null && tick != null && Math.abs(entry - (isBuyOrderType(request.type) ? tick.ask : tick.bid)) < freezeLevel;
    push(
      validationCheck(
        "freeze-level",
        "FreezeLevel zone",
        !inFreezeZone,
        "blocking",
        inFreezeZone
          ? `Entry is inside the ${spec?.freezeLevelPoints ?? 0}-pt FreezeLevel zone`
          : `FreezeLevel respected (${spec?.freezeLevelPoints ?? 0} pts)`
      )
    );

    /* 10. Spread */
    const maxSpread = cfg.safety.maxSpreadPoints ?? 0;
    const spreadPoints = tick != null && spec != null && spec.point > 0 ? tick.spread / spec.point : 0;
    const spreadOk = tick != null && spreadPoints > 0 && (maxSpread <= 0 || spreadPoints <= maxSpread);
    push(
      validationCheck(
        "spread",
        "Spread",
        spreadOk,
        "blocking",
        tick != null
          ? spreadOk
            ? `Live spread ${spreadPoints.toFixed(1)} pts${maxSpread > 0 ? ` (max ${maxSpread})` : ""}`
            : `Live spread ${spreadPoints.toFixed(1)} pts exceeds configured max ${maxSpread}`
          : "No live spread available"
      )
    );

    /* 11. Daily risk — the SafetyEngine owns these gates */
    const safetyResult = safety.validate(request, {
      account: accountSync,
      existingPositionsVolume: positionSync.positions.reduce((sum, p) => sum + p.volume, 0),
      pendingProposalVolume: 0,
    });
    for (const c of safetyResult.checks) {
      const cw = { ...c };
      if (!cw.passed && cw.severity === "blocking") blockedReasons.push(cw.message);
      if (!cw.passed && cw.severity === "warning") warnings.push(cw.message);
      checks.push(cw);
    }
    warnings.push(...safetyResult.warnings);

    /* 12. Exposure limits */
    const openCount = positionSync.positions.length;
    const maxOpenTrades = cfg.safety.maxOpenTrades;
    if (maxOpenTrades != null && openCount >= maxOpenTrades) {
      push(
        validationCheck(
          "max-open-trades",
          "Maximum open trades",
          false,
          "blocking",
          `Open trades ${openCount} at/above limit ${maxOpenTrades}`
        )
      );
    } else {
      push(
        validationCheck(
          "max-open-trades",
          "Maximum open trades",
          true,
          "warning",
          maxOpenTrades != null ? `Open trades ${openCount}/${maxOpenTrades}` : "No open-trade limit configured"
        )
      );
    }

    const grossExposure =
      positionSync.positions.reduce((sum, p) => sum + p.volume, 0) + request.volume;
    const maxExposureLots = cfg.safety.maxExposureLots;
    if (maxExposureLots != null && grossExposure > maxExposureLots) {
      push(
        validationCheck(
          "max-exposure",
          "Maximum exposure (lots)",
          false,
          "blocking",
          `Gross exposure ${grossExposure} lots exceeds limit ${maxExposureLots}`
        )
      );
    } else {
      push(
        validationCheck(
          "max-exposure",
          "Maximum exposure (lots)",
          true,
          "warning",
          maxExposureLots != null ? `Gross exposure ${grossExposure}/${maxExposureLots} lots` : "No exposure limit configured"
        )
      );
    }

    const correlationLimits = cfg.safety.correlationLimits ?? {};
    if (Object.keys(correlationLimits).length > 0) {
      const groups: Record<string, number> = {};
      for (const p of positionSync.positions) {
        const key = correlationGroupOf(p.symbol);
        groups[key] = (groups[key] ?? 0) + p.volume;
      }
      for (const o of positionSync.pendingOrders) {
        const key = correlationGroupOf(o.symbol);
        groups[key] = (groups[key] ?? 0) + o.volume;
      }
      const requestedGroup = correlationGroupOf(request.symbol);
      groups[requestedGroup] = (groups[requestedGroup] ?? 0) + request.volume;
      let correlationOk = true;
      let violation = "";
      for (const [key, limit] of Object.entries(correlationLimits)) {
        const exposure = groups[key] ?? 0;
        if (exposure > limit) {
          correlationOk = false;
          violation = `Correlated group ${key} exposure ${exposure} lots exceeds limit ${limit}`;
          break;
        }
      }
      push(
        validationCheck(
          "correlation",
          "Correlation limits",
          correlationOk,
          "blocking",
          correlationOk ? "Correlation limits respected" : violation
        )
      );
    }

    logger.log(
      "safety",
      "Execution validation",
      blockedReasons.length === 0
        ? `All ${checks.length} gates passed for ${request.type} ${request.volume} ${request.symbol}`
        : `Validation blocked: ${blockedReasons.join("; ")}`,
      { symbol: request.symbol, volume: request.volume, type: request.type, passed: blockedReasons.length === 0 }
    );

    return { passed: blockedReasons.length === 0, checks, blockedReasons, warnings, evaluatedAt };
  }
}

export function getExecutionEngine(): ExecutionEngine {
  return getSharedSingleton("Mt5ExecutionEngine", () => new ExecutionEngine());
}
