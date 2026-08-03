"use client";

import { ShieldCheck, ShieldAlert } from "lucide-react";
import type { RiskValidationResult } from "@/lib/trading";
import { PanelShell } from "./primitives";
import { Bar, RiskLevelTone } from "./primitives";
import { cn } from "@/lib/format";

export function RiskValidationPanel({ result }: { result: RiskValidationResult | null }) {
  return (
    <PanelShell
      eyebrow="Risk Control"
      title="Risk Validation"
      icon={result?.passed ? ShieldCheck : ShieldAlert}
      badge={
        result ? (
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              result.passed ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
            )}
          >
            {result.passed ? "APPROVED" : "BLOCKED"}
          </span>
        ) : undefined
      }
    >
      {!result ? (
        <p className="text-xs text-text-muted">Risk validation runs when a signal is previewed.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Risk Score</p>
              <p className="mt-1 text-lg font-black text-text-primary">{result.riskScore}</p>
            </div>
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Risk Level</p>
              <p className="mt-1 text-lg font-black" style={{ color: `var(--${RiskLevelTone(result.riskLevel)})` }}>
                {result.riskLevel}
              </p>
            </div>
            <div className="rounded-lg bg-surface-panel/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Est. Risk</p>
              <p className="mt-1 text-lg font-black text-text-primary">
                {result.estimatedRiskPercent.toFixed(2)}%
              </p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] text-text-muted">
              <span>Combined risk score</span>
              <span>{result.riskScore}/100</span>
            </div>
            <Bar value={result.riskScore} tone={result.passed ? "profit" : "loss"} />
          </div>

          <ul className="space-y-1.5">
            {result.checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-[11px]">
                <span className={cn("mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full", c.passed ? "bg-profit" : "bg-loss")} />
                <span className="flex-1">
                  <span className="font-bold text-text-primary">{c.label}:</span>{" "}
                  <span className="text-text-secondary">{c.message}</span>
                </span>
              </li>
            ))}
          </ul>

          {result.blockedReasons.length > 0 && (
            <div className="rounded-lg border border-loss/20 bg-loss/5 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-loss">Blocked</p>
              <ul className="space-y-0.5 text-[11px] text-loss/90">
                {result.blockedReasons.map((r, i) => (
                  <li key={i}>· {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </PanelShell>
  );
}
