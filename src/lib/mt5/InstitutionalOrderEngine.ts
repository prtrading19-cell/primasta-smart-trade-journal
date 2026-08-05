import type {
  Mt5BasketRequest,
  Mt5BracketRequest,
  Mt5ExecutionConfirmation,
  Mt5ExecutionGroup,
  Mt5ExecutionGroupLeg,
  Mt5OcoRequest,
  Mt5PlaceRequest,
  Mt5ProposalSource,
  Mt5ScaleInRequest,
  Mt5ScaleOutRequest,
  Mt5TradeProposal,
} from "./types";
import { getMt5Config } from "./config";
import { getMt5Gateway } from "./Mt5Gateway";
import { getManualApprovalLayer } from "./ManualApprovalLayer";
import { getExecutionConfirmationEngine } from "./ExecutionConfirmation";
import { getExecutionEventStore } from "./Mt5ExecutionEventStore";
import { getExecutionGroupStore } from "./ExecutionGroupStore";
import { getSafetyEngine } from "./SafetyEngine";
import { getExecutionEngine } from "./ExecutionEngine";
import { getAccountSynchronizer } from "./AccountSynchronizer";
import { getPositionSynchronizer } from "./PositionSynchronizer";
import { getPositionManager } from "./PositionManager";
import { getMt5Logger } from "./Mt5Logger";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

export interface Mt5GroupActionResult {
  ok: boolean;
  group: Mt5ExecutionGroup | null;
  error: string | null;
}

export interface Mt5GroupLegTransmitResult {
  index: number;
  ok: boolean;
  skipped?: boolean;
  ticket: number | null;
  status: string;
  error: string | null;
  confirmation: Mt5ExecutionConfirmation | null;
}

export interface Mt5GroupApproveResult {
  ok: boolean;
  results: Mt5GroupLegTransmitResult[];
  group: Mt5ExecutionGroup | null;
  error: string | null;
}

export interface Mt5ScaleOutTriggerResult {
  ok: boolean;
  closedVolume: number;
  remaining: number;
  message: string;
  error: string | null;
  group: Mt5ExecutionGroup | null;
}

export interface Mt5ReconcileResult {
  checked: number;
  cancelledLegs: string[];
  completedGroups: string[];
}

/**
 * Institutional order strategy engine.
 *
 * Orchestrates linked-order workflows (OCO, bracket, scale-in, scale-out,
 * basket) on top of the EXISTING Python MT5 gateway. No new transport is
 * required and no existing service is modified:
 *
 *   - Every leg is a normal approval-gated proposal (approval ON by default).
 *   - A group receives ONE approval decision and legs transmit sequentially.
 *   - OCO sibling cancellation is reconciled on the next synchronization
 *     cycle (no per-second polling) using the gateway's own order list.
 *   - Scale-out uses the existing position close primitive with gateway
 *     volume-step alignment.
 *
 * Values (margin, profit, spread, stops/freeze levels) all come from the
 * gateway — nothing is estimated in the browser.
 */
export class InstitutionalOrderEngine {
  private buildProposal(
    input: {
      symbol: string;
      type: Mt5PlaceRequest["type"];
      volume: number;
      price: number | null;
      sl: number | null;
      tp: number | null;
      stopLimit?: number | null;
      magic?: number;
      deviation?: number;
      comment?: string;
      source?: Mt5ProposalSource;
    }
  ): Promise<Mt5TradeProposal | null> {
    const cfg = getMt5Config();
    const request: Mt5PlaceRequest = {
      requestId: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceSignalId: null,
      symbol: input.symbol,
      type: input.type,
      volume: input.volume,
      price: input.price,
      sl: input.sl,
      tp: input.tp,
      stopLimit: input.stopLimit ?? null,
      magic: input.magic ?? cfg.magic,
      deviation: input.deviation ?? cfg.defaultDeviation,
      comment: input.comment ?? "PRIMASTA",
      riskPercent: null,
      source: input.source ?? "manual",
    };
    if (request.volume <= 0) return Promise.resolve(null);

    const account = getAccountSynchronizer().getState();
    const positionState = getPositionSynchronizer().getState();
    const existingPositionsVolume = positionState.positions.reduce((sum, p) => sum + p.volume, 0);
    const pendingVolume = getManualApprovalLayer()
      .pending()
      .filter((p) => p.request.symbol === input.symbol)
      .reduce((sum, p) => sum + p.request.volume, 0);

    return (async () => {
      const safetyResult = getSafetyEngine().validate(request, {
        account,
        existingPositionsVolume,
        pendingProposalVolume: pendingVolume,
      });
      const liveValidation = await getExecutionEngine().validate(request, {
        account,
        positions: positionState,
      });
      const mergedSafety = {
        passed: safetyResult.passed && liveValidation.passed,
        checks: [...safetyResult.checks, ...liveValidation.checks],
        blockedReasons: [...safetyResult.blockedReasons, ...liveValidation.blockedReasons],
        warnings: [...safetyResult.warnings, ...liveValidation.warnings],
        evaluatedAt: new Date().toISOString(),
      };
      const proposal = getManualApprovalLayer().create({
        request,
        signalId: null,
        source: input.source ?? "manual",
        safety: mergedSafety,
      });
      getExecutionEventStore().record({
        stage: "proposal-created",
        proposalId: proposal.id,
        symbol: input.symbol,
        orderType: request.type,
        volume: request.volume,
        price: request.price,
        sl: request.sl,
        tp: request.tp,
        result: mergedSafety.passed ? "pending_approval" : "blocked",
        error: mergedSafety.passed ? null : mergedSafety.blockedReasons.join("; ") || null,
      });
      return proposal;
    })();
  }

