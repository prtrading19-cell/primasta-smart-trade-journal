import { CheckCircle2, Database, XCircle } from "lucide-react";
import type { InstitutionalEvidence } from "./types";
import { Panel, ProgressBar, formatTime, toneForBias } from "./primitives";
import { cn } from "@/lib/format";

export function EvidencePanel({ evidence }: { evidence: InstitutionalEvidence[] }) {
  if (evidence.length === 0) {
    return (
      <Panel eyebrow="Evidence" title="Evidence Records" icon={Database} badge={<span className="rounded bg-surface-panel px-2 py-0.5 text-[10px] font-bold text-text-muted">0</span>}>
        <p className="py-6 text-center text-sm text-text-muted">No evidence recorded yet. Run a research cycle to populate evidence.</p>
      </Panel>
    );
  }

  const byCategory = new Map<string, InstitutionalEvidence[]>();
  for (const ev of evidence) {
    const list = byCategory.get(ev.category) ?? [];
    list.push(ev);
    byCategory.set(ev.category, list);
  }

  const categories = Array.from(byCategory.entries()).sort((a, b) => b[1].length - a[1].length);

  return (
    <Panel
      eyebrow="Evidence"
      title="Evidence Records"
      icon={Database}
      badge={<span className="rounded bg-surface-panel px-2 py-0.5 text-[10px] font-bold text-text-muted">{evidence.length}</span>}
    >
      <div className="space-y-4">
        {categories.map(([category, items]) => (
          <div key={category}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">{category}</p>
              <span className="text-[10px] text-text-muted">{items.length}</span>
            </div>
            <div className="mt-2 space-y-2">
              {items.map((ev) => {
                const tone = toneForBias(ev.bias);
                return (
                  <div key={ev.id} className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-panel/40 px-3 py-2.5">
                    {tone === "profit" ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-profit" />
                    ) : tone === "loss" ? (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-loss" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-text-primary">{ev.driverTitle}</p>
                        <span className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          tone === "profit" && "bg-profit/10 text-profit",
                          tone === "loss" && "bg-loss/10 text-loss",
                          tone === "warning" && "bg-warning/10 text-warning"
                        )}>{ev.bias}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-text-secondary">{ev.interpretation}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] text-text-muted">
                        <span>Source: {ev.source}</span>
                        <span>·</span>
                        <span>{formatTime(ev.timestamp)}</span>
                        <span>·</span>
                        <span>Weight {Math.round(ev.weight * 100)}%</span>
                        <span>·</span>
                        <span>Conf {ev.confidence}%</span>
                        <span className="ml-auto w-16"><ProgressBar value={ev.confidence} tone="gold" /></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
