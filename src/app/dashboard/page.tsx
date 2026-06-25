"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { JournalTable } from "@/components/JournalTable";
import { MetricCard } from "@/components/MetricCard";
import { useAppData } from "@/context/AppDataContext";
import { getEquityCurve, getMonthlyPerformance, getStrategyPerformance, getWinLossChart } from "@/lib/calculations";
import { money, number, percent } from "@/lib/format";

export default function DashboardPage() {
  const { metrics, trades, dataLoading } = useAppData();
  const equity = getEquityCurve(trades);
  const winLoss = getWinLossChart(trades);
  const strategy = getStrategyPerformance(trades).slice(0, 6);
  const monthly = getMonthlyPerformance(trades).slice(-8);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Performance dashboard</p>
          <h1 className="text-2xl font-bold tracking-tight">PRIMASTA SMART TRADE JOURNAL</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Performance calculations use closed trades only. Open trades stay visible but excluded.</p>
        </div>
        <Link href="/new-trade" className="focus-ring rounded-md bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
          Add Trade
        </Link>
      </header>

      {dataLoading ? <p className="rounded-md bg-white p-4 text-sm text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">Loading trades...</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open trades" value={metrics.openTradesCount} tone="warning" helper="Not counted in performance" />
        <MetricCard label="Closed trades" value={metrics.closedTradesCount} />
        <MetricCard label="Total trades" value={metrics.totalTrades} />
        <MetricCard label="Wins / Losses / BE" value={`${metrics.wins} / ${metrics.losses} / ${metrics.breakEvens}`} />
        <MetricCard label="Win rate" value={percent(metrics.winRate)} tone={metrics.winRate >= 50 ? "profit" : "warning"} />
        <MetricCard label="Total profit/loss" value={money(metrics.totalProfitLoss)} tone={metrics.totalProfitLoss >= 0 ? "profit" : "loss"} />
        <MetricCard label="Total R-multiple" value={number(metrics.totalR)} tone={metrics.totalR >= 0 ? "profit" : "loss"} />
        <MetricCard label="Average R / trade" value={number(metrics.averageR)} />
        <MetricCard label="Profit factor" value={metrics.profitFactor === null ? "No losses" : number(metrics.profitFactor)} />
        <MetricCard label="Current drawdown" value={money(metrics.currentDrawdown)} tone={metrics.currentDrawdown > 0 ? "warning" : "profit"} />
        <MetricCard label="Best strategy" value={metrics.bestStrategy} />
        <MetricCard label="Best pair" value={metrics.bestPair} />
        <MetricCard label="Most common mistake" value={metrics.mostCommonMistake} tone={metrics.mostCommonMistake === "None logged" ? "profit" : "warning"} />
        <MetricCard label="Rule-following" value={percent(metrics.ruleFollowingPercentage)} tone={metrics.ruleFollowingPercentage >= 90 ? "profit" : "warning"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Equity curve">
          {equity.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={equity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Line type="monotone" dataKey="equity" stroke="#16a34a" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Win / loss chart">
          {winLoss.some((item) => item.value > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={winLoss} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                  {winLoss.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Strategy performance">
          {strategy.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={strategy}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="strategy" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="profitLoss" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Monthly profit/loss">
          {monthly.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="profitLoss" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Current Open Trades</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">These are active trades and are not included in performance calculations.</p>
          </div>
          <Link href="/journal" className="text-sm font-semibold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
            View journal
          </Link>
        </div>
        <JournalTable compactOpenOnly />
      </section>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyChart() {
  return <div className="flex h-[280px] items-center justify-center rounded-md bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Close trades to populate this chart.</div>;
}