  private attachLegs(
    groupId: string,
    proposals: Array<Mt5TradeProposal | null>,
    requests: Array<{
      symbol: string;
      type: Mt5PlaceRequest["type"];
      volume: number;
      price: number | null;
      sl: number | null;
      tp: number | null;
    }>
  ): Mt5ExecutionGroup | null {
    const store = getExecutionGroupStore();
    for (let i = 0; i < requests.length; i++) {
      const proposal = proposals[i];
      const req = requests[i];
      const leg: Mt5ExecutionGroupLeg = {
        proposalId: proposal?.id ?? null,
        ticket: null,
        symbol: req.symbol,
        type: req.type,
        volume: req.volume,
        price: req.price,
        sl: req.sl,
        tp: req.tp,
        stopLimit: null,
        status: proposal ? "pending" : "rejected",
        error: proposal ? null : "Proposal could not be created",
      };
      store.addLeg(groupId, leg);
    }
    return store.get(groupId);
  }

  /** Bracket order — entry + SL + TP created together as one leg. */
  async submitBracket(req: Mt5BracketRequest): Promise<Mt5GroupActionResult> {
    if (!req.symbol || req.legs.length === 0) {
      return { ok: false, group: null, error: "A bracket requires at least one leg" };
    }
    const group = getExecutionGroupStore().create({ mode: "bracket", symbol: req.symbol, note: req.comment });
    const legs = req.legs.slice(0, 2);
    const proposals: Array<Mt5TradeProposal | null> = [];
    for (const leg of legs) {
      proposals.push(
        await this.buildProposal({
          symbol: req.symbol,
          type: leg.type,
          volume: leg.volume,
          price: leg.price,
          sl: leg.sl,
          tp: leg.tp,
          magic: req.magic,
          deviation: req.deviation,
          comment: req.comment,
        })
      );
    }
    this.attachLegs(group.id, proposals, legs.map((l) => ({ symbol: req.symbol, type: l.type, volume: l.volume, price: l.price, sl: l.sl, tp: l.tp })));
    return { ok: true, group: getExecutionGroupStore().get(group.id), error: null };
  }

  /** OCO — two linked pending orders; one fill cancels the other. */
  async submitOco(req: Mt5OcoRequest): Promise<Mt5GroupActionResult> {
    if (!req.symbol) return { ok: false, group: null, error: "Symbol required" };
    const group = getExecutionGroupStore().create({ mode: "oco", symbol: req.symbol, note: req.comment });
    const requests = [
      { symbol: req.symbol, type: req.first.type, volume: req.first.volume, price: req.first.price, sl: req.first.sl, tp: req.first.tp },
      { symbol: req.symbol, type: req.second.type, volume: req.second.volume, price: req.second.price, sl: req.second.sl, tp: req.second.tp },
    ];
    const proposals: Array<Mt5TradeProposal | null> = [];
    for (const r of requests) {
      proposals.push(
        await this.buildProposal({
          symbol: r.symbol,
          type: r.type,
          volume: r.volume,
          price: r.price,
          sl: r.sl,
          tp: r.tp,
          magic: req.magic,
          deviation: req.deviation,
          comment: req.comment,
        })
      );
    }
    this.attachLegs(group.id, proposals, requests);
    return { ok: true, group: getExecutionGroupStore().get(group.id), error: null };
  }

