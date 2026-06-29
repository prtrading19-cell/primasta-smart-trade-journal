"use client";

import Link from "next/link";
import { Download, FileText, History, Save, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppData } from "@/context/AppDataContext";
import { buildGoldBiasSummary, getGoldChecklistResult } from "@/lib/goldResearch";
import { exportGoldBiasSummaryPdf, exportGoldResearchCsv, exportGoldResearchPackPdf } from "@/lib/goldResearchExporters";
import { cn } from "@/lib/format";
import {
  DEFAULT_GOLD_RESEARCH_CHECKLIST,
  GOLD_DRIVER_NAMES,
  GOLD_PERSONAL_RULE,
  GOLD_RESEARCH_CHECKLIST_LABELS,
  GOLD_SESSION_WINDOWS,
  type GoldAnalysisInput,
  type GoldDriverAnalysis,
  type GoldDriverName,
  type GoldResearchChecklist
} from "@/types/goldResearch";

const today = () => new Date().toISOString().slice(0, 10);

export function GoldResearchDesk() {
  const { goldResearchReports, addGoldResearchReport } = useAppData();
  const [selectedDriver, setSelectedDriver] = useState<GoldDriverName>("DXY / US Dollar");
  const [reportDate, setReportDate] = useState(today());
  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [chartObservation, setChartObservation] = useState("");
  const [sourceLink, setSourceLink] = useState("");
  const [notes, setNotes] = useState("");
  const [analysis, setAnalysis] = useState<GoldDriverAnalysis | null>(null);
  const [checklist, setChecklist] = useState<GoldResearchChecklist>(DEFAULT_GOLD_RESEARCH_CHECKLIST);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  const biasSummary = useMemo(() => buildGoldBiasSummary(goldResearchReports), [goldResearchReports]);
  const checklistResult = useMemo(() => getGoldChecklistResult(checklist), [checklist]);
  const todayReports = useMemo(() => goldResearchReports.filter((report) => report.reportDate === today()), [goldResearchReports]);
  const weeklyReports = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return goldResearchReports.filter((report) => new Date(`${report.reportDate}T00:00:00`) >= cutoff);
  }, [goldResearchReports]);

  async function analyzeDriver() {
    setAnalyzing(true);
    setMessage("");

    try {
      const payload: GoldAnalysisInput = {
        driverName: selectedDriver,
        headline,
        summary,
        currentValue,
        chartObservation,
        sourceLink,
        notes
      };

      const response = await fetch("/api/analyze-gold-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Unable to analyze this driver.");
      setAnalysis((await response.json()) as GoldDriverAnalysis);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to analyze this driver.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveReport() {
    if (!analysis) return;
    setSaving(true);
    setMessage("");

    try {
      await addGoldResearchReport({
        reportDate,
        headline,
        summary,
        currentValue,
        chartObservation,
        sourceLink,
        notes,
        ...analysis
      });
      setMessage("Gold research report saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save Gold research.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Gold Research</p>
          <h1 className="text-2xl font-bold tracking-tight">PRIMASTA GOLD RESEARCH DESK</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Are Gold drivers, liquidity, structure, risk, and psychology aligned, or should you wait?</p>
        </div>
        <Link href="/gold-research/history" className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-800">
          <History className="h-4 w-4" />
          History
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {GOLD_DRIVER_NAMES.map((driver) => (
          <button
            key={driver}
            type="button"
            onClick={() => {
              setSelectedDriver(driver);
              setAnalysis(null);
              setShowSummary(false);
            }}
            className={cn(
              "rounded-lg border px-4 py-3 text-left text-sm font-semibold transition",
              selectedDriver === driver
                ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            )}
          >
            Analyze {driver}
          </button>
        ))}
        <button type="button" onClick={() => setShowSummary(true)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Generate Full Gold Bias Summary
        </button>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">{selectedDriver}</h2>
            <input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} className={inputClass} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="News headline">
              <input value={headline} onChange={(event) => setHeadline(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Current data/value">
              <input value={currentValue} onChange={(event) => setCurrentValue(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Source link">
              <input value={sourceLink} onChange={(event) => setSourceLink(event.target.value)} className={inputClass} />
            </Field>
            <Field label="My chart observation">
              <input value={chartObservation} onChange={(event) => setChartObservation(event.target.value)} className={inputClass} />
            </Field>
            <Field label="News article or summary">
              <textarea value={summary} onChange={(event) => setSummary(event.target.value)} className={`${inputClass} min-h-28`} />
            </Field>
            <Field label="Notes">
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} min-h-28`} />
            </Field>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => void analyzeDriver()} disabled={analyzing} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-950">
              <Search className="h-4 w-4" />
              {analyzing ? "Analyzing..." : "Analyze Driver"}
            </button>
            <button type="button" onClick={() => void saveReport()} disabled={!analysis || saving} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-5 py-3 text-sm font-semibold disabled:opacity-60 dark:border-slate-800">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Report"}
            </button>
          </div>
          {message ? <p className="mt-3 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">{message}</p> : null}
        </div>

        <div className="space-y-4">
          {analysis ? <AnalysisPanel analysis={analysis} /> : <EmptyPanel />}
          {showSummary ? <SummaryPanel summary={biasSummary} /> : null}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Gold Pre-Trade Checklist</h2>
            <span className={cn("rounded-md px-3 py-1 text-xs font-bold", checklistBadgeClass(checklistResult.result))}>
              {checklistResult.result} {checklistResult.score}/{checklistResult.total}
            </span>
          </div>
          <div className="mt-4 grid gap-2">
            {Object.entries(GOLD_RESEARCH_CHECKLIST_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={checklist[key as keyof GoldResearchChecklist]}
                  onChange={(event) => setChecklist((current) => ({ ...current, [key]: event.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Gold Trading Windows in SAST</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {GOLD_SESSION_WINDOWS.map((window) => (
              <div key={window.time} className="rounded-md border border-slate-200 p-4 text-sm dark:border-slate-800">
                <p className="font-semibold">{window.time}</p>
                <p className="mt-1 font-medium">{window.name}</p>
                <p className="mt-2 text-slate-500 dark:text-slate-400">{window.note}</p>
                <p className="mt-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{window.rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Research Exports</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{GOLD_PERSONAL_RULE}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ExportButton onClick={() => void exportGoldResearchPackPdf(todayReports, checklistResult.result, `primasta-gold-research-today-${today()}.pdf`, "Today's Gold Research")} label="Today PDF" />
            <ExportButton onClick={() => void exportGoldResearchPackPdf(weeklyReports, checklistResult.result, `primasta-gold-research-weekly-${today()}.pdf`, "Weekly Gold Research")} label="Weekly PDF" />
            <ExportButton onClick={() => exportGoldResearchCsv(goldResearchReports)} label="All CSV" />
            <ExportButton onClick={() => void exportGoldBiasSummaryPdf(goldResearchReports, checklistResult.result)} label="Bias PDF" />
          </div>
        </div>
      </section>
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: GoldDriverAnalysis }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{analysis.driverName}</h2>
        <span className={cn("rounded-md px-3 py-1 text-xs font-bold", biasClass(analysis.goldBias))}>{analysis.goldBias}</span>
        <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{analysis.confidenceScore}%</span>
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <ResultRow label="Impact" value={analysis.impactLevel} />
        <ResultRow label="Time sensitivity" value={analysis.timeSensitivity} />
        <ResultRow label="Checklist effect" value={analysis.checklistEffect} />
        <ResultRow label="Explanation" value={analysis.explanation} />
        <ResultRow label="What this means for Gold" value={analysis.goldMeaning} />
        <ResultRow label="Trading caution" value={analysis.tradingCaution} />
        <ResultRow label="Final guidance" value={analysis.finalGuidance} />
      </div>
    </div>
  );
}

function SummaryPanel({ summary }: { summary: ReturnType<typeof buildGoldBiasSummary> }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Full Gold Bias Summary</h2>
        <span className={cn("rounded-md px-3 py-1 text-xs font-bold", overallBiasClass(summary.overallGoldBias))}>{summary.overallGoldBias}</span>
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <ResultRow label="Bullish drivers" value={String(summary.bullishDriversCount)} />
        <ResultRow label="Bearish drivers" value={String(summary.bearishDriversCount)} />
        <ResultRow label="Mixed drivers" value={String(summary.mixedDriversCount)} />
        <ResultRow label="Strongest bullish driver" value={summary.strongestBullishDriver} />
        <ResultRow label="Strongest bearish driver" value={summary.strongestBearishDriver} />
        <ResultRow label="Main risk" value={summary.mainRisk} />
        <ResultRow label="Best session to wait for" value={summary.bestSessionToWaitFor} />
        <ResultRow label="Pre-trade verdict" value={summary.preTradeVerdict} />
      </div>
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <FileText className="mx-auto h-8 w-8 text-slate-400" />
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Choose a driver, add research notes, then analyze.</p>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-4 py-3 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="focus-ring inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function biasClass(value: string) {
  if (value === "Bullish Gold") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (value === "Bearish Gold") return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
  if (value === "Mixed / Wait") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

function overallBiasClass(value: string) {
  if (value === "Bullish") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (value === "Bearish") return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
  if (value === "Wait") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

function checklistBadgeClass(value: string) {
  if (value === "Aligned") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (value === "Mixed" || value === "Wait") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
  return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
}

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-200";
