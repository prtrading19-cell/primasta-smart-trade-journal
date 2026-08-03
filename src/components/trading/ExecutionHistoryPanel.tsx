"use client";

import { History } from "lucide-react";
import type { ExecutionHistoryEntry } from "@/lib/trading";
import { PanelShell, StatusBadge } from "./primitives";
import { formatTime } from "@/components/institutional/primitives";

export function ExecutionHistoryPanel({ history }: { history: ExecutionHistoryEntry[] }) {
  return (
    <PanelShell eyebrow="Ledger" title="Execution History" icon={History} badge={<span className="text-[10px] text-text-muted">{history.length} entries</span>}>
      {history.length === 0 ? (
        <p className="text-xs text-text-muted">No executions logged yet.</p>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-card text-[10px] uppercase tracking-wider text-text-muted">
              <tr>
                <th className="pb-2 pr-3 font-bold">Symbol</th>
                <th className="pb-2 pr-3 font-bold">Type</th>
                <th className="pb-2 pr-3 font-bold">Direction</th>
                <th className="pb-2 pr-3 font-bold">Lots</th>
                <th className="pb-2 pr-3 font-bold">Status</th>
                <th className="pb-2 font-bold">Time</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t border-border-subtle">
                  <td className="py-2 pr-3 font-bold text-text-primary">{h.symbol}</td>
                  <td className="py-2 pr-3 text-text-secondary">{h.signalType}</td>
                  <td className="py-2 pr-3 text-text-secondary capitalize">{h.direction}</td>
                  <td className="py-2 pr-3 text-text-secondary">{h.lotSize != null ? h.lotSize : "—"}</td>
                  <td className="py-2 pr-3"><StatusBadge status={h.status} /></td>
                  <td className="py-2 text-text-muted">{formatTime(h.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}