  /** Scale in — split one idea into multiple staged pending entries. */
  async submitScaleIn(req: Mt5ScaleInRequest): Promise<Mt5GroupActionResult> {
    if (!req.symbol || req.tranches.length === 0) {
      return { ok: false, group: null, error: "Scale-in requires symbol and at least one tranche" };
    }
    const group = getExecutionGroupStore().create({ mode: "scale-in", symbol: req.symbol, note: req.comment });
    const requests: Array<{
      symbol: string;
      type: Mt5PlaceRequest["type"];
      volume: number;
      price: number | null;
      sl: number | null;
      tp: number | null;
    }> = [];
    const proposals: Array<Mt5TradeProposal | null> = [];
    for (const tranche of req.tranches) {
      const pendingType = req.direction === "buy" ? "buy-limit" : "sell-limit";
      requests.push({
        symbol: req.symbol,
        type: pendingType,
        volume: tranche.volume,
        price: tranche.price,
        sl: tranche.sl ?? null,
        tp: tranche.tp ?? null,
      });
      proposals.push(
        await this.buildProposal({
          symbol: req.symbol,
          type: pendingType,
          volume: tranche.volume,
          price: tranche.price,
          sl: tranche.sl ?? null,
          tp: tranche.tp ?? null,
          magic: req.magic,
          deviation: req.deviation,
          comment: req.comment,
        })
      );
    }
    this.attachLegs(group.id, proposals, requests);
    return { ok: true, group: getExecutionGroupStore().get(group.id), error: null };
  }

  /** Scale out — register automatic fractional closes for an open position. */
  async registerScaleOut(req: Mt5ScaleOutRequest): Promise<Mt5GroupActionResult> {
    const gateway = getMt5Gateway();
    const posRes = await gateway.getPositions();
    const position = posRes.ok
      ? (posRes.data ?? []).find((p) => p.ticket === req.ticket)
      : null;
    if (!position) {
      return { ok: false, group: null, error: `Position ${req.ticket} not found` };
    }
    const levels = [...new Set(req.levels)]
      .filter((l) => l > 0 && l <= 1)
      .sort((a, b) => a - b);
    if (levels.length === 0) {
      return { ok: false, group: null, error: "At least one scale-out level between 0 and 1 required" };
    }
    const group = getExecutionGroupStore().create({
      mode: "scale-out",
      symbol: position.symbol,
      note: req.note ?? null,
    });
    getExecutionGroupStore().update(group.id, (g) => {
      g.scaleOutTicket = position.ticket;
      g.scaleOutOriginalVolume = position.volume;
      g.scaleOutClosedVolume = 0;
      g.scaleOutLevels = levels;
      g.status = "active";
    });
    getMt5Logger().log(
      "execution",
      `Scale-out registered for position ${position.ticket}`,
      `Levels ${levels.join("/")} of ${position.volume} ${position.symbol}`,
      { groupId: group.id, ticket: position.ticket, levels }
    );
    return { ok: true, group: getExecutionGroupStore().get(group.id), error: null };
  }

  /** Close the incremental volume for a scale-out level (25/50/75/100%). */
  async triggerScaleOut(groupId: string, fraction: number): Promise<Mt5ScaleOutTriggerResult> {
    const store = getExecutionGroupStore();
    const group = store.get(groupId);
    if (!group) return { ok: false, closedVolume: 0, remaining: 0, message: "Group not found", error: "Group not found", group: null };
    if (group.mode !== "scale-out") {
      return { ok: false, closedVolume: 0, remaining: 0, message: "Not a scale-out group", error: "Not a scale-out group", group };
    }
    if (!group.scaleOutLevels.includes(fraction)) {
      return { ok: false, closedVolume: 0, remaining: 0, message: `Level ${fraction * 100}% not configured`, error: `Level ${fraction * 100}% not configured`, group };
    }
    const original = group.scaleOutOriginalVolume;
    const ticket = group.scaleOutTicket;
    if (original == null || ticket == null) {
      return { ok: false, closedVolume: 0, remaining: 0, message: "Scale-out target missing", error: "Scale-out target missing", group };
    }
    const targetCumulative = original * fraction;
    const incremental = Math.max(0, targetCumulative - group.scaleOutClosedVolume);
    if (incremental <= 0) {
      return { ok: false, closedVolume: 0, remaining: 0, message: `Level ${fraction * 100}% already closed`, error: null, group };
    }
    const result = await getPositionManager().close(ticket, incremental);
    if (result.error) {
      return { ok: false, closedVolume: 0, remaining: 0, message: result.error, error: result.error, group };
    }
    store.update(groupId, (g) => {
      g.scaleOutClosedVolume = Math.min(targetCumulative, g.scaleOutClosedVolume + incremental);
    });
    const updated = store.get(groupId);
    const remaining = Math.max(0, original - (updated?.scaleOutClosedVolume ?? 0));
    getMt5Logger().log(
      "execution",
      `Scale-out ${fraction * 100}% triggered`,
      `Closed ${incremental} of ${original} ${group.symbol}`,
      { groupId, ticket, fraction, incremental }
    );
    return {
      ok: true,
      closedVolume: incremental,
      remaining,
      message: `Closed ${incremental} (cumulative ${fraction * 100}%)`,
      error: null,
      group: updated,
    };
  }

