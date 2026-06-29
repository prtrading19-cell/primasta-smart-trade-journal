"use client";

import Link from "next/link";
import { ArrowLeft, Download, Eye, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppData } from "@/context/AppDataContext";
import { exportGoldReportPdf, exportGoldResearchCsv } from "@/lib/goldResearchExporters";
import { cn } from "@/lib/format";
import { GOLD_DRIVER_NAMES, type GoldBias, type GoldDriverName, type GoldResearchReport } from "@/types/goldResearch";

const biasOptions: Array<GoldBias | "All"> = ["All", "Bullish Gold", "Bearish Gold", "Neutral", "Mixed / Wait"];

export function GoldResearchHistory() {
  const { goldResearchReports, deleteGoldResearchReport } = useAppData();
  const [driver, setDriver] = useState<GoldDriverName | "All">("All");
  const [bias, setBias] = useState<GoldBias | "All">("All");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<GoldResearchReport | null>(null);

  const filteredReports = useMemo(() => {
    return goldResearchReports.filter((report) => {
      if (driver !== "All" && report.driverName !== driver) return false;
      if (bias !== "All" && report.goldBias !== bias) return false;
      if (date && report.reportDate !== date) return false;
      const driverFieldText = Object.values(report.driverFields ?? {}).join(" ");
      const haystack = `${report.driverName} ${report.inputHeadline} ${report.inputSummary} ${report.goldBias} ${report.explanation} ${report.sourceLink ?? ""} ${report.notes ?? ""} ${driverFieldText}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [bias, date, driver, goldResearchReports, search]);

  async function handleDelete(report: GoldResearchReport) {
    if (window.confirm(`Delete ${report.driverName} research from ${report.reportDate}?`)) {
      await deleteGoldResearchReport(report.id);
      if (viewing?.id === report.id) setViewing(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/gold-research" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <ArrowLeft className="h-4 w-4" />
            Back to Gold Research
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Gold Research History</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Saved PRIMASTA Gold driver reports.</p>
        </div>
        <button type="button" onClick={() => exportGoldResearchCsv(filteredReports)} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-800">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </header>

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 xl:grid-cols-4">
        <input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} placeholder="Search research" />
        <select value={driver} onChange={(event) => setDriver(event.target.value as GoldDriverName | "All")} className={inputClass}>
          <option>All</option>
          {GOLD_DRIVER_NAMES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={bias} onChange={(event) => setBias(event.target.value as GoldBias | "All")} className={inputClass}>
          {biasOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} aria-label="Filter date" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="table-scroll">
            <table className="min-w-[1180px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Bias</th>
                  <th className="px-4 py-3">Headline</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Impact</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Guidance</th>
                  <th className="px-4 py-3">View details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-950/60">
                    <td className="px-4 py-3">{report.reportDate}</td>
                    <td className="px-4 py-3 font-semibold">{report.driverName}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-md px-2 py-1 text-xs font-bold", biasClass(report.goldBias))}>{report.goldBias}</span>
                    </td>
                    <td className="max-w-[240px] px-4 py-3">{report.inputHeadline || "-"}</td>
                    <td className="max-w-[180px] px-4 py-3">
                      {report.sourceLink ? (
                        <a href={report.sourceLink} target="_blank" rel="noreferrer" className="font-semibold text-slate-700 underline underline-offset-4 dark:text-slate-200">
                          Source
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">{report.impactLevel}</td>
                    <td className="px-4 py-3">{report.confidenceScore}%</td>
                    <td className="max-w-[260px] px-4 py-3">{report.finalGuidance}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setViewing(report)} className={actionClass}>
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                        <button type="button" onClick={() => void exportGoldReportPdf(report)} className={actionClass}>
                          <Download className="h-4 w-4" />
                          PDF
                        </button>
                        <button type="button" onClick={() => void handleDelete(report)} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredReports.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                      No Gold research reports match this view.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <ReportDetail report={viewing ?? filteredReports[0] ?? null} />
      </section>
    </div>
  );
}

function ReportDetail({ report }: { report: GoldResearchReport | null }) {
  if (!report) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">Select a report to view details.</div>;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{report.driverName}</h2>
        <span className={cn("rounded-md px-3 py-1 text-xs font-bold", biasClass(report.goldBias))}>{report.goldBias}</span>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <DetailRow label="Date" value={report.reportDate} />
        <DetailRow label="Headline" value={report.inputHeadline || "-"} />
        <DetailRow label="Summary" value={report.inputSummary || "-"} />
        <DetailRow label="Current data/value" value={report.currentValue || "-"} />
        <DetailRow label="Chart observation" value={report.chartObservation || "-"} />
        {Object.entries(report.driverFields ?? {}).map(([key, value]) => (
          <DetailRow key={key} label={formatDriverFieldLabel(key)} value={value || "-"} />
        ))}
        <DetailRow label="Explanation" value={report.explanation} />
        <DetailRow label="What this means for Gold" value={report.goldMeaning} />
        <DetailRow label="Checklist effect" value={report.checklistEffect} />
        <DetailRow label="Trading caution" value={report.tradingCaution} />
        <DetailRow label="Final guidance" value={report.finalGuidance} />
        <DetailRow label="Source" value={report.sourceLink || "-"} />
        <DetailRow label="Notes" value={report.notes || "-"} />
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

function formatDriverFieldLabel(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function biasClass(value: string) {
  if (value === "Bullish Gold") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (value === "Bearish Gold") return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
  if (value === "Mixed / Wait") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50";

const actionClass =
  "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";
