"use client";

import { ScrollText } from "lucide-react";
import type { Mt5LogEntry } from "@/lib/mt5/types";
import { PanelShell } from "@/components/trading/primitives";
import { formatClock } from "@/components/institutional/primitives";
import { cn } from "@/lib/format";

const categoryTone: Record<string, string> = {
  error: "text-loss",
  fill: "text-profit",
  connection: "text-profit",
  disconnection: "text-warning",
  reconnect: "text-warning",
  order: "text-gold",
  approval: "text-gold",
  safety: "text-warning",
  latency: "text-text-secondary",
  health: "text-text-secondary",
};

export function Mt5LogPanel({ logs, total }: { logs: Mt5LogEntry[]; total: number }) {
  return (
    <PanelShell
      eyebrow="MT5 Audit Log"
      title="Broker Activity Log"
      icon={ScrollText}
      badge={<span className="text-[10px] text-text-muted">{total} entries</span>}
    >
      {logs.length === 0 ? (
        <p className="text-xs text-text-muted">No broker activity logged yet.</p>
      ) : (
        <div className="max-h-64 space-y-1.5 overflow-auto pr-1">
          {logs.map((l) => (
            <div key={l.id} className="flex items-start gap-3 rounded-lg border border-border-subtle bg-surface-panel/40 px-3 py-2">
              <span className="mt-0.5 shrink-0 font-mono text-[10px] text-text-muted">{formatClock(new Date(l.at).getTime())}</span>
              <div className="min-w-0">
                <p className={cn("text-[11px] font-bold leading-5", categoryTone[l.category] ?? "text-text-primary")}>
                  {l.category} · {l.message}
                </p>
                {l.detail && <p className="mt-0.5 text-[10px] leading-4 text-text-muted">{l.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
