"use client";

import { Calculator } from "lucide-react";
import type { Mt5OrderPreview } from "@/lib/mt5/types";
import { PanelShell, Bar } from "@/components/trading/primitives";
import { cn } from "@/lib/format";

function money(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function Metric({ label, value, tone, sub }: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "warning" | "neutral";
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-panel/40 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className={cn(
        "mt-0.5 truncate text-sm font-black tracking-tight",
        tone === "profit" && "text-profit",
        tone === "loss" && "text-loss",
        tone === "warning" && "text-warning",
        (!tone || tone === "neutral") && "text-text-primary"
      )}>
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-[9px] text-text-muted">{sub}</p>}
    </div>
  );
}

export function Mt5OrderPreviewPanel({
  preview,
  error,
  busy,
}: {
  preview: Mt5OrderPreview | null;
  error: string | null;
  busy: boolean;
}) {
  return (
    <PanelShell
      eyebrow="Gateway-Verified Preview"
      title="Order Economics"
      icon={Calculator}
      badge={<span className="text-[10px] text-text-muted">{busy ? "calculating…" : preview ? "live" : "idle"}</span>}
    >
      {busy && !preview ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-panel/60" />)}
        </div>
      ) : error ? (
        <p className="rounded-lg border border-loss/20 bg-loss/5 px-3 py-2 text-xs text-loss">{error}</p>
      ) : preview ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Entry" value={preview.entryPrice != null ? String(preview.entryPrice) : "—"} />
            <Metric label="Bid / Ask" value={`${preview.bid} / ${preview.ask}`} sub={`spread ${preview.spread.toFixed(5)}`} />
            <Metric label="Required Margin" value={money(preview.requiredMargin)} tone="warning" />
            <Metric label="Free Margin After" value={money(preview.freeMarginAfterEntry)} tone={preview.freeMarginAfterEntry < 0 ? "loss" : "neutral"} />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Pip Value" value={money(preview.pipValue)} />
            <Metric label="Position Value" value={money(preview.positionValue)} />
            <Metric label="Spread Cost" value={money(preview.spreadCost)} sub={`est. ${preview.orderType}`} />
            <Metric label="Swap" value={money(preview.swap)} />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Risk (SL)" value={money(-preview.dollarRisk)} tone="loss" sub={`${preview.riskPercent.toFixed(2)}% of equity`} />
            <Metric label="Reward (TP)" value={money(preview.reward)} tone="profit" sub={`${preview.rewardPercent.toFixed(2)}% of equity`} />
            <Metric label="R:R Ratio" value={preview.rrRatio > 0 ? `1 : ${preview.rrRatio.toFixed(2)}` : "—"} />
            <Metric label="Est. Profit (TP)" value={money(preview.estimatedProfit)} tone={preview.estimatedProfit >= 0 ? "profit" : "loss"} />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] text-text-muted">
              <span>Risk vs equity</span>
              <span>{preview.riskPercent.toFixed(2)}%</span>
            </div>
            <Bar value={preview.riskPercent} tone={preview.riskPercent > 2 ? "loss" : preview.riskPercent > 1 ? "warning" : "gold"} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric label="Balance After Loss" value={money(preview.balanceAfterLoss)} tone={preview.balanceAfterLoss < 0 ? "loss" : "neutral"} />
            <Metric label="Balance" value={money(preview.balance)} />
            <Metric label="Equity" value={money(preview.equity)} />
          </div>

          <p className="text-[10px] text-text-muted">
            Margin, profit, and risk computed live via MT5&apos;s order_calc_margin / order_calc_profit from the Python gateway.
          </p>
        </div>
      ) : (
        <p className="text-xs text-text-muted">
          Fill the order ticket and the preview will compute live margin, spread cost, pip value, risk, reward, and R:R from gateway data.
        </p>
      )}
    </PanelShell>
  );
}
