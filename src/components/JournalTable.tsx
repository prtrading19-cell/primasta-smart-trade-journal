"use client";

import Link from "next/link";
import { Download, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { CloseTradeDialog } from "@/components/CloseTradeDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { TradeForm } from "@/components/TradeForm";
import { useAppData } from "@/context/AppDataContext";
import { exportTradePdf } from "@/lib/exporters";
import { cn, money, number, shortDate } from "@/lib/format";
import { getAPlusScore, isNoTradeObservation, isRuleFollowed } from "@/lib/calculations";
import type { NewTradeInput, Trade, TradeResult } from "@/types/trade";

type Tab = "All Trades" | "Open Trades" | "Closed Trades" | "Wins" | "Losses" | "Break-even";
type SortMode = "date-desc" | "date-asc" | "profit-desc" | "profit-asc";

const tabs: Tab[] = ["All Trades", "Open Trades", "Closed Trades", "Wins", "Losses", "Break-even"];

export function JournalTable({ compactOpenOnly = false }: { compactOpenOnly?: boolean }) {
  const { trades, closeTrade, deleteTrade, updateTrade } = useAppData();
  const [tab, setTab] = useState<Tab>(compactOpenOnly ? "Open Trades" : "All Trades");
  const [search, setSearch] = useState("");
  const [pair, setPair] = useState("All");
  const [strategy, setStrategy] = useState("All");
  const [result, setResult] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("date-desc");
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const pairs = useMemo(() => unique(trades.map((trade) => trade.pair)), [trades]);
  const strategies = useMemo(() => unique(trades.map((trade) => trade.strategy)), [trades]);

  const filteredTrades = useMemo(() => {
    return trades
      .filter((trade) => {
        if (compactOpenOnly && (trade.status !== "Open" || isNoTradeObservation(trade))) return false;
        if (tab === "Open Trades" && trade.status !== "Open") return false;
        if (tab === "Closed Trades" && trade.status !== "Closed") return false;
        if (tab === "Wins" && trade.finalResult !== "Win") return false;
        if (tab === "Losses" && trade.finalResult !== "Loss") return false;
        if (tab === "Break-even" && trade.finalResult !== "Break-even") return false;
        if (pair !== "All" && trade.pair !== pair) return false;
        if (strategy !== "All" && trade.strategy !== strategy) return false;
        if (result !== "All" && trade.finalResult !== result) return false;
        if (fromDate && trade.date < fromDate) return false;
        if (toDate && trade.date > toDate) return false;

        const haystack =
          `${trade.pair} ${trade.strategy} ${trade.setupGrade ?? ""} ${trade.htfBias ?? ""} ${trade.liquiditySwept ?? ""} ${trade.entryPoi ?? ""} ${trade.confirmationTimeframe ?? ""} ${trade.newsRisk ?? ""} ${trade.session} ${trade.entryReason} ${trade.mistakeMade ?? ""}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
      .sort((a, b) => {
        if (sortMode === "date-asc") return a.date.localeCompare(b.date);
        if (sortMode === "date-desc") return b.date.localeCompare(a.date);
        if (sortMode === "profit-asc") return Number(a.profitLoss ?? 0) - Number(b.profitLoss ?? 0);
        return Number(b.profitLoss ?? 0) - Number(a.profitLoss ?? 0);
      });
  }, [compactOpenOnly, fromDate, pair, result, search, sortMode, strategy, tab, toDate, trades]);

  async function handleDelete(trade: Trade) {
    const confirmed = window.confirm(`Delete ${trade.pair} trade from ${trade.date}?`);
    if (confirmed) {
      await deleteTrade(trade.id);
    }
  }

  async function handleEdit(input: NewTradeInput) {
    if (!editingTrade) return;
    await updateTrade(editingTrade.id, input as Partial<Trade>);
    setEditingTrade(null);
  }

  return (
    <div className="space-y-4">
      {!compactOpenOnly ? (
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium",
                tab === item ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      {!compactOpenOnly ? (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 xl:grid-cols-6">
          <input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} placeholder="Search trades" />
          <select value={pair} onChange={(event) => setPair(event.target.value)} className={inputClass}>
            <option>All</option>
            {pairs.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select value={strategy} onChange={(event) => setStrategy(event.target.value)} className={inputClass}>
            <option>All</option>
            {strategies.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select value={result} onChange={(event) => setResult(event.target.value)} className={inputClass}>
            <option>All</option>
            <option>Win</option>
            <option>Loss</option>
            <option>Break-even</option>
          </select>
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className={inputClass} aria-label="From date" />
          <div className="flex gap-2">
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className={inputClass} aria-label="To date" />
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className={inputClass} aria-label="Sort">
              <option value="date-desc">Newest</option>
              <option value="date-asc">Oldest</option>
              <option value="profit-desc">P/L high</option>
              <option value="profit-asc">P/L low</option>
            </select>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="table-scroll">
          <table className="min-w-[1840px] w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                {[
                  "Date",
                  "Pair",
                  "Buy/Sell",
                  "Strategy",
                  "Setup Grade",
                  "A+ Score",
                  "HTF Bias",
                  "Liquidity Swept",
                  "Entry POI",
                  "Confirm TF",
                  "News Risk",
                  "Session",
                  "Entry",
                  "SL",
                  "TP",
                  "Lot",
                  "Risk",
                  "Exit",
                  "Result",
                  "P/L",
                  "R",
                  "Mistake",
                  "Rules",
                  "Notes",
                  "Action"
                ].map((heading) => (
                  <th key={heading} className="px-3 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-950/60">
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{shortDate(trade.date)}</td>
                  <td className="px-3 py-3 font-semibold">{trade.pair}</td>
                  <td className="px-3 py-3">{trade.tradeType}</td>
                  <td className="max-w-[220px] px-3 py-3">{trade.strategy}</td>
                  <td className="px-3 py-3">{trade.setupGrade ?? "-"}</td>
                  <td className={cn("px-3 py-3 font-semibold", getAPlusScore(trade) >= 13 && "text-profit", getAPlusScore(trade) < 9 && "text-loss")}>{getAPlusScore(trade)}/15</td>
                  <td className="px-3 py-3">{trade.htfBias ?? "-"}</td>
                  <td className="px-3 py-3">{trade.liquiditySwept ?? "-"}</td>
                  <td className="px-3 py-3">{trade.entryPoi ?? "-"}</td>
                  <td className="px-3 py-3">{trade.confirmationTimeframe ?? "-"}</td>
                  <td className="px-3 py-3">{trade.newsRisk ?? "-"}</td>
                  <td className="px-3 py-3">{trade.session}</td>
                  <td className="px-3 py-3">{trade.entryPrice}</td>
                  <td className="px-3 py-3">{trade.stopLoss}</td>
                  <td className="px-3 py-3">{trade.takeProfit}</td>
                  <td className="px-3 py-3">{trade.lotSize}</td>
                  <td className="px-3 py-3">{money(trade.riskAmount)}</td>
                  <td className="px-3 py-3">{trade.exitPrice ?? "-"}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={trade.status} result={trade.finalResult as TradeResult | undefined} />
                  </td>
                  <td className={cn("px-3 py-3 font-semibold", Number(trade.profitLoss ?? 0) > 0 && "text-profit", Number(trade.profitLoss ?? 0) < 0 && "text-loss")}>
                    {trade.status === "Closed" ? money(Number(trade.profitLoss ?? 0)) : "-"}
                  </td>
                  <td className="px-3 py-3">{trade.status === "Closed" ? number(Number(trade.rMultiple ?? 0)) : "-"}</td>
                  <td className="max-w-[160px] px-3 py-3">{trade.mistakeMade || "-"}</td>
                  <td className="px-3 py-3">{isRuleFollowed(trade.checklist) ? "Yes" : "No"}</td>
                  <td className="max-w-[220px] px-3 py-3">{trade.lessonLearned || trade.entryReason}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/trades/${trade.id}`} className={actionClass} title="View trade">
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                      {trade.status === "Open" ? (
                        <button type="button" onClick={() => setClosingTrade(trade)} className="rounded-md bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
                          Close Trade
                        </button>
                      ) : (
                        <button type="button" onClick={() => void exportTradePdf(trade)} className={actionClass} title="Export trade PDF">
                          <Download className="h-4 w-4" />
                          PDF
                        </button>
                      )}
                      <button type="button" onClick={() => setEditingTrade(trade)} className={actionClass} title="Edit trade">
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button type="button" onClick={() => void handleDelete(trade)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!filteredTrades.length ? (
                <tr>
                  <td colSpan={25} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <p>{compactOpenOnly ? "No open trades right now." : "No trades match this view."}</p>
                      <Link href="/new-trade" className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                        <Plus className="h-4 w-4" />
                        Add new trade
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {closingTrade ? <CloseTradeDialog trade={closingTrade} onClose={() => setClosingTrade(null)} onSave={(details) => closeTrade(closingTrade.id, details)} /> : null}

      {editingTrade ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-5 shadow-soft dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Edit trade</p>
                <h2 className="text-xl font-semibold">
                  {editingTrade.pair} {editingTrade.tradeType}
                </h2>
              </div>
              <button type="button" onClick={() => setEditingTrade(null)} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-800">
                Close
              </button>
            </div>
            <TradeForm initialTrade={editingTrade} submitLabel="Save changes" onSubmit={handleEdit} onCancel={() => setEditingTrade(null)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50";

const actionClass =
  "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";
