"use client";

import { Activity } from "lucide-react";
import type { Mt5ExecutionEvent } from "@/lib/mt5/types";
import { PanelShell } from "@/components/trading/primitives";
import { formatTime } from "@/components/institutional/primitives";
import { cn } from "@/lib/format";

function toneForStage(stage: Mt5ExecutionEvent["stage"]): "profit" | "loss" | "warning" | "neutral" {
  if (stage === "executed" || stage === "accepted" || stage === "approved" || stage === "proposal-created") return "profit";
  if (stage === "failed" || stage === "rejected" || stage === "cancelled") return "loss";
  if (stage === "sent" || stage === "validated" || stage === "closed" || stage === "modified") return "warning";
  return "neutral";
}

export function Mt5ExecutionTimeline({ events }: { events: Mt5ExecutionEvent[] }) {
  return (
    <PanelShell
      eyebrow="Immutable Audit Trail"
      title="Execution Timeline"
      icon={Activity}
      badge={<span className="text-[10px] text-text-muted">{events.length} events</span>}
    >
      {events.length === 0 ? (
        <p className="text-xs text-text-muted">
          No execution events yet. Every proposal, approval, transmission, and position action is recorded here.
        </p>
      ) : (
        <div className="max-h-96 space-y-0 overflow-auto pr-1">
          {events.slice(0, 100).map((e, i) => (
            <div key={e.id} className="relative flex gap-3 pb-4">
              {i < Math.min(events.length - 1, 99) && (
                <span className="absolute left-[5px] top-4 h-full w-px bg-border-subtle" />
              )}
              <span
                className={cn(
                  "relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-surface-card",
                  toneForStage(e.stage) === "profit" && "bg-profit",
                  toneForStage(e.stage) === "loss" && "bg-loss",
                  toneForStage(e.stage) === "warning" && "bg-warning",
                  toneForStage(e.stage) === "neutral" && "bg-text-muted"
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold">{e.stage}</span>
                  <span className="text-[10px] text-text-muted">{formatTime(e.at)}</span>
                  {e.ticket != null && <span className="text-[10px] text-text-muted">ticket #{e.ticket}</span>}
                </div>
                <p className="mt-0.5 text-xs font-bold text-text-primary">
                  {e.symbol} {e.orderType} {e.volume}
                </p>
                <p className={cn("truncate text-[11px]", e.error ? "text-loss" : "text-text-muted")}>
                  {e.result}
                  {e.error ? ` — ${e.error}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
