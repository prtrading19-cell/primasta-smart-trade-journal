"use client";

import { FileText, CheckCircle2, XCircle } from "lucide-react";
import type { Order, ValidationResult } from "@/lib/trading";
import { PanelShell } from "./primitives";
import { cn } from "@/lib/format";

export function OrderPreview({ order, validation }: { order: Order | null; validation?: ValidationResult | null }) {
  const passed = validation?.passed ?? null;
  return (
    <PanelShell
      eyebrow="Order Draft"
      title="Order Preview"
      icon={FileText}
      badge={
        passed === true ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-profit"><CheckCircle2 className="h-3.5 w-3.5" /> VALIDATED</span>
        ) : passed === false ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-loss"><XCircle className="h-3.5 w-3.5" /> BLOCKED</span>
        ) : undefined
      }
    >
      {!order ? (
        <p className="text-xs text-text-muted">Select a signal and click Preview to build an order draft.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Symbol</p>
              <p className="mt-1 text-sm font-black text-text-primary">{order.symbol}</p>
            </div>
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Type</p>
              <p className="mt-1 text-sm font-black text-text-primary">{order.orderType} · {order.direction}</p>
            </div>
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Entry</p>
              <p className="mt-1 text-sm font-black text-text-primary">{order.entry}</p>
            </div>
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Lots</p>
              <p className="mt-1 text-sm font-black text-text-primary">{order.lotSize}</p>
            </div>
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Stop Loss</p>
              <p className="mt-1 text-sm font-black text-loss">{order.stop}</p>
            </div>
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Take Profit</p>
              <p className="mt-1 text-sm font-black text-profit">{order.takeProfit}</p>
            </div>
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Risk Amount</p>
              <p className="mt-1 text-sm font-black text-text-primary">${order.riskAmount}</p>
            </div>
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">R:R</p>
              <p className="mt-1 text-sm font-black text-text-primary">{order.rewardRatio}</p>
            </div>
          </div>

          {validation && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Validation Checks</p>
              <ul className="space-y-1.5">
                {validation.checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-[11px]">
                    <span
                      className={cn(
                        "mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        c.passed ? "bg-profit" : "bg-loss"
                      )}
                    />
                    <span className="flex-1">
                      <span className="font-bold text-text-primary">{c.label}:</span>{" "}
                      <span className="text-text-secondary">{c.message}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {order.notes.length > 0 && (
            <div className="rounded-lg border border-border-subtle bg-surface-panel/30 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">Sizing Notes</p>
              <ul className="space-y-0.5 text-[11px] text-text-secondary">
                {order.notes.map((n, i) => (
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