  /** Basket — multiple symbols, one proposal per leg, approval once. */
  async submitBasket(req: Mt5BasketRequest): Promise<Mt5GroupActionResult> {
    if (req.legs.length === 0) return { ok: false, group: null, error: "Basket requires at least one leg" };
    const group = getExecutionGroupStore().create({
      mode: "basket",
      symbol: req.legs.map((l) => l.symbol).join("+"),
      note: req.comment,
    });
    const requests: Array<{
      symbol: string;
      type: Mt5PlaceRequest["type"];
      volume: number;
      price: number | null;
      sl: number | null;
      tp: number | null;
    }> = [];
    const proposals: Array<Mt5TradeProposal | null> = [];
    for (const leg of req.legs) {
      requests.push({
        symbol: leg.symbol,
        type: leg.type,
        volume: leg.volume,
        price: leg.price ?? null,
        sl: leg.sl ?? null,
        tp: leg.tp ?? null,
      });
      proposals.push(
        await this.buildProposal({
          symbol: leg.symbol,
          type: leg.type,
          volume: leg.volume,
          price: leg.price ?? null,
          sl: leg.sl ?? null,
          tp: leg.tp ?? null,
          magic: req.magic,
          deviation: req.deviation,
          comment: req.comment,
        })
      );
    }
    this.attachLegs(group.id, proposals, requests);
    return { ok: true, group: getExecutionGroupStore().get(group.id), error: null };
  }

  /* ── Approval & transmission ── */

  /**
   * One approval decision for the whole group. Legs are re-validated
   * immediately before each transmission (no stale validation) and executed
   * sequentially. A rejected leg never blocks the remaining legs — each
   * result is returned individually.
   */
  async approveGroup(groupId: string, note?: string | null): Promise<Mt5GroupApproveResult> {
    const store = getExecutionGroupStore();
    const group = store.get(groupId);
    if (!group) return { ok: false, results: [], group: null, error: "Group not found" };
    if (group.mode === "scale-out") {
      return { ok: true, results: [], group, error: null };
    }
    if (group.status === "completed" || group.status === "cancelled") {
      return { ok: false, results: [], group, error: `Group is already ${group.status}` };
    }

    const results: Mt5GroupLegTransmitResult[] = [];
    let allOk = true;
    for (let i = 0; i < group.legs.length; i++) {
      const leg = group.legs[i];
      if (leg.status === "filled" || leg.status === "cancelled" || leg.status === "rejected") {
        results.push({ index: i, ok: false, skipped: true, ticket: leg.ticket, status: leg.status, error: null, confirmation: null });
        continue;
      }
      const proposalId = leg.proposalId;
      if (!proposalId) {
        allOk = false;
        results.push({ index: i, ok: false, ticket: null, status: "rejected", error: "No proposal for leg", confirmation: null });
        continue;
      }
      const decided = getManualApprovalLayer().decide(proposalId, "approve", note);
      if (!decided.ok) {
        allOk = false;
        results.push({ index: i, ok: false, ticket: null, status: "rejected", error: decided.error ?? "Could not approve leg", confirmation: null });
        continue;
      }
      const transmitted = await this.transmit(proposalId, groupId, i);
      results.push(transmitted);
      if (!transmitted.ok) allOk = false;
    }

    const finalStatus = allOk ? "active" : group.legs.every((l) => l.status === "rejected" || l.status === "cancelled") ? "failed" : "completed";
    store.setStatus(groupId, finalStatus);
    return { ok: true, results, group: store.get(groupId), error: null };
  }

