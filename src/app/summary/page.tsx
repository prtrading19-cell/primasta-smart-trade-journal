"use client";

import { buildSummary } from "@/lib/calculations";
import { useAppData } from "@/context/AppDataContext";
import { MetricCard } from "@/components/MetricCard";
import { money, number, percent } from "@/lib/format";

export default function SummaryPage() {
  const { trades } = useAppData();
  const summary = buildSummary(trades);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Closed-trade insights</p>
        <h1 className="text-2xl font-bold tracking-tight">Summary</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">All summaries below use closed trades only.</p>
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
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Automatic insights</h2>
          <div className="mt-4 space-y-3">
            {summary.insights.map((insight) => (
              <p key={insight} className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                {insight}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="text-lg font-semibold">Monthly performance</h2>
          </div>
          <div className="table-scroll">
            <table className="min-w-[620px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Profit/Loss</th>
                  <th className="px-4 py-3">Total R</th>
                  <th className="px-4 py-3">Closed trades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {summary.monthly.map((row) => (
                  <tr key={row.month}>
                    <td className="px-4 py-3 font-medium">{row.month}</td>
                    <td className="px-4 py-3">{money(row.profitLoss)}</td>
                    <td className="px-4 py-3">{row.totalR.toFixed(2)}</td>
                    <td className="px-4 py-3">{row.trades}</td>
                  </tr>
                ))}
                {!summary.monthly.length ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
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
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-5 dark:border-slate-800">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="table-scroll">
        <table className="min-w-[680px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Trades</th>
              <th className="px-4 py-3">Wins</th>
              <th className="px-4 py-3">Win rate</th>
              {showAverageRiskReward ? <th className="px-4 py-3">Avg R:R</th> : null}
              <th className="px-4 py-3">Avg R</th>
              <th className="px-4 py-3">P/L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((row) => (
              <tr key={row.name}>
                <td className="max-w-[260px] px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">{row.trades}</td>
                <td className="px-4 py-3">{row.wins}</td>
                <td className="px-4 py-3">{percent(row.winRate)}</td>
                {showAverageRiskReward ? <td className="px-4 py-3">{row.averagePlannedRiskReward ? `1:${number(row.averagePlannedRiskReward)}` : "-"}</td> : null}
                <td className="px-4 py-3">{number(row.averageRMultiple)}</td>
                <td className="px-4 py-3">{money(row.profitLoss)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={showAverageRiskReward ? 7 : 6} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
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
