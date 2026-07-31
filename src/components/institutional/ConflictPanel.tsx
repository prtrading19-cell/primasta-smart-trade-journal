import { AlertTriangle, CheckCircle2, Scale } from "lucide-react";
import type { InstitutionalConflict } from "./types";
import { Panel, ProgressBar, SeverityBadge } from "./primitives";

export function ConflictPanel({ conflicts }: { conflicts: InstitutionalConflict }) {
  const tone = conflicts.score >= 40 ? "loss" : conflicts.score >= 20 ? "warning" : "profit";
  return (
    <Panel
      eyebrow="Conflict Analysis"
      title="Evidence Conflict Detection"
      icon={Scale}
      badge={<SeverityBadge severity={conflicts.severity} />}
    >
      <div className="flex items-center gap-3">
        <div className="w-28 shrink-0 text-center">
          <p className={tone === "loss" ? "text-3xl font-black text-loss" : tone === "warning" ? "text-3xl font-black text-warning" : "text-3xl font-black text-profit"}>{conflicts.score}%</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">Conflict Score</p>
        </div>
        <div className="flex-1"><ProgressBar value={conflicts.score} tone={tone} className="h-2.5" /></div>
      </div>

      {conflicts.explanation && (
        <p className="mt-3 rounded-lg border border-border-subtle bg-surface-panel/40 p-3 text-xs leading-5 text-text-secondary">{conflicts.explanation}</p>
      )}

      {conflicts.conflictingPairs.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
            <AlertTriangle className="h-3 w-3 text-warning" /> Conflicting Pairs ({conflicts.conflictingPairs.length})
          </p>
          <div className="mt-2 space-y-2">
            {conflicts.conflictingPairs.map((pair, i) => (
              <div key={i} className="rounded-lg border border-border-subtle bg-surface-panel/40 p-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-bold text-text-primary">{pair.driverA}</span>
                  <span className="rounded bg-loss/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-loss">{pair.biasA}</span>
                  <span className="text-text-muted">vs</span>
                  <span className="font-bold text-text-primary">{pair.driverB}</span>
                  <span className="rounded bg-profit/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-profit">{pair.biasB}</span>
                  <span className="ml-auto rounded bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-warning">Severity {Math.round(pair.severity * 100)}%</span>
                </div>
                {pair.explanation && <p className="mt-1.5 text-[11px] leading-4 text-text-secondary">{pair.explanation}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border-subtle bg-surface-panel/40 p-3">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted"><CheckCircle2 className="h-3 w-3 text-profit" /> Consensus Drivers</p>
          <p className="mt-1 text-lg font-black text-text-primary">{conflicts.consensusDrivers.length}</p>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-panel/40 p-3">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted"><AlertTriangle className="h-3 w-3 text-warning" /> Discord Drivers</p>
          <p className="mt-1 text-lg font-black text-text-primary">{conflicts.discordDrivers.length}</p>
        </div>
      </div>
    </Panel>
  );
}
