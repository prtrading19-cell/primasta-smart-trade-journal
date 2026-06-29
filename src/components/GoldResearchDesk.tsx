"use client";

import Link from "next/link";
import { Download, FileText, History, Save, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppData } from "@/context/AppDataContext";
import { buildGoldBiasSummary, getGoldChecklistResult, hasMeaningfulGoldResearchInput } from "@/lib/goldResearch";
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
  type GoldDriverFields,
  type GoldDriverName,
  type GoldResearchChecklist
} from "@/types/goldResearch";

type DriverFieldType = "text" | "textarea" | "select" | "url";

interface DriverFieldConfig {
  key: string;
  label: string;
  type: DriverFieldType;
  placeholder: string;
  options?: string[];
}

interface DriverFormConfig {
  description: string;
  fields: DriverFieldConfig[];
}

const today = () => new Date().toISOString().slice(0, 10);

const CORE_FIELD_KEYS = new Set(["newsHeadline", "newsSummary", "chartObservation", "sourceLink", "notes"]);

const CORE_RESEARCH_FIELDS: DriverFieldConfig[] = [
  { key: "newsHeadline", label: "News Headline", type: "text", placeholder: "Paste the exact headline or write a clear research title" },
  { key: "newsSummary", label: "News Summary", type: "textarea", placeholder: "Summarize the news driver, numbers, reaction, and important context" },
  { key: "chartObservation", label: "My Chart Observation", type: "textarea", placeholder: "Write what price structure shows: resistance, support, supply, demand, rejection, breakout, or liquidity" },
  { key: "sourceLink", label: "Source Link", type: "url", placeholder: "https://..." },
  { key: "notes", label: "Notes", type: "textarea", placeholder: "Optional: extra risk, timing, or confirmation notes" }
];

