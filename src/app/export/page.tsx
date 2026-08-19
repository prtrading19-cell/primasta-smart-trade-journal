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
    <div className="space-y-6 animate-fade-in">
      <header className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          <div className="p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">TradeOS Reports</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Export</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">The main performance report clearly uses closed trades only for performance calculations.</p>
          </div>
        </div>
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
      className="focus-ring group rounded-xl border border-border-subtle bg-surface-card p-5 text-left transition-all duration-300 hover:border-border hover:shadow-card-hover"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold transition-all group-hover:shadow-glow">
        <Download className="h-4 w-4" />
      </span>
      <span className="mt-4 block font-bold text-text-primary">{title}</span>
      <span className="mt-1 block text-sm text-text-muted">{description}</span>
    </button>
  );
}
