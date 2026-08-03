"use client";

import { Play, Eye } from "lucide-react";
import type { TradeSignal } from "@/lib/trading";
import { SignalBadge } from "./primitives";
import { Bar, RiskLevelTone, ToneBadge } from "./primitives";

export function TradeSignalCard({
  signal,
  onExecute,
  onPreview,
  executing,
}: {
  signal: TradeSignal;
  onExecute: (signal: TradeSignal) => void;
  onPreview: (signal: TradeSignal) => void;
  executing?: boolean;
}) {
  const strengthAbs = Math.min(100, Math.abs(signal.strength));
  const tone = signal.direction === "buy" ? "profit" : signal.direction === "sell" ? "loss" : "warning";

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border-subtle bg-surface-card">
      <div className="flex items-start justify-between gap-3 border-b border-border-subtle bg-surface-panel/50 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-black text-text-primary">{signal.symbol}</h4>
            <SignalBadge type={signal.type} direction={signal.direction} />
          </div>
          <p className="mt-0.5 truncate text-[11px] text-text-muted">
            {signal.assetName} · {signal.source}
          </p>
        </div>
        <ToneBadge text={`${Math.round(signal.confidence)}%`} tone={tone} />
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Strength</p>
            <p className="text-sm font-black text-text-primary">{strengthAbs.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Direction</p>
            <p className="text-sm font-black text-text-primary capitalize">{signal.direction}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Risk</p>
            <p className="text-sm font-black" style={{ color: `var(--${RiskLevelTone(signal.riskLevel)})` }}>
              {signal.riskLevel}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] text-text-muted">
            <span>Strength</span>
            <span>{strengthAbs.toFixed(0)}/100</span>
          </div>
          <Bar value={strengthAbs} tone={tone} />
        </div>

        <ul className="space-y-1">
          {signal.reasoning.slice(0, 2).map((r, i) => (
            <li key={i} className="text-[11px] leading-4 text-text-secondary line-clamp-2">
              · {r}
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <button
            onClick={() => onPreview(signal)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-panel px-3 py-2 text-xs font-bold text-text-secondary transition-colors hover:border-gold hover:text-gold"
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button
            onClick={() => onExecute(signal)}
            disabled={executing}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-gold to-gold-dim px-3 py-2 text-xs font-black text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" /> {executing ? "Running…" : "Execute"}
          </button>
        </div>
      </div>
    </div>
  );
}