const DRIVER_FORM_CONFIG: Record<GoldDriverName, DriverFormConfig> = {
  "DXY / US Dollar": {
    description: "Dollar pressure, DXY direction, and chart context.",
    fields: [
      { key: "dxyDirection", label: "DXY current direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Sideways", "Rejecting Resistance", "Breaking Support", "Breaking Resistance"] },
      { key: "dxyCurrentLevel", label: "DXY current level", type: "text", placeholder: "Example: 105.20" },
      { key: "dxySupportResistance", label: "DXY key support/resistance", type: "text", placeholder: "Example: Resistance at 105.50, support at 104.80" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Dollar weakens as rate-cut bets rise" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the Dollar driver in a few lines" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: DXY rejecting resistance on H1" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "US Yields": {
    description: "10Y and 2Y Treasury direction, yield levels, and news reaction.",
    fields: [
      { key: "tenYearYieldDirection", label: "10Y yield direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Sideways", "Rejecting High", "Breaking Higher", "Breaking Lower"] },
      { key: "twoYearYieldDirection", label: "2Y yield direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Sideways", "Rejecting High", "Breaking Higher", "Breaking Lower"] },
      { key: "tenYearYieldValue", label: "Current 10Y yield value", type: "text", placeholder: "Example: 4.47%" },
      { key: "twoYearYieldValue", label: "Current 2Y yield value", type: "text", placeholder: "Example: 3.82%" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Treasury yields jump on higher-for-longer outlook" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the yield move and market reaction" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: 10Y pulling back from recent high" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Real Yields": {
    description: "Real-yield pressure and inflation-expectation direction.",
    fields: [
      { key: "realYieldsDirection", label: "Real yields direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Sideways", "Rejecting High", "Breaking Higher", "Breaking Lower"] },
      { key: "realYieldValue", label: "Current real yield value", type: "text", placeholder: "Example: 2.05%" },
      { key: "inflationExpectationDirection", label: "Inflation expectation direction", type: "select", placeholder: "Select direction", options: ["Rising", "Falling", "Stable"] },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Real yields pull back as inflation expectations rise" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the real-yield driver" },
      { key: "chartObservation", label: "My chart observation", type: "textarea", placeholder: "Example: Real yields rejecting recent high" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Fed Tone / FOMC": {
    description: "Fed tone, rate expectations, speakers, and key quote.",
    fields: [
      { key: "fedTone", label: "Fed tone", type: "select", placeholder: "Select tone", options: ["Hawkish", "Dovish", "Neutral", "Mixed"] },
      { key: "rateExpectation", label: "Rate expectation", type: "select", placeholder: "Select expectation", options: ["Cuts Expected", "Hike Expected", "Hold Expected", "Higher For Longer"] },
      { key: "fedSpeakerOrEvent", label: "Fed speaker or event", type: "text", placeholder: "Example: Powell speech, FOMC minutes" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Fed signals fewer cuts this year" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the Fed message" },
      { key: "keyQuote", label: "Key quote or takeaway", type: "textarea", placeholder: "Paste the quote or your main takeaway" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "CPI / PCE": {
    description: "Inflation surprise, actual/forecast/previous, and market reaction.",
    fields: [
      { key: "inflationResult", label: "Inflation result", type: "select", placeholder: "Select result", options: ["Hotter Than Expected", "Softer Than Expected", "In Line", "Mixed"] },
      { key: "inflationType", label: "CPI/PCE type", type: "select", placeholder: "Select type", options: ["CPI", "Core CPI", "PCE", "Core PCE"] },
      { key: "actualValue", label: "Actual value", type: "text", placeholder: "Example: 0.4% m/m" },
      { key: "forecastValue", label: "Forecast value", type: "text", placeholder: "Example: 0.3% m/m" },
      { key: "previousValue", label: "Previous value", type: "text", placeholder: "Example: 0.2% m/m" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: CPI comes in hotter than expected" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the inflation print and reaction" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "NFP / Jobs": {
    description: "Payrolls, unemployment, wages, and labor-market reaction.",
    fields: [
      { key: "jobsResult", label: "Jobs result", type: "select", placeholder: "Select result", options: ["Stronger Than Expected", "Weaker Than Expected", "In Line", "Mixed"] },
      { key: "nfpActual", label: "NFP actual", type: "text", placeholder: "Example: 210K" },
      { key: "nfpForecast", label: "NFP forecast", type: "text", placeholder: "Example: 170K" },
      { key: "unemploymentRate", label: "Unemployment rate", type: "text", placeholder: "Example: 4.1%, unemployment rising" },
      { key: "wageGrowth", label: "Wage growth", type: "text", placeholder: "Example: wages cooling / 0.2% m/m" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Payrolls miss forecast as unemployment rises" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the jobs report and reaction" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  Geopolitics: {
    description: "Risk level, event type, DXY reaction, and safe-haven demand.",
    fields: [
      { key: "geopoliticalRiskLevel", label: "Geopolitical risk level", type: "select", placeholder: "Select risk", options: ["Low", "Medium", "High", "Extreme"] },
      { key: "eventType", label: "Event type", type: "select", placeholder: "Select event", options: ["War", "Conflict", "Sanctions", "Election Risk", "Banking Risk", "Global Uncertainty", "Other"] },
      { key: "dxyReaction", label: "DXY reaction", type: "select", placeholder: "Select reaction", options: ["Rising", "Falling", "Stable", "Unknown"] },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Gold catches safe-haven bid as tensions rise" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the geopolitical event and market reaction" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "ETF / Central Bank Demand": {
    description: "ETF flows, central-bank demand, and longer-term Gold demand.",
    fields: [
      { key: "etfFlowDirection", label: "ETF flow direction", type: "select", placeholder: "Select flow", options: ["Inflows", "Outflows", "Flat", "Unknown"] },
      { key: "centralBankDemand", label: "Central bank demand", type: "select", placeholder: "Select demand", options: ["Strong Buying", "Weak Buying", "Selling", "Unknown"] },
      { key: "reportPeriod", label: "Report period", type: "text", placeholder: "Example: Weekly, May 2026, Q2" },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: ETF inflows rise as central banks keep buying" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the demand report" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  },
  "Custom News": {
    description: "Any Gold-related news that does not fit one driver cleanly.",
    fields: [
      { key: "newsCategory", label: "News category", type: "select", placeholder: "Select category", options: ["Dollar", "Yields", "Fed", "Inflation", "Jobs", "Geopolitics", "Gold Demand", "Other"] },
      { key: "newsHeadline", label: "News headline", type: "text", placeholder: "Example: Gold reacts to mixed macro headlines" },
      { key: "newsSummary", label: "News summary", type: "textarea", placeholder: "Summarize the news and market reaction" },
      { key: "sourceLink", label: "Source link", type: "url", placeholder: "https://..." },
      { key: "myInterpretation", label: "My interpretation", type: "textarea", placeholder: "Example: This looks Gold-supportive only if DXY keeps falling" },
      { key: "notes", label: "Notes", type: "textarea", placeholder: "Extra context or risk notes" }
    ]
  }
};

export function GoldResearchDesk() {
  const { goldResearchReports, addGoldResearchReport } = useAppData();
  const [selectedDriver, setSelectedDriver] = useState<GoldDriverName>("DXY / US Dollar");
  const [reportDate, setReportDate] = useState(today());
  const [driverFields, setDriverFields] = useState<GoldDriverFields>({});
  const [analysis, setAnalysis] = useState<GoldDriverAnalysis | null>(null);
  const [checklist, setChecklist] = useState<GoldResearchChecklist>(DEFAULT_GOLD_RESEARCH_CHECKLIST);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  const formConfig = DRIVER_FORM_CONFIG[selectedDriver];
  const driverSpecificFields = formConfig.fields.filter((fieldConfig) => !CORE_FIELD_KEYS.has(fieldConfig.key));
  const biasSummary = useMemo(() => buildGoldBiasSummary(goldResearchReports), [goldResearchReports]);
  const checklistResult = useMemo(() => getGoldChecklistResult(checklist), [checklist]);
  const todayReports = useMemo(() => goldResearchReports.filter((report) => report.reportDate === today()), [goldResearchReports]);
  const weeklyReports = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return goldResearchReports.filter((report) => new Date(`${report.reportDate}T00:00:00`) >= cutoff);
  }, [goldResearchReports]);

  async function analyzeDriver() {
    const input = buildAnalysisInput(selectedDriver, reportDate, driverFields);
    setMessage("");

    if (!reportDate) {
      setMessage("Choose a report date before analysis.");
      return;
    }

    if (!hasMeaningfulGoldResearchInput(input)) {
      setMessage("Add driver information before analysis.");
      return;
    }

    setAnalyzing(true);

    try {
      const response = await fetch("/api/analyze-gold-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const result = await response.json();

      if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "Unable to analyze this driver.");
      setAnalysis(result as GoldDriverAnalysis);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to analyze this driver.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveReport() {
    if (!analysis) return;
    const input = buildAnalysisInput(selectedDriver, reportDate, driverFields);

    if (!hasMeaningfulGoldResearchInput(input)) {
      setMessage("Add driver information before analysis.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await addGoldResearchReport({
        ...input,
        ...analysis,
        reportDate
      });
      setMessage("Gold research report saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save Gold research.");
    } finally {
      setSaving(false);
    }
  }

  function updateDriverField(key: string, value: string) {
    setDriverFields((current) => ({ ...current, [key]: value }));
    setAnalysis(null);
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
              setDriverFields({});
              setAnalysis(null);
              setMessage("");
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
            <div>
              <h2 className="text-lg font-semibold">{selectedDriver}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formConfig.description}</p>
            </div>
            <input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} className={inputClass} />
          </div>
          <div className="mt-4 space-y-5">
            {driverSpecificFields.length ? (
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Driver-specific data</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {driverSpecificFields.map((fieldConfig) => (
                    <Field key={fieldConfig.key} label={fieldConfig.label} wide={fieldConfig.type === "textarea"}>
                      <DriverInput config={fieldConfig} value={driverFields[fieldConfig.key] ?? ""} onChange={(value) => updateDriverField(fieldConfig.key, value)} />
                    </Field>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Main research inputs</p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {CORE_RESEARCH_FIELDS.map((fieldConfig) => (
                  <Field key={fieldConfig.key} label={fieldConfig.label} wide={fieldConfig.type === "textarea"}>
                    <DriverInput config={fieldConfig} value={driverFields[fieldConfig.key] ?? ""} onChange={(value) => updateDriverField(fieldConfig.key, value)} />
                  </Field>
                ))}
              </div>
            </div>
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

function DriverInput({ config, value, onChange }: { config: DriverFieldConfig; value: string; onChange: (value: string) => void }) {
  if (config.type === "select") {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        <option value="">{config.placeholder}</option>
        {config.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (config.type === "textarea") {
    return <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={config.placeholder} className={`${inputClass} min-h-28`} />;
  }

  return <input type={config.type === "url" ? "url" : "text"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={config.placeholder} className={inputClass} />;
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
        <ResultRow label="Summary of the news headline" value={analysis.headlineSummary} />
        <ResultRow label="Summary of the news driver" value={analysis.newsDriverSummary} />
        <ResultRow label="Chart observation interpretation" value={analysis.chartObservationInterpretation} />
        <ResultRow label="Bullish Gold clues" value={formatClues(analysis.bullishGoldClues)} />
        <ResultRow label="Bearish Gold clues" value={formatClues(analysis.bearishGoldClues)} />
        <ResultRow label="Key conflict or risk" value={analysis.keyConflictOrRisk} />
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
        <ResultRow label="Bullish drivers" value={`${summary.bullishDriversCount}: ${summary.bullishDrivers}`} />
        <ResultRow label="Bearish drivers" value={`${summary.bearishDriversCount}: ${summary.bearishDrivers}`} />
        <ResultRow label="Neutral drivers" value={`${summary.neutralDriversCount}: ${summary.neutralDrivers}`} />
        <ResultRow label="Mixed drivers" value={`${summary.mixedDriversCount}: ${summary.mixedDrivers}`} />
        <ResultRow label="Strongest bullish driver" value={summary.strongestBullishDriver} />
        <ResultRow label="Strongest bearish driver" value={summary.strongestBearishDriver} />
        <ResultRow label="Main conflict" value={summary.mainConflict} />
        <ResultRow label="Main risk" value={summary.mainRisk} />
        <ResultRow label="Best session to wait for" value={summary.bestSessionToWaitFor} />
        <ResultRow label="Pre-trade verdict" value={summary.preTradeVerdict} />
        <ResultRow label="Personal Gold rule" value={summary.personalRule} />
        {summary.driverSummaries.map((driverSummary) => (
          <ResultRow
            key={driverSummary.driverName}
            label={`Driver: ${driverSummary.driverName}`}
            value={`News Headline: ${driverSummary.newsHeadline} | News Summary: ${driverSummary.newsSummary} | Chart Observation: ${driverSummary.chartObservation} | Gold Bias: ${driverSummary.goldBias} | Impact: ${driverSummary.impactLevel} | Confidence: ${driverSummary.confidenceScore}% | Final Guidance: ${driverSummary.finalGuidance}`}
          />
        ))}
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

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={cn("block text-sm font-medium text-slate-700 dark:text-slate-200", wide ? "md:col-span-2" : "")}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function buildAnalysisInput(driverName: GoldDriverName, reportDate: string, driverFields: GoldDriverFields): GoldAnalysisInput {
  return {
    driverName,
    reportDate,
    headline: driverFields.newsHeadline ?? "",
    summary: driverFields.newsSummary ?? "",
    currentValue: getCurrentValue(driverName, driverFields),
    chartObservation: driverFields.chartObservation ?? "",
    sourceLink: driverFields.sourceLink ?? "",
    notes: driverFields.notes ?? "",
    driverFields
  };
}

function getCurrentValue(driverName: GoldDriverName, fields: GoldDriverFields) {
  if (driverName === "DXY / US Dollar") return fields.dxyCurrentLevel ?? "";
  if (driverName === "US Yields") return [fields.tenYearYieldValue, fields.twoYearYieldValue].filter(Boolean).join(" / ");
  if (driverName === "Real Yields") return fields.realYieldValue ?? "";
  if (driverName === "Fed Tone / FOMC") return [fields.fedTone, fields.rateExpectation, fields.fedSpeakerOrEvent].filter(Boolean).join(" / ");
  if (driverName === "CPI / PCE") return [fields.inflationType, fields.actualValue, fields.forecastValue, fields.previousValue].filter(Boolean).join(" / ");
  if (driverName === "NFP / Jobs") return [fields.nfpActual, fields.nfpForecast, fields.unemploymentRate, fields.wageGrowth].filter(Boolean).join(" / ");
  if (driverName === "Geopolitics") return [fields.geopoliticalRiskLevel, fields.eventType, fields.dxyReaction].filter(Boolean).join(" / ");
  if (driverName === "ETF / Central Bank Demand") return [fields.etfFlowDirection, fields.centralBankDemand, fields.reportPeriod].filter(Boolean).join(" / ");
  return fields.newsCategory ?? "";
}

function formatClues(clues: string[]) {
  return clues.length ? clues.join("; ") : "None detected yet";
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