  /** Cancel the whole group before/after approval — never transmits. */
  async cancelGroup(groupId: string, note?: string | null): Promise<Mt5GroupActionResult> {
    const store = getExecutionGroupStore();
    const group = store.get(groupId);
    if (!group) return { ok: false, group: null, error: "Group not found" };
    if (group.status === "completed") return { ok: false, group, error: "Group already completed" };

    const approvals = getManualApprovalLayer();
    for (const leg of group.legs) {
      if (leg.proposalId && approvals.get(leg.proposalId)?.status === "pending") {
        approvals.decide(leg.proposalId, "reject", note ?? "Group cancelled");
        store.updateLeg(groupId, group.legs.indexOf(leg), (l) => {
          l.status = "cancelled";
          l.error = null;
        });
        getExecutionEventStore().record({
          stage: "cancelled",
          proposalId: leg.proposalId,
          symbol: leg.symbol,
          orderType: leg.type,
          volume: leg.volume,
          price: leg.price,
          sl: leg.sl,
          tp: leg.tp,
          result: "cancelled",
          error: note ?? null,
        });
      }
    }
    store.setStatus(groupId, "cancelled");
    return { ok: true, group: store.get(groupId), error: null };
  }

  /* ── OCO reconciliation ── */

  /**
   * Reconciliation runs on each synchronization cycle (no per-second
   * polling). If one side of an active OCO is no longer pending on the
   * broker (filled / expired / cancelled), the sibling is cancelled.
   */
  async reconcileGroups(): Promise<Mt5ReconcileResult> {
    const gateway = getMt5Gateway();
    const store = getExecutionGroupStore();
    if (!gateway.isConnected()) return { checked: 0, cancelledLegs: [], completedGroups: [] };

    const ordersRes = await gateway.getOrders();
    const pendingOrders = ordersRes.ok ? (ordersRes.data ?? []) : [];
    const pendingTickets = new Set(pendingOrders.map((o) => o.ticket));

    const candidates = store
      .list()
      .filter((g) => g.status === "active")
      .filter((g) => g.mode === "oco" || g.mode === "bracket" || g.mode === "scale-in" || g.mode === "basket");

    let cancelledLegs: string[] = [];
    const completedGroups: string[] = [];

    for (const group of candidates) {
      const legTickets = group.legs.map((l) => l.ticket).filter((t): t is number => t != null);
      if (legTickets.length === 0) continue;

      const stillPending = legTickets.filter((t) => pendingTickets.has(t));
      const gone = legTickets.filter((t) => !pendingTickets.has(t));

      if (group.mode === "oco" && gone.length > 0 && stillPending.length > 0) {
        for (const ticket of stillPending) {
          await gateway.cancelOrder(ticket);
          cancelledLegs.push(String(ticket));
        }
        store.setStatus(group.id, "completed");
        completedGroups.push(group.id);
        getMt5Logger().log(
          "execution",
          `OCO reconciled — sibling cancelled`,
          `Order #${stillPending.join(", #")} cancelled after #${gone.join(", #")} left the broker`,
          { groupId: group.id }
        );
      } else if (gone.length === legTickets.length) {
        if (group.status === "active") {
          store.setStatus(group.id, "completed");
          completedGroups.push(group.id);
        }
      }
    }
    return { checked: candidates.length, cancelledLegs, completedGroups };
  }

  /* ── Group read views ── */

  getGroups(count = 100): Mt5ExecutionGroup[] {
    return getExecutionGroupStore().list(count);
  }

  getGroup(id: string): Mt5ExecutionGroup | null {
    return getExecutionGroupStore().get(id);
  }

  /* ── Single-leg transmit (shared by group approval) ── */

