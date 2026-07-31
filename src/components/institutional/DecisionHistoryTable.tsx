import { History } from "lucide-react";
import type { InstitutionalHistoryRow } from "./types";
import { ActionBadge, Panel, RiskBadge, formatTime } from "./primitives";
import { cn } from "@/lib/format";

export function DecisionHistoryTable({ rows }: { rows: InstitutionalHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <Panel eyebrow="History" title="Decision History" icon={History}>
        <p className="py-6 text-center text-sm text-text-muted">No decisions recorded yet.</p>
      </Panel>
    );
  }
  return (
    <Panel eyebrow="History" title="Decision History" icon={History} badge={<span className="rounded bg-surface-panel px-2 py-0.5 text-[10px] font-bold text-text-muted">{rows.length}</span>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted">
              <th className="py-2 pr-2">Time</th>
              <th className="py-2 pr-2">Asset</th>
              <th className="py-2 pr-2">Action</th>
              <th className="py-2 pr-2 text-right">Confidence</th>
              <th className="py-2 pr-2 text-right">Conflict</th>
              <th className="py-2 pr-2">Risk</th>
              <th className="py-2 text-right">Scenario</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border-subtle/60 last:border-0 hover:bg-surface-panel/30">
                <td className="py-2.5 pr-2 text-[10px] text-text-muted">{formatTime(r.timestamp)}</td>
                <td className="py-2.5 pr-2 font-bold text-text-primary">{r.asset}</td>
                <td className="py-2.5 pr-2"><ActionBadge action={r.action} /></td>
                <td className="py-2.5 pr-2 text-right font-mono text-text-secondary">{r.confidence}%</td>
                <td className={cn("py-2.5 pr-2 text-right font-mono", r.conflict >= 40 ? "text-loss" : r.conflict >= 20 ? "text-warning" : "text-profit")}>{r.conflict}%</td>
                <td className="py-2.5 pr-2"><RiskBadge risk={r.risk} /></td>
                <td className="py-2.5 text-right">
                  <span className="rounded bg-surface-panel px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">{r.scenario}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
