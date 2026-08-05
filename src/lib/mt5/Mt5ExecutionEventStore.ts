import type { Mt5ExecutionEvent } from "./types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getMt5Logger } from "./Mt5Logger";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

let eventCounter = 0;

/**
 * Immutable execution audit trail.
 *
 * Every stage of the trade lifecycle (proposal created → validated →
 * approved → sent → accepted/executed/failed) is appended here with the
 * operator identity, account, symbol, order parameters, latency and result.
 * Records are never mutated or deleted. A best-effort copy is written to the
 * `execution_events` Supabase table when configured; the in-memory trail is
 * authoritative so the terminal keeps working fully offline.
 */
export class Mt5ExecutionEventStore {
  private events: Mt5ExecutionEvent[] = [];
  private maxMemory = 2000;

  record(input: {
    stage: Mt5ExecutionEvent["stage"];
    proposalId?: string | null;
    ticket?: number | null;
    dealId?: number | null;
    user?: string | null;
    account?: string | null;
    symbol: string;
    orderType: string;
    volume: number;
    price?: number | null;
    sl?: number | null;
    tp?: number | null;
    result: string;
    error?: string | null;
    latencyMs?: number | null;
  }): Mt5ExecutionEvent {
    eventCounter += 1;
    const event: Mt5ExecutionEvent = {
      id: `EVT-${Date.now()}-${eventCounter}`,
      at: new Date().toISOString(),
      stage: input.stage,
      proposalId: input.proposalId ?? null,
      ticket: input.ticket ?? null,
      dealId: input.dealId ?? null,
      user: input.user ?? "operator",
      account: input.account ?? "mt5",
      symbol: input.symbol,
      orderType: input.orderType,
      volume: input.volume,
      price: input.price ?? null,
      sl: input.sl ?? null,
      tp: input.tp ?? null,
      result: input.result,
      error: input.error ?? null,
      latencyMs: input.latencyMs ?? null,
    };
    this.events.unshift(event);
    if (this.events.length > this.maxMemory) {
      this.events.length = this.maxMemory;
    }
    void this.persist(event);
    return { ...event };
  }

  private async persist(event: Mt5ExecutionEvent): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase.from("execution_events").insert({ ...event });
    } catch {
      /* Best effort — the in-memory trail remains authoritative. */
    }
  }

  list(count = 200): Mt5ExecutionEvent[] {
    return this.events.slice(0, count).map((e) => ({ ...e }));
  }

  getByProposal(proposalId: string): Mt5ExecutionEvent[] {
    return this.events.filter((e) => e.proposalId === proposalId).map((e) => ({ ...e }));
  }

  clear(): void {
    this.events = [];
  }

  getTotalRecorded(): number {
    return this.events.length;
  }
}

export function getExecutionEventStore(): Mt5ExecutionEventStore {
  return getSharedSingleton("Mt5ExecutionEventStore", () => new Mt5ExecutionEventStore());
}