  private async transmit(
    proposalId: string,
    groupId: string,
    legIndex: number
  ): Promise<Mt5GroupLegTransmitResult> {
    const gateway = getMt5Gateway();
    const approvals = getManualApprovalLayer();
    const confirmations = getExecutionConfirmationEngine();
    const events = getExecutionEventStore();
    const store = getExecutionGroupStore();

    const proposal = approvals.get(proposalId);
    if (!proposal) {
      return { index: legIndex, ok: false, ticket: null, status: "rejected", error: "Proposal not found", confirmation: null };
    }
    const request = proposal.request;

    /* Final validation immediately before transmission. */
    const finalValidation = await getExecutionEngine().validate(request, {
      account: getAccountSynchronizer().getState(),
      positions: getPositionSynchronizer().getState(),
    });
    if (!finalValidation.passed) {
      const confirmation = confirmations.record({
        requestId: request.requestId,
        proposalId,
        ticket: null,
        fillPrice: null,
        brokerMessage: `Final validation blocked transmission: ${finalValidation.blockedReasons.join("; ")}`,
        status: "rejected",
        requestedPrice: request.price,
        symbol: request.symbol,
        volume: request.volume,
        orderType: request.type,
        sl: request.sl,
        tp: request.tp,
        rejectionReason: finalValidation.blockedReasons.join("; "),
      });
      approvals.addConfirmation(proposalId, confirmation);
      events.record({
        stage: "failed",
        proposalId,
        symbol: request.symbol,
        orderType: request.type,
        volume: request.volume,
        price: request.price,
        sl: request.sl,
        tp: request.tp,
        result: "blocked",
        error: finalValidation.blockedReasons.join("; ") || null,
      });
      store.updateLeg(groupId, legIndex, (l) => {
        l.status = "rejected";
        l.error = finalValidation.blockedReasons.join("; ") || null;
      });
      return { index: legIndex, ok: false, ticket: null, status: "rejected", error: finalValidation.blockedReasons.join("; "), confirmation };
    }

    if (!gateway.isConnected()) {
      const confirmation = confirmations.record({
        requestId: request.requestId,
        proposalId,
        ticket: null,
        fillPrice: null,
        brokerMessage: "MT5 gateway not connected — leg prepared but NOT transmitted",
        status: "unavailable",
        requestedPrice: request.price,
        symbol: request.symbol,
        volume: request.volume,
        orderType: request.type,
        sl: request.sl,
        tp: request.tp,
        rejectionReason: "MT5 gateway not connected",
      });
      approvals.addConfirmation(proposalId, confirmation);
      store.updateLeg(groupId, legIndex, (l) => {
        l.status = "rejected";
        l.error = "MT5 gateway not connected";
      });
      return { index: legIndex, ok: false, ticket: null, status: "rejected", error: "MT5 gateway not connected", confirmation };
    }

    const started = Date.now();
    const spreadTick = await gateway.getTick(request.symbol);
    const spread = spreadTick.ok ? (spreadTick.data?.spread ?? null) : null;
    events.record({
      stage: "sent",
      proposalId,
      symbol: request.symbol,
      orderType: request.type,
      volume: request.volume,
      price: request.price,
      sl: request.sl,
      tp: request.tp,
      result: "sent",
      error: null,
    });
    const result = await gateway.placeOrder(request);
    const latency = Date.now() - started;
    const transmitted = result.data?.ticket != null;
    const status = transmitted ? (result.data?.error == null ? "submitted" : "failed") : "rejected";
    const confirmation = confirmations.record({
      requestId: request.requestId,
      proposalId,
      ticket: result.data?.ticket ?? null,
      fillPrice: result.data?.price ?? null,
      brokerMessage: result.data?.message ?? result.error ?? "Leg transmitted",
      status,
      requestedPrice: request.price,
      symbol: request.symbol,
      volume: request.volume,
      orderType: request.type,
      sl: request.sl,
      tp: request.tp,
      rejectionReason: result.error,
      spread,
      latencyMs: latency,
    });
    approvals.addConfirmation(proposalId, confirmation);
    events.record({
      stage: transmitted && result.data?.error == null ? "accepted" : "failed",
      proposalId,
      ticket: result.data?.ticket ?? null,
      symbol: request.symbol,
      orderType: request.type,
      volume: request.volume,
      price: result.data?.price ?? request.price,
      sl: request.sl,
      tp: request.tp,
      result: transmitted && result.data?.error == null ? "accepted" : "rejected",
      error: result.data?.error ?? result.error,
      latencyMs: latency,
    });
    store.updateLeg(groupId, legIndex, (l) => {
      l.ticket = result.data?.ticket ?? null;
      l.status = transmitted && result.data?.error == null ? "transmitted" : "rejected";
      l.error = result.data?.error ?? result.error;
    });
    return {
      index: legIndex,
      ok: transmitted && result.data?.error == null,
      ticket: result.data?.ticket ?? null,
      status,
      error: result.data?.error ?? result.error,
      confirmation,
    };
  }
}

export function getInstitutionalOrderEngine(): InstitutionalOrderEngine {
  return getSharedSingleton("Mt5InstitutionalOrderEngine", () => new InstitutionalOrderEngine());
}
