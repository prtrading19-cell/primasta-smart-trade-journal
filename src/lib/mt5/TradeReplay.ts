import type { Mt5ExecutionConfirmation, Mt5ReplaySession, Mt5ReplayStep } from "./types";
import { getExecutionEventStore } from "./Mt5ExecutionEventStore";
import { getExecutionConfirmationEngine } from "./ExecutionConfirmation";
import { getManualApprovalLayer } from "./ManualApprovalLayer";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

function toMs(value: string): number | null {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Trade replay (feature H). Reconstructs the complete execution lifecycle of
 * a proposal — or the whole trade history — from the immutable audit trail
 * and broker confirmations. Every step is real recorded data; nothing is
 * synthesized.
 */
export class TradeReplay {
  listSessions(count = 100): Mt5ReplaySession[] {
    const events = getExecutionEventStore().list(count * 3);
    const byProposal = new Map<string, ReturnType<typeof getExecutionEventStore>["getByProposal"]>();
    const proposalIds = new Set<string>();
    for (const e of events) {
      if (e.proposalId) proposalIds.add(e.proposalId);
    }
    const sessions: Mt5ReplaySession[] = [];
    for (const id of proposalIds) {
      if (sessions.length >= count) break;
      const session = this.buildByProposal(id);
      if (session) sessions.push(session);
    }
    void byProposal;
    return sessions;
  }

  buildByProposal(proposalId: string | null): Mt5ReplaySession | null {
    const events = proposalId
      ? getExecutionEventStore().getByProposal(proposalId)
      : getExecutionEventStore().list(500);
    if (events.length === 0) return null;

    const confirmations: Mt5ExecutionConfirmation[] = proposalId
      ? getExecutionConfirmationEngine().getByProposal(proposalId)
      : getExecutionConfirmationEngine().getRecent(100);

    const proposal = proposalId ? getManualApprovalLayer().get(proposalId) : null;
    const symbol = proposal?.request.symbol ?? events[0]?.symbol ?? "—";
    const orderType = proposal?.request.type ?? events[0]?.orderType ?? "—";
    const volume = proposal?.request.volume ?? events[0]?.volume ?? 0;

    const first = events[events.length - 1];
    const last = events[0];
    const chrono = [...events].reverse();
    const steps: Mt5ReplayStep[] = chrono.map((e, index) => {
      const prev = index > 0 ? chrono[index - 1] : null;
      const prevTime = prev ? toMs(prev.at) : null;
      const curTime = toMs(e.at);
      return {
        index,
        stage: e.stage,
        at: e.at,
        result: e.result,
        error: e.error,
        latencyMs: e.latencyMs,
        price: e.price,
        ticket: e.ticket,
        deltaMs:
          prevTime != null && curTime != null && curTime >= prevTime
            ? curTime - prevTime
            : null,
      };
    });

    const startedAt = first ? first.at : null;
    const endedAt = last ? last.at : null;
    const startT = startedAt ? toMs(startedAt) : null;
    const endT = endedAt ? toMs(endedAt) : null;

    const confirmMessage = confirmations[0]?.brokerMessage ?? null;
    const fillPrice = confirmations[0]?.fillPrice ?? last?.price ?? null;

    return {
      id: proposalId ?? `session-${Date.now()}`,
      proposalId,
      symbol,
      orderType,
      volume,
      steps,
      startedAt,
      endedAt,
      totalDurationMs: startT != null && endT != null ? endT - startT : null,
      result: last?.result ?? confirmMessage ?? "unknown",
    };
  }
}

export function getTradeReplay(): TradeReplay {
  return getSharedSingleton("Mt5TradeReplay", () => new TradeReplay());
}
