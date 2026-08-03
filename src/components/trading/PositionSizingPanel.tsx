"use client";

import { Scale } from "lucide-react";
import type { PositionSizingResult } from "@/lib/trading";
import { PanelShell } from "./primitives";

export function PositionSizingPanel({ result }: { result: PositionSizingResult | null }) {
  return (
    <PanelShell eyebrow="Sizing Engine" title="Position Sizing" icon={Scale}>
      {!result ? (
        <p className="text-xs text-text-muted">Position sizing computes when a signal is previewed.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-gold/20 bg-gold/5 px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gold">Method</p>
              <p className="text-sm font-black text-text-primary">{result.methodLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-gold">Lot Size</p>
              <p className="text-2xl font-black text-gold">{result.lots}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Risk Amount</p>
              <p className="mt-1 text-sm font-black text-text-primary">${result.riskAmount}</p>
            </div>
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Risk %</p>
              <p className="mt-1 text-sm font-black text-text-primary">{result.riskPercent}%</p>
            </div>
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Est. P&L</p>
              <p className="mt-1 text-sm font-black text-text-primary">${result.estimatedPnl}</p>
            </div>
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Notional</p>
              <p className="mt-1 text-sm font-black text-text-primary">${result.estimatedNotional}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center justify-between rounded-lg bg-surface-panel/30 px-3 py-2">
              <span className="text-text-muted">Confidence factor</span>
              <span className="font-bold text-text-primary">{result.confidenceFactor.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-panel/30 px-3 py-2">
              <span className="text-text-muted">Strength factor</span>
              <span className="font-bold text-text-primary">{result.strengthFactor.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-panel/30 px-3 py-2">
              <span className="text-text-muted">Stop distance</span>
              <span className="font-bold text-text-primary">{result.stopDistance}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-panel/30 px-3 py-2">
              <span className="text-text-muted">Calculated</span>
              <span className="font-bold text-text-primary">{new Date(result.calculatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>

          {result.notes.length > 0 && (
            <div className="rounded-lg border border-border-subtle bg-surface-panel/30 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">Notes</p>
              <ul className="space-y-0.5 text-[11px] text-text-secondary">
                {result.notes.map((n, i) => (
                  <li key={i}>· {n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </PanelShell>
  );
}
