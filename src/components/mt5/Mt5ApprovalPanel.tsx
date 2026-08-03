"use client";

import { ShieldCheck, ShieldX, UserCheck } from "lucide-react";
import type { Mt5ExecutionConfirmation, Mt5TradeProposal } from "@/lib/mt5/types";
import { PanelShell, StatusBadge, ToneBadge } from "@/components/trading/primitives";
import { formatTime } from "@/components/institutional/primitives";
import { cn } from "@/lib/format";

export function Mt5ApprovalPanel({
  proposals,
  confirmations,
  busy,
  onApprove,
  onReject,
}: {
  proposals: Mt5TradeProposal[];
  confirmations: Mt5ExecutionConfirmation[];
  busy: string | null;
  onApprove: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
}) {
  const pending = proposals.filter((p) => p.status === "pending");
  const decided = proposals.filter((p) => p.status !== "pending");

  return (
    <PanelShell
      eyebrow="Manual Approval Layer"
      title="Trade Proposals"
      icon={UserCheck}
      badge={<span className="text-[10px] text-text-muted">{pending.length} pending</span>}
    >
      <div className="space-y-4">
        <p className="text-[11px] leading-5 text-text-muted">
          No order is transmitted to the broker automatically. Every proposal below requires explicit operator
          approval before it reaches the MT5 gateway.
        </p>

        {pending.length === 0 ? (
          <p className="rounded-lg border border-border-subtle bg-surface-panel/40 px-4 py-3 text-xs text-text-muted">
            No proposals awaiting approval. Proposals are created from the Trade Execution page or the MT5 execute API.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => (
              <ProposalCard key={p.id} proposal={p} busy={busy === p.id} onApprove={() => onApprove(p.id)} onReject={() => onReject(p.id)} />
            ))}
          </div>
        )}

        {decided.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Recently Decided</p>
            <div className="space-y-2">
              {decided.slice(0, 5).map((p) => {
                const last = p.confirmations[p.confirmations.length - 1] ?? null;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-panel/40 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-text-primary">
                        {p.request.type} {p.request.volume} {p.request.symbol}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {p.id} · {formatTime(p.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {last && (
                        <ToneBadge
                          text={last.status}
                          tone={last.status === "filled" || last.status === "submitted" ? "profit" : last.status === "unavailable" ? "warning" : "loss"}
                        />
                      )}
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {confirmations.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Execution Confirmations</p>
            <div className="max-h-48 space-y-2 overflow-auto pr-1">
              {confirmations.slice(0, 8).map((c) => (
                <div key={c.id} className="rounded-lg border border-border-subtle bg-surface-panel/40 px-4 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-xs font-bold text-text-primary">
                      {c.symbol} {c.volume} {c.orderType}
                    </p>
                    <ToneBadge
                      text={c.status}
                      tone={c.status === "filled" || c.status === "submitted" ? "profit" : c.status === "unavailable" ? "warning" : "loss"}
                    />
                  </div>
                  <p className="mt-1 truncate text-[11px] text-text-muted">{c.brokerMessage}</p>
                  {c.rejectionReason && (
                    <p className="mt-0.5 text-[11px] text-loss">{c.rejectionReason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PanelShell>
  );
}

function ProposalCard({
  proposal,
  busy,
  onApprove,
  onReject,
}: {
  proposal: Mt5TradeProposal;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const blocked = proposal.safety.blockedReasons.length > 0;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-panel/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-text-primary">
              {proposal.request.type} {proposal.request.volume} {proposal.request.symbol}
            </p>
            <StatusBadge status={proposal.status} />
            <ToneBadge text={proposal.source} tone={proposal.source === "manual" ? "warning" : "profit"} />
          </div>
          <p className="mt-1 text-[10px] text-text-muted">
            {proposal.id} · created {formatTime(proposal.createdAt)}
            {proposal.signalId ? ` · signal ${proposal.signalId}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onApprove}
            disabled={busy}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40",
              blocked ? "bg-warning/10 text-warning hover:bg-warning/20" : "bg-profit/10 text-profit hover:bg-profit/20"
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {blocked ? "Approve (blocked)" : "Approve & Send"}
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-loss/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-loss transition-colors hover:bg-loss/20 disabled:opacity-40"
          >
            <ShieldX className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Spec label="Entry" value={proposal.request.price != null ? String(proposal.request.price) : "Market"} />
        <Spec label="Stop Loss" value={proposal.request.sl != null ? String(proposal.request.sl) : "—"} />
        <Spec label="Take Profit" value={proposal.request.tp != null ? String(proposal.request.tp) : "—"} />
        <Spec label="Risk" value={proposal.request.riskPercent != null ? `${proposal.request.riskPercent}%` : "—"} />
      </div>

      {blocked && (
        <div className="mt-3 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-warning">Safety blocks transmission</p>
          <ul className="mt-1 list-disc pl-4 text-[11px] leading-5 text-warning">
            {proposal.safety.blockedReasons.slice(0, 4).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {proposal.confirmations.length > 0 && (
        <p className="mt-2 text-[11px] text-text-muted">
          Last confirmation: {proposal.confirmations[proposal.confirmations.length - 1].brokerMessage}
        </p>
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-card px-2.5 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-0.5 truncate text-xs font-bold text-text-primary">{value}</p>
    </div>
  );
}
