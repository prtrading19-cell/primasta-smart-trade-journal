"use client";

import Link from "next/link";
import { ArrowLeft, Download, Eye, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppData } from "@/context/AppDataContext";
import { exportGoldReportPdf, exportGoldResearchCsv } from "@/lib/goldResearchExporters";
import { cn } from "@/lib/format";
import { type GoldBias, type GoldDriverName, type GoldResearchReport, type DailyGoldResearchReport, type GoldAutoResearchSection } from "@/types/goldResearch";
import { getEnabledDriverNames } from "@/config/driverRegistry";

const biasOptions: Array<GoldBias | "All"> = ["All", "Bullish Gold", "Bearish Gold", "Neutral", "Mixed / Wait"];
const enabledDriverNames = getEnabledDriverNames();

export function GoldResearchHistory() {
  const { goldResearchReports, dailyGoldResearchReports, deleteGoldResearchReport } = useAppData();
  const [driver, setDriver] = useState<GoldDriverName | "All">("All");
  const [bias, setBias] = useState<GoldBias | "All">("All");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<GoldResearchReport | null>(null);
  const [viewingDaily, setViewingDaily] = useState<number | null>(null);

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
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Saved TradeOS Gold driver reports.</p>
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
          {enabledDriverNames.map((item) => (
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

      {dailyGoldResearchReports.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Daily Research with Engine Analysis</h2>
          <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="table-scroll">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Bias</th>
                      <th className="px-4 py-3">Verdict</th>
                      <th className="px-4 py-3">Engine</th>
                      <th className="px-4 py-3">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {dailyGoldResearchReports.map((report, index) => {
                      const analysis = report.engineAnalysis as Record<string, unknown> | undefined;
                      const decision = analysis?.decision as Record<string, unknown> | undefined;
                      return (
                        <tr key={report.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-950/60">
                          <td className="px-4 py-3">{report.reportDate}</td>
                          <td className="px-4 py-3">{report.goldCurrentPrice || "-"}</td>
                          <td className="px-4 py-3">
                            <span className={cn("rounded-md px-2 py-1 text-xs font-bold", biasClass(report.overallGoldBias === "Bullish" ? "Bullish Gold" : report.overallGoldBias === "Bearish" ? "Bearish Gold" : "Neutral"))}>{report.overallGoldBias}</span>
                          </td>
                          <td className="px-4 py-3">{report.preTradeVerdict}</td>
                          <td className="px-4 py-3">
                            {decision ? (
                              <span className={cn("rounded-md px-2 py-1 text-xs font-bold", biasClass(String(decision.decision)))}>
                                {String(decision.decision)} ({Number(decision.overallConfidence)}%)
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">No engine data</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => setViewingDaily(index)} className={actionClass}>
                              <Eye className="h-4 w-4" />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <DailyReportDetail report={dailyGoldResearchReports[viewingDaily ?? 0] ?? null} />
          </div>
        </section>
      ) : null}
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
        <DetailRow label="Summary of the news headline" value={report.headlineSummary || "-"} />
        <DetailRow label="Summary of the news driver" value={report.newsDriverSummary || "-"} />
        <DetailRow label="Chart observation interpretation" value={report.chartObservationInterpretation || "-"} />
        <DetailRow label="Bullish Gold clues" value={formatClues(report.bullishGoldClues)} />
        <DetailRow label="Bearish Gold clues" value={formatClues(report.bearishGoldClues)} />
        <DetailRow label="Key conflict or risk" value={report.keyConflictOrRisk || "-"} />
        {Object.entries(report.driverFields ?? {}).filter(([key]) => !CORE_FIELD_KEYS.has(key)).map(([key, value]) => (
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

function DailyReportDetail({ report }: { report: DailyGoldResearchReport | null }) {
  if (!report) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">Select a daily report to view engine analysis.</div>;
  }

  const analysis = report.engineAnalysis as Record<string, unknown> | undefined;
  const decision = analysis?.decision as Record<string, unknown> | undefined;
  const categoryScores = analysis?.categoryScores as Record<string, unknown> | undefined;
  const scores = Array.isArray(categoryScores?.scores) ? (categoryScores.scores as Array<Record<string, unknown>>) : [];
  const technicalBias = analysis?.technicalBias as Record<string, unknown> | undefined;
  const institutionalFlow = analysis?.institutionalFlow as Record<string, unknown> | undefined;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Daily Research - {report.reportDate}</h2>
        {decision ? (
          <span className={cn("rounded-md px-3 py-1 text-xs font-bold", biasClass(String(decision.decision)))}>
            {String(decision.decision)} ({Number(decision.overallConfidence)}%)
          </span>
        ) : null}
      </div>

      <DetailRow label="Gold Price" value={report.goldCurrentPrice || "-"} />
      <DetailRow label="Overall Bias" value={report.overallGoldBias} />
      <DetailRow label="Pre-Trade Verdict" value={report.preTradeVerdict} />

      {decision ? (
        <div className="rounded-md bg-slate-50 px-4 py-3 dark:bg-slate-950 space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Decision Engine</p>
          <DetailRow label="Gold Score" value={String(Number(decision.overallGoldScore).toFixed(1))} />
          <DetailRow label="Risk Rating" value={String(decision.riskRating)} />
          <DetailRow label="Decision Quality" value={String(decision.decisionQuality)} />
          <DetailRow label="Summary" value={String(decision.summary)} />
        </div>
      ) : (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          No engine analysis available for this report. Run auto-fill on the Gold Research page to generate engine analysis.
        </div>
      )}

      {scores.length > 0 ? (
        <div className="rounded-md bg-slate-50 px-4 py-3 dark:bg-slate-950 space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Category Scores</p>
          <div className="grid gap-2 md:grid-cols-2">
            {scores.map((score) => (
              <div key={String(score.categoryId)} className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
                <span className="font-semibold">{String(score.categoryTitle)}</span>
                <span className={cn("rounded px-2 py-0.5 font-bold", biasClass(String(score.bias)))}>{Number(score.weightedScore).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {technicalBias ? (
        <div className="rounded-md bg-slate-50 px-4 py-3 dark:bg-slate-950 space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Technical Bias</p>
          <DetailRow label="Bias" value={String(technicalBias.technicalBias)} />
          <DetailRow label="Confidence" value={`${Number(technicalBias.confidence)}%`} />
          <DetailRow label="Market Structure" value={String(technicalBias.marketStructure)} />
          <DetailRow label="Summary" value={String(technicalBias.summary)} />
        </div>
      ) : null}

      {institutionalFlow ? (
        <div className="rounded-md bg-slate-50 px-4 py-3 dark:bg-slate-950 space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Institutional Flow</p>
          <DetailRow label="Bias" value={String(institutionalFlow.institutionalBias)} />
          <DetailRow label="Confidence" value={`${Number(institutionalFlow.confidence)}%`} />
          <DetailRow label="Summary" value={String(institutionalFlow.summary)} />
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Raw Sections ({report.sections.length})</p>
        {report.sections.slice(0, 3).map((section: GoldAutoResearchSection) => (
          <DetailRow key={section.driver} label={section.driver} value={section.newsSummary || section.reason || "-"} />
        ))}
      </div>
    </div>
  );
}

const CORE_FIELD_KEYS = new Set(["newsHeadline", "newsSummary", "chartObservation", "sourceLink", "notes"]);

function formatClues(clues: string[] | undefined) {
  return clues?.length ? clues.join("; ") : "None detected";
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
