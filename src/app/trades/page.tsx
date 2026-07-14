"use client";

import Link from "next/link";
import { BarChart3, Download, Eye, Pencil, Plus, Search, Trash2, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { CloseTradeDialog } from "@/components/CloseTradeDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { TradeForm } from "@/components/TradeForm";
import { useAppData } from "@/context/AppDataContext";
import { exportTradesCsv, exportTradesExcel, exportTradesJson, exportFullReportPdf } from "@/lib/exporters";
import { cn, money, number, shortDate } from "@/lib/format";
import { calculateMetrics } from "@/lib/calculations";
import type { NewTradeInput, Trade } from "@/types/trade";

type Tab = "All" | "Open" | "Closed" | "Wins" | "Losses";
type SortMode = "date-desc" | "date-asc" | "profit-desc" | "profit-asc";

const tabs: Tab[] = ["All", "Open", "Closed", "Wins", "Losses"];

export default function TradesPage() {
  const { trades, deleteTrade, updateTrade, closeTrade } = useAppData();
  const [tab, setTab] = useState<Tab>("All");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("date-desc");
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const metrics = useMemo(() => calculateMetrics(trades), [trades]);

  const filteredTrades = useMemo(() => {
    return trades
      .filter((trade) => {
        if (tab === "Open" && trade.status !== "Open") return false;
        if (tab === "Closed" && trade.status !== "Closed") return false;
        if (tab === "Wins" && trade.finalResult !== "Win") return false;
        if (tab === "Losses" && trade.finalResult !== "Loss") return false;
        if (search) {
          const haystack = `${trade.pair} ${trade.strategy} ${trade.tradeType} ${trade.entryReason} ${trade.session}`.toLowerCase();
          return haystack.includes(search.toLowerCase());
        }
        return true;
      })
      .sort((a, b) => {
        if (sortMode === "date-asc") return a.date.localeCompare(b.date);
        if (sortMode === "date-desc") return b.date.localeCompare(a.date);
        if (sortMode === "profit-asc") return Number(a.profitLoss ?? 0) - Number(b.profitLoss ?? 0);
        return Number(b.profitLoss ?? 0) - Number(a.profitLoss ?? 0);
      });
  }, [tab, search, sortMode, trades]);

  const openTrades = useMemo(() => trades.filter((t) => t.status === "Open"), [trades]);
  const closedTrades = useMemo(() => trades.filter((t) => t.status === "Closed"), [trades]);
  const totalProfit = useMemo(() => trades.reduce((sum, t) => sum + Number(t.profitLoss ?? 0), 0), [trades]);

  async function handleDelete(trade: Trade) {
    const confirmed = window.confirm(`Delete ${trade.pair} trade from ${trade.date}?`);
    if (confirmed) await deleteTrade(trade.id);
  }

  async function handleEdit(input: NewTradeInput) {
    if (!editingTrade) return;
    await updateTrade(editingTrade.id, input as Partial<Trade>);
    setEditingTrade(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Trade Management Terminal</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">Trades</h1>
          <p className="mt-1 text-sm text-text-secondary">Manage, filter, and analyze all your trading activity from one professional terminal.</p>
        </div>
        <Link
          href="/new-trade"
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-5 py-3 text-sm font-semibold text-gold transition-all hover:bg-gold/20 hover:shadow-glow"
        >
          <Plus className="h-4 w-4" />
          New Trade
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Total Trades" value={String(trades.length)} detail={`${openTrades.length} open, ${closedTrades.length} closed`} tone="neutral" />
        <StatCard icon={<Zap className="h-4 w-4" />} label="Win Rate" value={`${metrics.winRate}%`} detail={`${metrics.wins}W / ${metrics.losses}L`} tone={metrics.winRate >= 50 ? "profit" : "loss"} />
        <StatCard icon={totalProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} label="Total P/L" value={money(totalProfit)} detail={`${trades.length} trades`} tone={totalProfit >= 0 ? "profit" : "loss"} />
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Avg R-Multiple" value={`${metrics.averageR.toFixed(2)}R`} detail={`Profit factor: ${metrics.profitFactor?.toFixed(2) ?? "N/A"}`} tone={metrics.averageR >= 0 ? "profit" : "loss"} />
      </div>

      <section className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                  tab === item ? "bg-gold/10 text-gold shadow-glow" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                )}
              >
                {item}
                <span className="ml-1.5 text-xs opacity-60">
                  {item === "All" && trades.length}
                  {item === "Open" && openTrades.length}
                  {item === "Closed" && closedTrades.length}
                  {item === "Wins" && trades.filter((t) => t.finalResult === "Win").length}
                  {item === "Losses" && trades.filter((t) => t.finalResult === "Loss").length}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search trades..."
                className="w-full rounded-lg border border-border-subtle bg-surface-panel pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:ring-2 focus:ring-gold/10 lg:w-64"
              />
            </div>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-lg border border-border-subtle bg-surface-panel px-3 py-2.5 text-sm text-text-primary focus:border-gold focus:ring-2 focus:ring-gold/10"
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="profit-desc">Highest P/L</option>
              <option value="profit-asc">Lowest P/L</option>
            </select>
            <div className="hidden flex-wrap gap-2 lg:flex">
              <ExportBtn onClick={() => exportTradesCsv(filteredTrades)} label="CSV" />
              <ExportBtn onClick={() => exportTradesExcel(filteredTrades)} label="Excel" />
              <ExportBtn onClick={() => void exportFullReportPdf(filteredTrades, metrics)} label="PDF" />
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left">
                <th className="pb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Date</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Pair</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Type</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Strategy</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Session</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Risk</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">P/L</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">R-Multiple</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Status</th>
                <th className="pb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-text-muted">
                    <BarChart3 className="mx-auto mb-3 h-8 w-8 opacity-40" />
                    <p className="text-sm">No trades found.</p>
                    <Link href="/new-trade" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-dim">
                      <Plus className="h-3 w-3" />
                      Record your first trade
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => (
                  <tr key={trade.id} className="transition hover:bg-surface-hover">
                    <td className="py-3 text-text-secondary">{shortDate(trade.date)}</td>
                    <td className="py-3 font-semibold text-text-primary">{trade.pair}</td>
                    <td className="py-3">
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", trade.tradeType === "Buy" ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss")}>
                        {trade.tradeType}
                      </span>
                    </td>
                    <td className="py-3 text-text-secondary">{trade.strategy}</td>
                    <td className="py-3 text-text-muted">{trade.session}</td>
                    <td className="py-3 text-text-secondary">{trade.riskAmount ? money(trade.riskAmount) : "-"}</td>
                    <td className={cn("py-3 font-semibold", Number(trade.profitLoss ?? 0) >= 0 ? "text-profit" : "text-loss")}>
                      {trade.profitLoss != null ? money(Number(trade.profitLoss)) : "-"}
                    </td>
                    <td className="py-3 text-text-secondary">{trade.rMultiple ? `${trade.rMultiple}R` : "-"}</td>
                    <td className="py-3">
                      <StatusBadge status={trade.status} result={trade.finalResult} />
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/trades/${trade.id}`} className="rounded-md p-1.5 text-text-muted transition hover:bg-surface-elevated hover:text-gold">
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button type="button" onClick={() => setEditingTrade(trade)} className="rounded-md p-1.5 text-text-muted transition hover:bg-surface-elevated hover:text-text-primary">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {trade.status === "Open" && (
                          <button type="button" onClick={() => setClosingTrade(trade)} className="rounded-md p-1.5 text-text-muted transition hover:bg-profit/10 hover:text-profit">
                            <Zap className="h-4 w-4" />
                          </button>
                        )}
                        <button type="button" onClick={() => void handleDelete(trade)} className="rounded-md p-1.5 text-text-muted transition hover:bg-loss/10 hover:text-loss">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredTrades.length > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-4 text-xs text-text-muted">
            <span>Showing {filteredTrades.length} of {trades.length} trades</span>
            <span>Total P/L: <span className={cn("font-bold", totalProfit >= 0 ? "text-profit" : "text-loss")}>{money(totalProfit)}</span></span>
          </div>
        )}
      </section>

      {closingTrade && <CloseTradeDialog trade={closingTrade} onClose={() => setClosingTrade(null)} onSave={(details) => closeTrade(closingTrade.id, details)} />}
      {editingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border-subtle bg-surface-card p-6 shadow-soft">
            <TradeForm
              initialTrade={editingTrade}
              onSubmit={(input) => void handleEdit(input)}
              onCancel={() => setEditingTrade(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: "profit" | "loss" | "neutral" }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-4 shadow-soft transition-all hover:border-border hover:shadow-card-hover">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">{label}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone === "profit" ? "bg-profit/10 text-profit" : tone === "loss" ? "bg-loss/10 text-loss" : "bg-surface-elevated text-text-muted")}>
          {icon}
        </span>
      </div>
      <p className={cn("mt-3 text-2xl font-black tracking-tight", tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-text-primary")}>{value}</p>
      <p className="mt-1 text-xs text-text-muted">{detail}</p>
    </div>
  );
}

function ExportBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-panel px-3 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary">
      <Download className="h-3 w-3" />
      {label}
    </button>
  );
}
