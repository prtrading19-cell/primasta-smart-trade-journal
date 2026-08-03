"use client";

import { Server } from "lucide-react";
import type { BrokerHealth } from "@/lib/trading";
import type { BrokerSummary } from "./types";
import { PanelShell, StatusBadge } from "./primitives";

export function BrokerStatusPanel({
  brokers,
  health,
}: {
  brokers: BrokerSummary[];
  health: Record<string, BrokerHealth>;
}) {
  return (
    <PanelShell eyebrow="Connectivity" title="Broker Status" icon={Server} badge={<span className="text-[10px] text-text-muted">{brokers.length} registered</span>}>
      {brokers.length === 0 ? (
        <p className="text-xs text-text-muted">No brokers registered. Paper broker is created on first use.</p>
      ) : (
        <div className="space-y-2.5">
          {brokers.map((b) => {
            const h = health[b.id];
            return (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-panel/40 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${h?.status === "healthy" ? "bg-profit" : h?.status === "degraded" ? "bg-warning" : "bg-loss"}`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text-primary">{b.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">
                      {b.mode} · {b.connected ? "connected" : "disconnected"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {h && (
                    <span className="text-[10px] text-text-muted">
                      {h.latencyMs >= 0 ? `${h.latencyMs}ms` : "—"}
                    </span>
                  )}
                  <StatusBadge status={h?.status ?? "down"} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}
