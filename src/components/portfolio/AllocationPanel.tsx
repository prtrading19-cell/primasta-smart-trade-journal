import { Target } from "lucide-react";
import { Panel, ProgressBar } from "@/components/institutional/primitives";
import type { CapitalAllocationResult } from "./types";

const actionTone: Record<string, string> = {
  Increase: "bg-profit/10 text-profit",
  "Scale In": "bg-profit/10 text-profit",
  Wait: "bg-gold/10 text-gold",
  Reduce: "bg-warning/10 text-warning",
  "Scale Out": "bg-warning/10 text-warning",
  Rotate: "bg-loss/10 text-loss",
};

export function AllocationPanel({ allocation }: { allocation: CapitalAllocationResult }) {
  const { suggestions, targetAllocation, cashReservePercent, methodology } = allocation;

  return (
    <Panel
      eyebrow="Allocation"
      title="Capital Allocation"
      icon={Target}
      badge={
        <span className="rounded bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">
          Cash {cashReservePercent}%
        </span>
      }
    >
      <div className="mb-4">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-text-muted">Target weights</p>
        <div className="flex h-3 overflow-hidden rounded-full bg-surface-panel">
          {targetAllocation.map((t) => (
            <div
              key={t.assetId}
              className="h-full bg-gradient-to-r from-gold to-gold-dim"
              style={{ width: `${t.weight}%` }}
              title={`${t.assetId}: ${t.weight}%`}
            />
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-3">
          {targetAllocation.map((t) => (
            <span key={t.assetId} className="text-[10px] text-text-muted">
              {t.assetId} · {t.weight}%
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {suggestions.map((s) => (
          <div key={s.assetId} className="rounded-lg border border-border-subtle bg-surface-panel/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-text-primary">{s.assetName}</p>
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${actionTone[s.action]}`}>
                {s.action}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-text-muted">
              <span>{s.currentWeight}%</span>
              <span className="text-gold">→</span>
              <span className="font-bold text-text-primary">{s.suggestedWeight}%</span>
              <span className={s.delta >= 0 ? "text-profit" : "text-loss"}>
                ({s.delta >= 0 ? "+" : ""}{s.delta}%)
              </span>
              <span className="ml-auto">conviction {s.conviction}</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-text-secondary">{s.reason}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-text-muted">{methodology}</p>
    </Panel>
  );
}
