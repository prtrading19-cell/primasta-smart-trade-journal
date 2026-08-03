import type {
  Mt5ExecutionConfirmation,
  Mt5PlaceRequest,
  Mt5ProposalSource,
  Mt5ProposalStatus,
  Mt5SafetyResult,
  Mt5TradeProposal,
} from "./types";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

let proposalCounter = 0;

export class ManualApprovalLayer {
  private proposals: Mt5TradeProposal[] = [];
  private maxStored = 500;
  private expiryMinutes = 60 * 6;

  create(input: {
    request: Mt5PlaceRequest;
    signalId: string | null;
    source: Mt5ProposalSource;
    safety: Mt5SafetyResult;
  }): Mt5TradeProposal {
    proposalCounter += 1;
    const now = new Date().toISOString();
    const proposal: Mt5TradeProposal = {
      id: `PROPOSAL-${Date.now()}-${proposalCounter}`,
      requestId: input.request.requestId,
      signalId: input.signalId,
      request: { ...input.request },
      source: input.source,
      status: "pending",
      safety: input.safety,
      confirmations: [],
      createdAt: now,
      updatedAt: now,
      decidedAt: null,
      approvalNote: null,
    };
    this.proposals.unshift(proposal);
    this.prune();
    return { ...proposal, request: { ...proposal.request }, safety: { ...proposal.safety }, confirmations: [...proposal.confirmations] };
  }

  get(id: string): Mt5TradeProposal | null {
    const p = this.proposals.find((x) => x.id === id);
    return p ? this.clone(p) : null;
  }

  list(filter?: Mt5ProposalStatus | "all"): Mt5TradeProposal[] {
    const all = filter && filter !== "all"
      ? this.proposals.filter((p) => p.status === filter)
      : this.proposals;
    return all.map((p) => this.clone(p));
  }

  pending(): Mt5TradeProposal[] {
    return this.list("pending");
  }

  decide(
    id: string,
    decision: "approve" | "reject",
    note?: string | null
  ): { ok: boolean; proposal: Mt5TradeProposal | null; error: string | null } {
    const proposal = this.proposals.find((p) => p.id === id);
    if (!proposal) return { ok: false, proposal: null, error: "Proposal not found" };
    if (proposal.status !== "pending") {
      return { ok: false, proposal: this.clone(proposal), error: `Proposal is already ${proposal.status}` };
    }

    proposal.status = decision === "approve" ? "approved" : "rejected";
    proposal.decidedAt = new Date().toISOString();
    proposal.approvalNote = note ?? null;
    proposal.updatedAt = new Date().toISOString();
    return { ok: true, proposal: this.clone(proposal), error: null };
  }

  addConfirmation(proposalId: string, confirmation: Mt5ExecutionConfirmation): boolean {
    const proposal = this.proposals.find((p) => p.id === proposalId);
    if (!proposal) return false;
    const exists = proposal.confirmations.some((c) => c.id === confirmation.id);
    if (!exists) {
      proposal.confirmations.push({ ...confirmation });
      proposal.updatedAt = new Date().toISOString();
    }
    return true;
  }

  setStatus(id: string, status: Mt5ProposalStatus): boolean {
    const proposal = this.proposals.find((p) => p.id === id);
    if (!proposal) return false;
    proposal.status = status;
    proposal.updatedAt = new Date().toISOString();
    if (status === "approved" || status === "rejected" || status === "cancelled") {
      proposal.decidedAt = proposal.decidedAt ?? new Date().toISOString();
    }
    return true;
  }

  cancelExpired(): number {
    const cutoff = Date.now() - this.expiryMinutes * 60 * 1000;
    let cancelled = 0;
    for (const p of this.proposals) {
      if (p.status === "pending" && new Date(p.createdAt).getTime() < cutoff) {
        p.status = "expired";
        p.updatedAt = new Date().toISOString();
        cancelled += 1;
      }
    }
    return cancelled;
  }

  private prune(): void {
    if (this.proposals.length > this.maxStored) {
      this.proposals.length = this.maxStored;
    }
  }

  private clone(p: Mt5TradeProposal): Mt5TradeProposal {
    return {
      ...p,
      request: { ...p.request },
      safety: {
        ...p.safety,
        checks: p.safety.checks.map((c) => ({ ...c })),
        blockedReasons: [...p.safety.blockedReasons],
        warnings: [...p.safety.warnings],
      },
      confirmations: [...p.confirmations],
    };
  }
}

export function getManualApprovalLayer(): ManualApprovalLayer {
  return getSharedSingleton("Mt5ManualApprovalLayer", () => new ManualApprovalLayer());
}
