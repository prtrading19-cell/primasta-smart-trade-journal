"use client";

import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp } from "lucide-react";
import { Metric, PanelShell, ToneBadge } from "@/components/trading/primitives";
import type { Mt5ExecutionAnalytics } from "@/lib/mt5";

export function Mt5ExecutionAnalyticsPanel() {
  const [analytics, setAnalytics] = useState<Mt5ExecutionAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/mt5/analytics", { cache: "no-store" });
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const json = (await res.json()) as { ok: boolean; analytics: Mt5ExecutionAnalytics | null; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Failed");
      setAnalytics(json.analytics);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    }
  };

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, []);

  if (error) {
    return (
      <PanelShell eyebrow="Execution Analytics" title="Performance Metrics" icon={TrendingUp}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-loss">{error}</p>
          <button onClick={() => void load()} className="flex items-center gap-1 rounded-lg bg-surface-panel px-2.5 py-1 text-[10px] font-bold text-text-muted hover:text-text-primary">
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      </PanelShell>
    );
  }

  const a = analytics;
  const tone = (v: number | null | undefined): "profit" | "loss" | "neutral" =>
    v == null ? "neutral" : v > 0 ? "profit" : v < 0 ? "loss" : "neutral";

  return (
    <PanelShell
      eyebrow="Execution Analytics"
      title="Performance Metrics"
      icon={TrendingUp}
      badge={
        a?.totalTrades ? <ToneBadge text={`${a.totalTrades} trades`} tone="neutral" /> : <ToneBadge text="no data" tone="warning" />
      }
    >
      <div className="space-y-4">
        <p className="text-[11px] leading-5 text-text-muted">
          Computed exclusively from recorded confirmations, immutable execution events, and the synchronized trade history.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metric label="Win rate" value={a?.winRate != null ? `${(a.winRate * 100).toFixed(1)}%` : "—"} sub={a ? `${a.wins}W / ${a.losses}L` : undefined} tone="profit" />
          <Metric label="Net P/L" value={a?.netPnl != null ? a.netPnl.toFixed(2) : "—"} sub="closed orders" tone={tone(a?.netPnl)} />
          <Metric label="Profit factor" value={a?.profitFactor != null ? a.profitFactor.toFixed(2) : "—"} tone="neutral" />
          <Metric label="Avg R:R" value={a?.averageRR != null ? a.averageRR.toFixed(2) : "—"} sub={a?.expectancy != null ? `expectancy ${a.expectancy.toFixed(2)}` : undefined} tone="neutral" />
          <Metric label="Avg hold" value={a?.averageHoldingTimeMs != null ? `${(a.averageHoldingTimeMs / 1000).toFixed(0)}s` : "—"} tone="neutral" />
          <Metric label="Avg latency" value={a?.averageLatencyMs != null ? `${a.averageLatencyMs.toFixed(1)}ms` : "—"} sub={a?.averageSlippage != null ? `slip ${a.averageSlippage.toFixed(1)}` : undefined} tone="neutral" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Avg win" value={a?.averageProfit != null ? a.averageProfit.toFixed(2) : "—"} tone="profit" />
          <Metric label="Avg loss" value={a?.averageLoss != null ? a.averageLoss.toFixed(2) : "—"} tone="loss" />
          <Metric label="Commission" value={a?.totalCommission != null ? a.totalCommission.toFixed(2) : "—"} tone="neutral" />
          <Metric label="Swap" value={a?.totalSwap != null ? a.totalSwap.toFixed(2) : "—"} tone="neutral" />
        </div>

        {a?.stats && a.stats.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full min-w-[480px] text-left text-[11px]">
              <thead className="border-b border-border-subtle bg-surface-panel/50 text-[10px] uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-3 py-2 font-bold">Symbol</th>
                  <th className="px-3 py-2 font-bold">Trades</th>
                  <th className="px-3 py-2 font-bold">Wins</th>
                  <th className="px-3 py-2 font-bold">Losses</th>
                  <th className="px-3 py-2 font-bold">Win %</th>
                  <th className="px-3 py-2 font-bold">Net</th>
                </tr>
              </thead>
              <tbody>
                {a.stats.map((s) => (
                  <tr key={s.symbol} className="border-b border-border-subtle/50 last:border-0">
                    <td className="px-3 py-2 font-bold text-text-primary">{s.symbol}</td>
                    <td className="px-3 py-2 text-text-muted">{s.trades}</td>
                    <td className="px-3 py-2 text-profit">{s.wins}</td>
                    <td className="px-3 py-2 text-loss">{s.losses}</td>
                    <td className="px-3 py-2 text-text-muted">{s.winRate != null ? `${(s.winRate * 100).toFixed(0)}%` : "—"}</td>
                    <td className="px-3 py-2 font-bold text-text-primary">{s.netPnl.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
