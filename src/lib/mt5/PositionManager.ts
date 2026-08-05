import type {
  Mt5BulkCloseResult,
  Mt5CloseRequest,
  Mt5ModifyRequest,
  Mt5Order,
  Mt5PlaceRequest,
  Mt5Position,
  Mt5PositionActionResult,
  Mt5RawResult,
} from "./types";
import { getMt5Gateway } from "./Mt5Gateway";
import { getPositionSynchronizer } from "./PositionSynchronizer";
import { getMt5Logger } from "./Mt5Logger";
import { getExecutionEventStore } from "./Mt5ExecutionEventStore";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

export type Mt5PartialCloseFraction = 0.25 | 0.5 | 0.75 | 1;

export type Mt5CloseAllFilter = "all" | "buy" | "sell" | "winners" | "losers";

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Direct position & pending-order management.
 *
 * These actions are performed only after the live connection gate passes and
 * every result (success or broker rejection) is written to the immutable
 * execution audit trail. No estimate is ever used — prices come from the
 * gateway's live market price resolver and lot fractions are aligned to the
 * symbol's live volume step.
 */
export class PositionManager {
  private async gateConnection(): Promise<string | null> {
    const gateway = getMt5Gateway();
    if (!gateway.isConnected()) return "MT5 terminal is not connected";
    return null;
  }

  private async findPosition(ticket: number): Promise<Mt5Position | null> {
    const gateway = getMt5Gateway();
    const res = await gateway.getPositions();
    if (!res.ok || !res.data) return null;
    return res.data.find((p) => p.ticket === ticket) ?? null;
  }

  private async findPending(ticket: number): Promise<Mt5Order | null> {
    const gateway = getMt5Gateway();
    const res = await gateway.getOrders();
    if (!res.ok || !res.data) return null;
    return res.data.find((o) => o.ticket === ticket && o.state === "pending") ?? null;
  }

  private async logEvent(input: {
    stage: "closed" | "modified" | "cancelled" | "executed" | "failed";
    ticket?: number | null;
    symbol: string;
    orderType: string;
    volume: number;
    price?: number | null;
    sl?: number | null;
    tp?: number | null;
    result: string;
    error?: string | null;
    latencyMs?: number | null;
  }): Promise<void> {
    getExecutionEventStore().record({ ...input, stage: input.stage });
  }

  private result(raw: Mt5RawResult, ticket: number | null): Mt5PositionActionResult {
    return {
      ticket: raw.ticket ?? ticket,
      price: raw.price,
      message: raw.message,
      error: raw.error,
    };
  }

  /* ── Positions ── */

  async close(ticket: number, volume?: number): Promise<Mt5PositionActionResult> {
    const gate = await this.gateConnection();
    if (gate) return { ticket, price: null, message: gate, error: gate };

    const position = await this.findPosition(ticket);
    if (!position) {
      const message = `Position ${ticket} not found`;
      void this.logEvent({ stage: "closed", ticket, symbol: "?", orderType: "close", volume: 0, result: "failed", error: message });
      return { ticket, price: null, message, error: message };
    }

    const started = Date.now();
    const res = await getMt5Gateway().closePosition({ ticket, volume });
    const latency = Date.now() - started;
    const ok = res.ok && res.data?.error == null;
    const targetVolume = volume ?? position.volume;
    void this.logEvent({
      stage: ok ? "closed" : "failed",
      ticket,
      symbol: position.symbol,
      orderType: "close",
      volume: targetVolume,
      price: res.data?.price ?? null,
      result: ok ? "accepted" : "failed",
      error: res.data?.error ?? res.error,
      latencyMs: latency,
    });
    getMt5Logger().log(
      "execution",
      ok ? `Position ${ticket} closed` : `Position ${ticket} close failed`,
      `${targetVolume} ${position.symbol} @ ${res.data?.price ?? "—"}${res.data?.error ? ` — ${res.data.error}` : ""}`,
      { ticket, symbol: position.symbol, ok }
    );
    return this.result(res.data ?? { ticket: null, price: null, message: res.error ?? "Close failed", error: res.error }, ticket);
  }

