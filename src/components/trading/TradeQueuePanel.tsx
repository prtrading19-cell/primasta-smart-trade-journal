"use client";

import { ListOrdered } from "lucide-react";
import type { ExecutionRecord } from "@/lib/trading";
import { PanelShell, StatusBadge } from "./primitives";
import { formatTime } from "@/components/institutional/primitives";

export function TradeQueuePanel({ records }: { records: ExecutionRecord[] }) {
  const queue = records.filter((r) =>
    ["pending", "validated", "built", "sent"].includes(r.status)
  );

  return (
    <PanelShell
      eyebrow="Pipeline"
      title="Trade Queue"
      icon={ListOrdered}
      badge={
        <span className="flex items-center gap-1.5 rounded-full bg-surface-panel px-2.5 py-1 text-[10px] font-bold text-text-primary">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
          {queue.length} in flight
        </span>
      }
    >
      {queue.length === 0 ? (
        <p className="text-xs text-text-muted">Queue is clear. Execute a signal to place orders into the pipeline.</p>
      ) : (
        <div className="space-y-2">
          {queue.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-panel/40 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text-primary">
                  {r.symbol} · {r.direction}
                </p>
                <p className="text-[10px] text-text-muted">
                  {r.order?.lotSize != null ? `${r.order.lotSize} lots` : ""} · {formatTime(r.createdAt)}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
