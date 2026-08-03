import { LifeBuoy } from "lucide-react";
import { Panel, ProgressBar } from "@/components/institutional/primitives";
import type { HedgingResult } from "./types";

const severityTone: Record<string, string> = {
  Low: "bg-profit/10 text-profit",
  Medium: "bg-warning/10 text-warning",
  High: "bg-loss/10 text-loss",
};

export function HedgingPanel({ hedging }: { hedging: HedgingResult }) {
  const { suggestions, netExposureDirection, concentrationExposure, summary } = hedging;

  return (
    <Panel eyebrow="Hedging" title="Hedge & Protection">
      <div className="mb-4 flex items-center justify-between rounded-lg bg-surface-panel/40 p-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Net exposure</p>
          <p className="text-sm font-black text-text-primary capitalize">{netExposureDirection}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Concentration</p>
          <p className="text-sm font-black text-text-primary">{concentrationExposure}</p>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">No hedge suggestions — portfolio appears balanced.</p>
      ) : (
        <div className="space-y-2.5">
          {suggestions.map((s) => (
            <div key={s.id} className="rounded-lg border border-border-subtle bg-surface-panel/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="h-3.5 w-3.5 text-gold" />
                  <p className="text-xs font-bold text-text-primary">{s.instrument}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${severityTone[s.severity]}`}>
                    {s.severity}
                  </span>
                  <span className="rounded bg-surface-panel px-2 py-0.5 text-[10px] font-bold uppercase text-gold">
                    {s.type}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-text-secondary">{s.rationale}</p>
              <div className="mt-2 flex items-center gap-2">
                <ProgressBar value={s.effectiveness} tone="gold" className="flex-1" />
                <span className="text-[10px] text-text-muted">eff {s.effectiveness}%</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.assets.map((a) => (
                  <span key={a} className="rounded bg-surface-panel px-1.5 py-0.5 text-[10px] text-text-muted">{a}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] leading-4 text-text-muted">{summary}</p>
    </Panel>
  );
}