  async partialClose(ticket: number, fraction: Mt5PartialCloseFraction): Promise<Mt5PositionActionResult> {
    const gate = await this.gateConnection();
    if (gate) return { ticket, price: null, message: gate, error: gate };

    const position = await this.findPosition(ticket);
    if (!position) {
      const message = `Position ${ticket} not found`;
      return { ticket, price: null, message, error: message };
    }

    const gateway = getMt5Gateway();
    const specRes = await gateway.getSymbolSpec(position.symbol);
    const step = specRes.ok && specRes.data ? specRes.data.volumeStep : 0.01;
    const digits = specRes.ok && specRes.data ? specRes.data.digits : 2;
    const raw = position.volume * fraction;
    const steps = Math.max(1, Math.floor(raw / step));
    const closeVolume = roundTo(steps * step, digits);

    const result = await this.close(ticket, closeVolume);
    return result;
  }

  async modifyPosition(ticket: number, sl: number | null, tp: number | null): Promise<Mt5PositionActionResult> {
    const gate = await this.gateConnection();
    if (gate) return { ticket, price: null, message: gate, error: gate };

    const position = await this.findPosition(ticket);
    if (!position) {
      const message = `Position ${ticket} not found`;
      return { ticket, price: null, message, error: message };
    }

    const started = Date.now();
    const res = await getMt5Gateway().modifyOrder({ ticket, sl, tp });
    const latency = Date.now() - started;
    const ok = res.ok && res.data?.error == null;
    void this.logEvent({
      stage: ok ? "modified" : "failed",
      ticket,
      symbol: position.symbol,
      orderType: "modify",
      volume: position.volume,
      sl,
      tp,
      result: ok ? "accepted" : "failed",
      error: res.data?.error ?? res.error,
      latencyMs: latency,
    });
    getMt5Logger().log(
      "execution",
      ok ? `Position ${ticket} SL/TP modified` : `Position ${ticket} modify failed`,
      `SL ${sl ?? "—"} / TP ${tp ?? "—"}${res.data?.error ? ` — ${res.data.error}` : ""}`,
      { ticket, symbol: position.symbol, ok }
    );
    return this.result(res.data ?? { ticket: null, price: null, message: res.error ?? "Modify failed", error: res.error }, ticket);
  }

  async breakEven(ticket: number, bufferPoints = 0): Promise<Mt5PositionActionResult> {
    const gate = await this.gateConnection();
    if (gate) return { ticket, price: null, message: gate, error: gate };

    const position = await this.findPosition(ticket);
    if (!position) {
      const message = `Position ${ticket} not found`;
      return { ticket, price: null, message, error: message };
    }
    const specRes = await getMt5Gateway().getSymbolSpec(position.symbol);
    const digits = specRes.ok && specRes.data ? specRes.data.digits : 2;
    const buffer = (specRes.ok && specRes.data ? specRes.data.point : 0.0001) * bufferPoints;
    const sl = roundTo(
      position.type === "buy" ? position.priceOpen + buffer : position.priceOpen - buffer,
      digits
    );
    return this.modifyPosition(ticket, sl, position.tp);
  }

  async trail(ticket: number, distancePoints: number): Promise<Mt5PositionActionResult> {
    const gate = await this.gateConnection();
    if (gate) return { ticket, price: null, message: gate, error: gate };

    const position = await this.findPosition(ticket);
    if (!position) {
      const message = `Position ${ticket} not found`;
      return { ticket, price: null, message, error: message };
    }
    const gateway = getMt5Gateway();
    const specRes = await gateway.getSymbolSpec(position.symbol);
    const spec = specRes.ok ? specRes.data : null;
    const digits = spec?.digits ?? 2;
    const distance = (spec?.point ?? 0.0001) * distancePoints;
    const newSl =
      position.type === "buy"
        ? roundTo(Math.max(position.sl || position.priceCurrent - distance, position.priceCurrent - distance), digits)
        : roundTo(
            position.sl > 0
              ? Math.min(position.sl, position.priceCurrent + distance)
              : position.priceCurrent + distance,
            digits
          );
    if (position.sl > 0 && Math.abs(position.sl - newSl) < 1e-10) {
      return { ticket, price: null, message: "Trailing stop already at optimum", error: null };
    }
    return this.modifyPosition(ticket, newSl, position.tp);
  }

