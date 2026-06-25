"use client";

import { Download } from "lucide-react";
import { calculateMetrics } from "@/lib/calculations";
import { exportFullReportPdf, exportTradesCsv, exportTradesExcel, exportTradesJson, filteredFilename } from "@/lib/exporters";
import { useAppData } from "@/context/AppDataContext";

export default function ExportPage() {
  const { trades, metrics } = useAppData();
  const openTrades = trades.filter((trade) => trade.status === "Open");
  const closedTrades = trades.filter((trade) => trade.status === "Closed");
  const month = new Date().toISOString().slice(0, 7);
  const monthlyTrades = trades.filter((trade) => trade.status === "Closed" && trade.date.startsWith(month));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Reports and backups</p>
        <h1 className="text-2xl font-bold tracking-tight">Export</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The main performance report clearly uses closed trades only for performance calculations.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ExportCard title="Export all trades as CSV" description="Spreadsheet-friendly text export for all open and closed trades." onClick={() => exportTradesCsv(trades)} />
        <ExportCard title="Export all trades as Excel" description="Downloads an Excel-compatible .xls table." onClick={() => exportTradesExcel(trades)} />
        <ExportCard title="Export JSON backup" description="Full structured backup of all journal data." onClick={() => exportTradesJson(trades)} />
        <ExportCard title="Export full report as PDF" description="Performance report with dashboard metrics and closed trade table." onClick={() => void exportFullReportPdf(trades, metrics, filteredFilename("primasta-full-report"))} />
        <ExportCard
          title="Export monthly report as PDF"
          description={`Closed-trade report for ${month}.`}
          onClick={() => void exportFullReportPdf(monthlyTrades, calculateMetrics(monthlyTrades), filteredFilename(`primasta-monthly-${month}`), `Monthly Report: ${month}`)}
        />
        <ExportCard title="Export open trades report" description="Open trades only. Performance metrics remain excluded." onClick={() => void exportFullReportPdf(openTrades, calculateMetrics(openTrades), filteredFilename("primasta-open-trades"), "Open Trades Report")} />
        <ExportCard title="Export closed trades report" description="Closed trades only with performance summaries." onClick={() => void exportFullReportPdf(closedTrades, calculateMetrics(closedTrades), filteredFilename("primasta-closed-trades"), "Closed Trades Report")} />
      </section>
    </div>
  );
}

function ExportCard({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white dark:bg-white dark:text-slate-950">
        <Download className="h-4 w-4" />
      </span>
      <span className="mt-4 block font-semibold">{title}</span>
      <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{description}</span>
    </button>
  );
}
