"use client";

import Link from "next/link";
import { ArrowLeft, Eye, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppData } from "@/context/AppDataContext";
import { cn, number, shortDate } from "@/lib/format";
import type { LotMarginCalculation } from "@/types/lotMargin";

export function LotMarginHistory() {
  const { lotMarginCalculations, deleteLotMarginCalculation } = useAppData();
  const [viewing, setViewing] = useState<LotMarginCalculation | null>(null);
  const sorted = useMemo(() => [...lotMarginCalculations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [lotMarginCalculations]);

  async function handleDelete(calculation: LotMarginCalculation) {
    if (window.confirm(`Delete ${calculation.symbol} calculation from ${shortDate(calculation.createdAt.slice(0, 10))}?`)) {
      await deleteLotMarginCalculation(calculation.id);
      if (viewing?.id === calculation.id) setViewing(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <Link href="/calculator" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <ArrowLeft className="h-4 w-4" />
          Back to Calculator
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Lot & Margin Calculation History</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Saved pre-trade risk and margin calculations.</p>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="table-scroll">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Risk %</th>
                  <th className="px-4 py-3">Entry</th>
                  <th className="px-4 py-3">Stop</th>
                  <th className="px-4 py-3">Lot</th>
                  <th className="px-4 py-3">Margin</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sorted.map((calculation) => (
                  <tr key={calculation.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-950/60">
                    <td className="px-4 py-3">{shortDate(calculation.createdAt.slice(0, 10))}</td>
                    <td className="px-4 py-3 font-semibold">{calculation.symbol}</td>
                    <td className="px-4 py-3">{number(calculation.accountBalance, 2)}</td>
                    <td className="px-4 py-3">{calculation.riskType === "Percentage" ? `${number(calculation.riskPercentage, 2)}%` : "Fixed"}</td>
                    <td className="px-4 py-3">{number(calculation.entryPrice, 5)}</td>
                    <td className="px-4 py-3">{number(calculation.stopLossPrice, 5)}</td>
                    <td className="px-4 py-3 font-semibold">{number(calculation.calculatedLotSize, 2)}</td>
                    <td className="px-4 py-3">{number(calculation.marginRequired, 2)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-md px-2 py-1 text-xs font-bold", statusClass(calculation.finalRiskStatus))}>{calculation.finalRiskStatus}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setViewing(calculation)} className={actionClass}>
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                        <button type="button" onClick={() => void handleDelete(calculation)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!sorted.length ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                      No saved calculations yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <CalculationDetail calculation={viewing ?? sorted[0] ?? null} />
      </section>
    </div>
  );
}

function CalculationDetail({ calculation }: { calculation: LotMarginCalculation | null }) {
  if (!calculation) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">Select a calculation to view details.</div>;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{calculation.symbol}</h2>
        <span className={cn("rounded-md px-3 py-1 text-xs font-bold", statusClass(calculation.finalRiskStatus))}>{calculation.finalRiskStatus}</span>
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <DetailRow label="Date" value={new Date(calculation.createdAt).toLocaleString()} />
        <DetailRow label="Trade type" value={calculation.tradeType} />
        <DetailRow label="Account balance" value={number(calculation.accountBalance, 2)} />
        <DetailRow label="Risk amount" value={number(calculation.riskAmount, 2)} />
        <DetailRow label="Entry / Stop / TP" value={`${calculation.entryPrice} / ${calculation.stopLossPrice} / ${calculation.takeProfitPrice ?? "-"}`} />
        <DetailRow label="Lot size" value={number(calculation.calculatedLotSize, 2)} />
        <DetailRow label="Risk-to-reward" value={calculation.riskRewardRatio === null ? "TP not entered" : `1:${number(calculation.riskRewardRatio, 2)}`} />
        <DetailRow label="Notional value" value={number(calculation.notionalValue, 2)} />
        <DetailRow label="Margin required" value={number(calculation.marginRequired, 2)} />
        <DetailRow label="Margin used" value={`${number(calculation.marginUsedPercentage, 2)}%`} />
        <DetailRow label="Guidance" value={calculation.guidance} />
        <DetailRow label="Notes" value={calculation.notes || "-"} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-4 py-3 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

function statusClass(value: string) {
  if (value === "Safe") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (value === "Caution") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
  return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
}

const actionClass =
  "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";