  async reverse(ticket: number): Promise<Mt5PositionActionResult> {
    const gate = await this.gateConnection();
    if (gate) return { ticket, price: null, message: gate, error: gate };

    const position = await this.findPosition(ticket);
    if (!position) {
      const message = `Position ${ticket} not found`;
      return { ticket, price: null, message, error: message };
    }

    const closeResult = await this.close(ticket);
    if (closeResult.error) return closeResult;

    const oppositeType = position.type === "buy" ? "sell" : "buy";
    const request: Mt5PlaceRequest = {
      requestId: `rev-${Date.now()}`,
      sourceSignalId: null,
      symbol: position.symbol,
      type: oppositeType,
      volume: position.volume,
      price: null,
      sl: null,
      tp: null,
      magic: position.magic,
      deviation: 20,
      comment: "PRIMASTA reverse",
      riskPercent: null,
      source: "manual",
    };
    const res = await getMt5Gateway().placeOrder(request);
    const ok = res.ok && res.data?.error == null;
    void this.logEvent({
      stage: ok ? "executed" : "failed",
      ticket: res.data?.ticket ?? null,
      symbol: position.symbol,
      orderType: oppositeType,
      volume: position.volume,
      price: res.data?.price ?? null,
      result: ok ? "accepted" : "failed",
      error: res.data?.error ?? res.error,
    });
    return this.result(res.data ?? { ticket: null, price: null, message: res.error ?? "Reverse failed", error: res.error }, null);
  }

  async duplicate(ticket: number): Promise<Mt5PositionActionResult> {
    const gate = await this.gateConnection();
    if (gate) return { ticket, price: null, message: gate, error: gate };

    const position = await this.findPosition(ticket);
    if (!position) {
      const message = `Position ${ticket} not found`;
      return { ticket, price: null, message, error: message };
    }

    const request: Mt5PlaceRequest = {
      requestId: `dup-${Date.now()}`,
      sourceSignalId: null,
      symbol: position.symbol,
      type: position.type,
      volume: position.volume,
      price: null,
      sl: position.sl || null,
      tp: position.tp || null,
      magic: position.magic,
      deviation: 20,
      comment: "PRIMASTA duplicate",
      riskPercent: null,
      source: "manual",
    };
    const res = await getMt5Gateway().placeOrder(request);
    const ok = res.ok && res.data?.error == null;
    void this.logEvent({
      stage: ok ? "executed" : "failed",
      ticket: res.data?.ticket ?? null,
      symbol: position.symbol,
      orderType: position.type,
      volume: position.volume,
      price: res.data?.price ?? null,
      sl: request.sl,
      tp: request.tp,
      result: ok ? "accepted" : "failed",
      error: res.data?.error ?? res.error,
    });
    return this.result(res.data ?? { ticket: null, price: null, message: res.error ?? "Duplicate failed", error: res.error }, null);
  }

  async closeAll(filter: Mt5CloseAllFilter = "all"): Promise<Mt5BulkCloseResult> {
    const gate = await this.gateConnection();
    if (gate) return { requested: 0, closed: 0, failed: 0, results: [], error: gate };

    const gateway = getMt5Gateway();
    const res = await gateway.getPositions();
    const positions = res.ok ? (res.data ?? []) : [];
    const targets = positions.filter((p) => {
      if (filter === "buy") return p.type === "buy";
      if (filter === "sell") return p.type === "sell";
      if (filter === "winners") return p.profit > 0;
      if (filter === "losers") return p.profit < 0;
      return true;
    });

    const results: Mt5PositionActionResult[] = [];
    let closed = 0;
    let failed = 0;
    for (const p of targets) {
      const result = await this.close(p.ticket);
      results.push(result);
      if (result.error) failed += 1;
      else closed += 1;
    }
    getMt5Logger().log(
      "execution",
      `Close all (${filter})`,
      `${closed} closed, ${failed} failed of ${targets.length} targeted`,
      { filter, closed, failed }
    );
    return { requested: targets.length, closed, failed, results, error: null };
  }

