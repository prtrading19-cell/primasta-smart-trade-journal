"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Gauge,
  LineChart as LineChartIcon,
  ListChecks,
  PlusCircle,
  ShieldCheck,
  Target,
  TrendingUp,
  TrendingDown,
  Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ChartContainer, DashboardCard, EmptyChartPlaceholder, SectionHeader, StatusDot } from "@/components/DashboardCard";
import { InstitutionalDashboard } from "@/components/institutional";
import { JournalTable } from "@/components/JournalTable";
import { useAppData } from "@/context/AppDataContext";
import {
  getEquityCurve,
  getMonthlyPerformance,
  getStrategyPerformance,
  getWinLossChart
} from "@/lib/calculations";
import { cn, money, number, percent, shortDate } from "@/lib/format";

export default function DashboardPage() {
  const { metrics, trades, lotMarginCalculations, dataLoading } = useAppData();
  const equity = getEquityCurve(trades);
  const winLoss = getWinLossChart(trades);
  const strategy = getStrategyPerformance(trades).slice(0, 6);
  const monthly = getMonthlyPerformance(trades).slice(-8);
  const lastCalculation = lotMarginCalculations[0];
  const currentEquity = equity.at(-1)?.equity ?? 0;

  const totalClosed = Math.max(metrics.closedTradesCount, 1);
  const winRatio = (metrics.wins / totalClosed) * 100;
  const lossRatio = (metrics.losses / totalClosed) * 100;
  const breakEvenRatio = (metrics.breakEvens / totalClosed) * 100;

  const recentClosedTrades = trades
    .filter((trade) => trade.status === "Closed")
    .sort((a, b) => new Date(b.updatedAt || b.date).getTime() - new Date(a.updatedAt || a.date).getTime())
    .slice(0, 5);

  const commandState =
    metrics.ruleFollowingPercentage >= 90 && metrics.currentDrawdown <= 0
      ? "Clean Execution"
      : metrics.ruleFollowingPercentage >= 70
        ? "Controlled Risk"
        : "Tighten Rules";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner */}
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          <div className="grid gap-0 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill icon={Activity} label="Performance Command Center" />
                <StatusPill icon={ShieldCheck} label="Institutional Analytics" />
              </div>
              <div className="mt-6 max-w-3xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">TradeOS Dashboard</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
                  Quant-Style Execution Dashboard
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
                  Monitor profitability, rule discipline, open exposure, and strategy quality from one professional trading cockpit.
                </p>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <HeroMetric label="Net P/L" value={money(metrics.totalProfitLoss)} tone={metrics.totalProfitLoss >= 0 ? "profit" : "loss"} />
                <HeroMetric label="Equity Curve" value={money(currentEquity)} tone={currentEquity >= 0 ? "profit" : "loss"} />
                <HeroMetric label="Mode" value={commandState} tone={metrics.ruleFollowingPercentage >= 70 ? "gold" : "loss"} />
              </div>
            </div>

            <div className="border-t border-border-subtle bg-surface-panel/30 p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Live Operating State</p>
                  <p className={cn("mt-2 text-2xl font-bold", commandState === "Clean Execution" ? "text-profit" : commandState === "Controlled Risk" ? "text-gold" : "text-loss")}>
                    {commandState}
                  </p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-gold/20 bg-gold/10">
                  <Gauge className="h-6 w-6 text-gold" />
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <ProgressRow label="Win Discipline" value={metrics.winRate} />
                <ProgressRow label="Rule Following" value={metrics.ruleFollowingPercentage} />
                <ProgressRow label="Execution Score" value={Math.round((Math.min(metrics.winRate, 100) + metrics.ruleFollowingPercentage + Math.max(0, Math.min(100, metrics.averageR * 35))) / 3)} />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <StatBox label="Open Trades" value={metrics.openTradesCount} />
                <StatBox label="Closed Trades" value={metrics.closedTradesCount} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border-subtle bg-surface-card px-4 py-3 text-sm">
          <StatusDot active />
          <span className="font-medium text-text-primary">Dashboard synced</span>
          <span className="text-text-muted">
            Using {metrics.closedTradesCount} closed trades from {metrics.totalTrades} total entries
          </span>
        </div>
        <div className="flex gap-2">
          <Link
            href="/calculator"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-card px-4 py-3 text-sm font-bold text-text-secondary transition-all hover:border-gold hover:text-gold"
          >
            <Calculator className="h-4 w-4" />
            Calculator
          </Link>
          <Link
            href="/new-trade"
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-surface-base transition-all hover:bg-gold-dim"
          >
            <PlusCircle className="h-4 w-4" />
            Add Trade
          </Link>
        </div>
      </div>

      {dataLoading && (
        <div className="flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm text-gold">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          Loading trades...
        </div>
      )}

      {/* KPI Grid */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          icon={CircleDollarSign}
          label="Account Balance"
          value={money(metrics.totalProfitLoss)}
          helper="Closed trades only"
          tone={metrics.totalProfitLoss >= 0 ? "profit" : "loss"}
        />
        <DashboardCard
          icon={TrendingUp}
          label="Today's Profit"
          value={money(metrics.totalProfitLoss)}
          helper="All closed trades"
          tone={metrics.totalProfitLoss >= 0 ? "profit" : "loss"}
        />
        <DashboardCard
          icon={BarChart3}
          label="Weekly Profit"
          value={money(metrics.totalProfitLoss)}
          helper="Performance total"
          tone={metrics.totalProfitLoss >= 0 ? "profit" : "loss"}
        />
        <DashboardCard
          icon={Target}
          label="Monthly Profit"
          value={money(metrics.totalProfitLoss)}
          helper="MTD performance"
          tone={metrics.totalProfitLoss >= 0 ? "profit" : "loss"}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          icon={Zap}
          label="Open Trades"
          value={metrics.openTradesCount}
          helper="Active positions"
          tone="warning"
        />
        <DashboardCard
          icon={CheckCircle2}
          label="Closed Trades"
          value={metrics.closedTradesCount}
          helper={`${metrics.totalTrades} total entries`}
          tone="neutral"
        />
        <DashboardCard
          icon={Gauge}
          label="Current Drawdown"
          value={money(metrics.currentDrawdown)}
          helper="Closed-trade drawdown"
          tone={metrics.currentDrawdown > 0 ? "warning" : "profit"}
        />
        <DashboardCard
          icon={ShieldCheck}
          label="Profit Factor"
          value={metrics.profitFactor === null ? "No losses" : number(metrics.profitFactor)}
          helper="Gross profit vs gross loss"
          tone={metrics.profitFactor === 0 ? "warning" : "profit"}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          icon={TrendingUp}
          label="Win %"
          value={percent(metrics.winRate)}
          helper={`${metrics.wins}W / ${metrics.losses}L`}
          tone={metrics.winRate >= 50 ? "profit" : "warning"}
        />
        <DashboardCard
          icon={Target}
          label="Average RR"
          value={number(metrics.averageR) + "R"}
          helper={`Total R: ${number(metrics.totalR)}`}
          tone={metrics.averageR >= 0 ? "profit" : "loss"}
        />
        <DashboardCard
          icon={Activity}
          label="Largest Win"
          value={money(Math.max(...(trades.filter((t) => t.status === "Closed").map((t) => Number(t.profitLoss ?? 0))), 0))}
          helper="Best trade"
          tone="profit"
        />
        <DashboardCard
          icon={TrendingDown}
          label="Largest Loss"
          value={money(Math.min(...(trades.filter((t) => t.status === "Closed").map((t) => Number(t.profitLoss ?? 0))), 0))}
          helper="Worst trade"
          tone="loss"
        />
      </section>

      {/* Side Panels */}
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {/* Lot Engine Card */}
          <div className="rounded-xl border border-border-subtle bg-surface-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Lot Engine</p>
                <h2 className="mt-2 text-lg font-bold text-text-primary">Last Risk Calculation</h2>
              </div>
              <Calculator className="h-5 w-5 text-gold" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <StatBox label="Symbol" value={lastCalculation?.symbol ?? "None yet"} />
              <StatBox label="Lot Size" value={lastCalculation ? number(lastCalculation.calculatedLotSize, 2) : "-"} />
              <StatBox label="Risk" value={lastCalculation ? money(lastCalculation.riskAmount) : "-"} />
              <StatBox label="Margin" value={lastCalculation ? money(lastCalculation.marginRequired) : "-"} />
            </div>
            <Link
              href="/calculator"
              className="focus-ring mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-surface-base transition-all hover:bg-gold-dim"
            >
              Open Calculator
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Strategy Intelligence */}
          <div className="rounded-xl border border-border-subtle bg-surface-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Strategy Intelligence</p>
                <h2 className="mt-2 text-lg font-bold text-text-primary">Best Performing Edge</h2>
              </div>
              <LineChartIcon className="h-5 w-5 text-gold" />
            </div>
            <div className="mt-4 space-y-3">
              <InsightRow label="Best Strategy" value={metrics.bestStrategy} />
              <InsightRow label="Best Pair" value={metrics.bestPair} />
              <InsightRow label="Most Common Mistake" value={metrics.mostCommonMistake} warning={metrics.mostCommonMistake !== "None logged"} />
            </div>
          </div>
        </div>

        {/* Execution Tape */}
        <div className="rounded-xl border border-border-subtle bg-surface-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Execution Tape</p>
              <h2 className="mt-2 text-lg font-bold text-text-primary">Recent Closed Trades</h2>
            </div>
            <Activity className="h-5 w-5 text-gold" />
          </div>
          <div className="mt-4 space-y-2">
            {recentClosedTrades.length ? (
              recentClosedTrades.map((trade) => (
                <div key={trade.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-border-subtle bg-surface-panel/40 p-3 transition-all hover:bg-surface-hover">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text-primary">{trade.pair} — {trade.strategy}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                      <Clock className="h-3 w-3" />
                      {shortDate(trade.date)} · {trade.session}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-bold", Number(trade.profitLoss ?? 0) >= 0 ? "text-profit" : "text-loss")}>
                      {money(Number(trade.profitLoss ?? 0))}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">{number(Number(trade.rMultiple ?? 0))}R</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyChartPlaceholder message="Close trades to populate the execution tape." />
            )}
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <section className="grid gap-4 xl:grid-cols-2">
        <ChartContainer title="Equity Curve" eyebrow="Capital Trajectory">
          {equity.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={equity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => money(Number(value))} />
                <Line type="monotone" dataKey="equity" stroke="#D4AF37" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartPlaceholder message="Close trades to see your equity curve." />
          )}
        </ChartContainer>

        <ChartContainer title="Win / Loss Distribution" eyebrow="Result Quality">
          <div className="grid gap-4 md:grid-cols-[0.8fr_1fr] md:items-center">
            {winLoss.some((item) => item.value > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={winLoss} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
                    {winLoss.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartPlaceholder compact message="No data yet." />
            )}
            <div className="space-y-3">
              <DistributionBar label="Wins" value={metrics.wins} ratio={winRatio} color="bg-profit" />
              <DistributionBar label="Losses" value={metrics.losses} ratio={lossRatio} color="bg-loss" />
              <DistributionBar label="Break-even" value={metrics.breakEvens} ratio={breakEvenRatio} color="bg-warning" />
            </div>
          </div>
        </ChartContainer>

        <ChartContainer title="Strategy Performance" eyebrow="Top 6 by P/L">
          {strategy.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={strategy}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="strategy" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => money(Number(value))} />
                <Bar dataKey="profitLoss" fill="#D4AF37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartPlaceholder message="Close trades to see strategy performance." />
          )}
        </ChartContainer>

        <ChartContainer title="Monthly Profit / Loss" eyebrow="Performance Regime">
          {monthly.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => money(Number(value))} />
                <Bar dataKey="profitLoss" radius={[4, 4, 0, 0]}>
                  {monthly.map((entry, index) => (
                    <Cell key={index} fill={entry.profitLoss >= 0 ? "#16C784" : "#EA3943"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartPlaceholder message="Close trades to see monthly performance." />
          )}
        </ChartContainer>
      </section>

      {/* Institutional Intelligence */}
      <section id="institutional">
        <SectionHeader
          title="Institutional Intelligence"
          eyebrow="Research Command Center"
          action={
            <Link
              href="/research"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-card px-3 py-2 text-sm font-bold text-text-secondary transition-all hover:border-gold hover:text-gold"
            >
              Research
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        />
        <p className="mt-1 mb-4 text-sm text-text-muted">
          Live provider infrastructure, scheduler orchestration, decision intelligence, and persistent research analytics.
        </p>
        <InstitutionalDashboard />
      </section>

      {/* Open Trades */}
      <section>
        <SectionHeader
          title="Current Open Trades"
          eyebrow="Open Risk Monitor"
          action={
            <Link
              href="/journal"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-card px-3 py-2 text-sm font-bold text-text-secondary transition-all hover:border-gold hover:text-gold"
            >
              View Journal
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        />
        <p className="mt-1 mb-4 text-sm text-text-muted">Active trades stay visible here and are not included in performance calculations.</p>
        <JournalTable compactOpenOnly />
      </section>
    </div>
  );
}

const chartTooltipStyle = {
  borderRadius: "12px",
  border: "1px solid #253244",
  background: "#0F172A",
  color: "#F8FAFC",
  boxShadow: "0 12px 28px rgba(0, 0, 0, 0.4)",
  fontSize: "13px"
};

function StatusPill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-panel/60 px-3 py-1.5 text-[11px] font-bold text-text-secondary">
      <Icon className="h-3.5 w-3.5 text-gold" />
      {label}
    </span>
  );
}

function HeroMetric({ label, value, tone }: { label: string; value: string; tone: "profit" | "loss" | "gold" }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-panel/40 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p
        className={cn(
          "mt-2 text-xl font-black tracking-tight",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss",
          tone === "gold" && "text-gold"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  const clean = Math.max(0, Math.min(100, value || 0));
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-text-secondary">
        <span>{label}</span>
        <span className="text-text-primary">{clean.toFixed(0)}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-panel">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold via-gold-dim to-gold"
          style={{ width: `${clean}%` }}
        />
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-panel/40 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-text-primary">{value}</p>
    </div>
  );
}

function InsightRow({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-panel/40 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">{label}</p>
      <p className={cn("mt-1 text-sm font-bold", warning ? "text-warning" : "text-text-primary")}>{value}</p>
    </div>
  );
}

function DistributionBar({ label, value, ratio, color }: { label: string; value: number; ratio: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-text-secondary">{label}</span>
        <span className="font-bold text-text-primary">{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-panel">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(0, Math.min(100, ratio))}%` }} />
      </div>
    </div>
  );
}
