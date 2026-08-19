"use client";

import { buildSummary } from "@/lib/calculations";
import { useAppData } from "@/context/AppDataContext";
import { MetricCard } from "@/components/MetricCard";
import { money, number, percent } from "@/lib/format";

export default function SummaryPage() {
  const { trades } = useAppData();
  const summary = buildSummary(trades);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          <div className="p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">TradeOS Analytics</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Summary</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">All summaries below use closed trades only.</p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Best pair" value={summary.bestPair} />
        <MetricCard label="Worst pair" value={summary.worstPair} />
        <MetricCard label="Best strategy" value={summary.bestStrategy} />
        <MetricCard label="Worst strategy" value={summary.worstStrategy} />
        <MetricCard label="Best SMC setup" value={summary.bestSmcSetup} />
        <MetricCard label="Worst SMC setup" value={summary.worstSmcSetup} />
        <MetricCard label="A+ score 13 or higher" value={summary.aPlusScore13OrHigher} tone="profit" />
        <MetricCard label="A+ score below 9" value={summary.aPlusScoreBelow9} tone={summary.aPlusScoreBelow9 ? "warning" : "profit"} />
        <MetricCard label="Best session" value={summary.bestSession} />
        <MetricCard label="Worst session" value={summary.worstSession} />
        <MetricCard label="Most common mistake" value={summary.mostCommonMistake} tone={summary.mostCommonMistake === "None logged" ? "profit" : "warning"} />
        <MetricCard label="Total rule violations" value={summary.totalRuleViolations} tone={summary.totalRuleViolations ? "warning" : "profit"} />
        <MetricCard label="Win rate when rules followed" value={percent(summary.winRateRulesFollowed)} />
        <MetricCard label="Win rate when rules broken" value={percent(summary.winRateRulesBroken)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border border-border-subtle bg-surface-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Automatic Insights</p>
          <div className="mt-4 space-y-3">
            {summary.insights.map((insight) => (
              <p key={insight} className="rounded-lg border border-border-subtle bg-surface-panel/40 px-4 py-3 text-sm text-text-secondary">
                {insight}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-card">
          <div className="border-b border-border-subtle p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Monthly Performance</p>
          </div>
          <div className="table-scroll">
            <table className="min-w-[620px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Month</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Profit/Loss</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Total R</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Closed trades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {summary.monthly.map((row) => (
                  <tr key={row.month} className="hover:bg-surface-hover/60">
                    <td className="px-4 py-3 font-medium text-text-primary">{row.month}</td>
                    <td className="px-4 py-3 text-text-secondary">{money(row.profitLoss)}</td>
                    <td className="px-4 py-3 text-text-secondary">{row.totalR.toFixed(2)}</td>
                    <td className="px-4 py-3 text-text-secondary">{row.trades}</td>
                  </tr>
                ))}
                {!summary.monthly.length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-text-muted">
                      Close trades to generate monthly summaries.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <StatsTable title="Win rate by Strategy" rows={summary.strategyStats} showAverageRiskReward />
        <StatsTable title="Win rate by Setup Grade" rows={summary.setupGradeStats} />
      </section>
    </div>
  );
}

function StatsTable({
  title,
  rows,
  showAverageRiskReward = false
}: {
  title: string;
  rows: {
    name: string;
    trades: number;
    wins: number;
    winRate: number;
    averageRMultiple: number;
    averagePlannedRiskReward: number;
    profitLoss: number;
  }[];
  showAverageRiskReward?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card">
      <div className="border-b border-border-subtle p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">{title}</p>
      </div>
      <div className="table-scroll">
        <table className="min-w-[680px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Name</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Trades</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Wins</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Win rate</th>
              {showAverageRiskReward ? <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Avg R:R</th> : null}
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Avg R</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">P/L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((row) => (
              <tr key={row.name} className="hover:bg-surface-hover/60">
                <td className="max-w-[260px] px-4 py-3 font-medium text-text-primary">{row.name}</td>
                <td className="px-4 py-3 text-text-secondary">{row.trades}</td>
                <td className="px-4 py-3 text-text-secondary">{row.wins}</td>
                <td className="px-4 py-3 text-text-secondary">{percent(row.winRate)}</td>
                {showAverageRiskReward ? <td className="px-4 py-3 text-text-secondary">{row.averagePlannedRiskReward ? `1:${number(row.averagePlannedRiskReward)}` : "-"}</td> : null}
                <td className="px-4 py-3 text-text-secondary">{number(row.averageRMultiple)}</td>
                <td className="px-4 py-3 text-text-secondary">{money(row.profitLoss)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={showAverageRiskReward ? 7 : 6} className="px-4 py-10 text-center text-text-muted">
                  Close trades to generate this breakdown.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