  /* ── Pending orders ── */

  async modifyPending(ticket: number, price: number | null, sl: number | null, tp: number | null): Promise<Mt5PositionActionResult> {
    const gate = await this.gateConnection();
    if (gate) return { ticket, price: null, message: gate, error: gate };

    const order = await this.findPending(ticket);
    if (!order) {
      const message = `Pending order ${ticket} not found`;
      return { ticket, price: null, message, error: message };
    }

    const started = Date.now();
    const res = await getMt5Gateway().modifyOrder({ ticket, sl, tp, price });
    const latency = Date.now() - started;
    const ok = res.ok && res.data?.error == null;
    void this.logEvent({
      stage: ok ? "modified" : "failed",
      ticket,
      symbol: order.symbol,
      orderType: order.type,
      volume: order.volume,
      price: price ?? order.priceOpen,
      sl,
      tp,
      result: ok ? "accepted" : "failed",
      error: res.data?.error ?? res.error,
      latencyMs: latency,
    });
    return this.result(res.data ?? { ticket: null, price: null, message: res.error ?? "Modify failed", error: res.error }, ticket);
  }

  async deletePending(ticket: number): Promise<Mt5PositionActionResult> {
    const gate = await this.gateConnection();
    if (gate) return { ticket, price: null, message: gate, error: gate };

    const order = await this.findPending(ticket);
    if (!order) {
      const message = `Pending order ${ticket} not found`;
      return { ticket, price: null, message, error: message };
    }

    const started = Date.now();
    const res = await getMt5Gateway().cancelOrder(ticket);
    const latency = Date.now() - started;
    const ok = res.ok && res.data?.error == null;
    void this.logEvent({
      stage: ok ? "cancelled" : "failed",
      ticket,
      symbol: order.symbol,
      orderType: order.type,
      volume: order.volume,
      price: order.priceOpen,
      result: ok ? "accepted" : "failed",
      error: res.data?.error ?? res.error,
      latencyMs: latency,
    });
    return this.result(res.data ?? { ticket: null, price: null, message: res.error ?? "Delete failed", error: res.error }, ticket);
  }

  /** Convert a pending order into an immediate market order. */
  async activatePending(ticket: number): Promise<Mt5PositionActionResult> {
    const gate = await this.gateConnection();
    if (gate) return { ticket, price: null, message: gate, error: gate };

    const order = await this.findPending(ticket);
    if (!order) {
      const message = `Pending order ${ticket} not found`;
      return { ticket, price: null, message, error: message };
    }

    const marketType = order.type === "sell-limit" || order.type === "sell-stop" || order.type === "sell-stop-limit" ? "sell" : "buy";
    const request: Mt5PlaceRequest = {
      requestId: `act-${Date.now()}`,
      sourceSignalId: null,
      symbol: order.symbol,
      type: marketType,
      volume: order.volume,
      price: null,
      sl: order.sl || null,
      tp: order.tp || null,
      magic: order.magic,
      deviation: 20,
      comment: "PRIMASTA activate",
      riskPercent: null,
      source: "manual",
    };
    const res = await getMt5Gateway().placeOrder(request);
    const ok = res.ok && res.data?.error == null;
    if (ok) {
      await this.deletePending(ticket);
    }
    void this.logEvent({
      stage: ok ? "executed" : "failed",
      ticket: res.data?.ticket ?? null,
      symbol: order.symbol,
      orderType: marketType,
      volume: order.volume,
      price: res.data?.price ?? null,
      sl: request.sl,
      tp: request.tp,
      result: ok ? "accepted" : "failed",
      error: res.data?.error ?? res.error,
    });
    return this.result(res.data ?? { ticket: null, price: null, message: res.error ?? "Activate failed", error: res.error }, null);
  }
}

export function getPositionManager(): PositionManager {
  return getSharedSingleton("Mt5PositionManager", () => new PositionManager());
}
