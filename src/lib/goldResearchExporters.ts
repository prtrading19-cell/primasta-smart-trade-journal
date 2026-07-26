import { buildGoldBiasSummary } from "@/lib/goldResearch";
import { GOLD_PERSONAL_RULE, type GoldChecklistResult, type GoldResearchReport } from "@/types/goldResearch";

const APP_NAME = "TradeOS";

export function exportGoldResearchCsv(reports: GoldResearchReport[], filename = "primasta-gold-research.csv") {
  const rows: Array<Record<string, string | number>> = reports.map((report) => ({
    Date: report.reportDate,
    Driver: report.driverName,
    Headline: report.inputHeadline,
    "News summary": report.inputSummary,
    "Chart observation": report.chartObservation ?? "",
    "Driver fields": formatDriverFields(report),
    Bias: report.goldBias,
    Impact: report.impactLevel,
    "Time sensitivity": report.timeSensitivity,
    Confidence: report.confidenceScore,
    "Headline summary": report.headlineSummary,
    "News driver summary": report.newsDriverSummary,
    "Chart interpretation": report.chartObservationInterpretation,
    "Bullish clues": formatClues(report.bullishGoldClues),
    "Bearish clues": formatClues(report.bearishGoldClues),
    "Key conflict or risk": report.keyConflictOrRisk,
    "Checklist effect": report.checklistEffect,
    Guidance: report.finalGuidance,
    Source: report.sourceLink ?? "",
    Notes: report.notes ?? ""
  }));
  const headers = Object.keys(rows[0] ?? emptyRow());
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

export async function exportGoldReportPdf(report: GoldResearchReport, filename = `primasta-gold-report-${report.id}.pdf`) {
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");
  const doc = new jsPDF();

  doc.setFontSize(17);
  doc.text(APP_NAME, 14, 18);
  doc.setFontSize(11);
  doc.text(`Report: ${report.driverName}`, 14, 28);

  (doc as any).autoTable({
    startY: 36,
    head: [["Field", "Value"]],
    body: reportRows(report),
    theme: "grid",
    styles: { fontSize: 9, cellWidth: "wrap" },
    columnStyles: { 1: { cellWidth: 125 } },
    headStyles: { fillColor: [15, 23, 42] }
  });

  doc.save(filename);
}

export async function exportGoldResearchPackPdf(
  reports: GoldResearchReport[],
  checklistResult: GoldChecklistResult,
  filename = "primasta-gold-research.pdf",
  title = "Gold Research Report"
) {
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape" });
  const summary = buildGoldBiasSummary(reports);

  doc.setFontSize(18);
  doc.text(APP_NAME, 14, 18);
  doc.setFontSize(11);
  doc.text(title, 14, 27);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

  (doc as any).autoTable({
    startY: 42,
    head: [["Summary", "Value"]],
    body: [
      ["Overall Gold bias", summary.overallGoldBias],
      ["Bullish drivers", String(summary.bullishDriversCount)],
      ["Bullish driver names", summary.bullishDrivers],
      ["Bearish drivers", String(summary.bearishDriversCount)],
      ["Bearish driver names", summary.bearishDrivers],
      ["Neutral drivers", String(summary.neutralDriversCount)],
      ["Neutral driver names", summary.neutralDrivers],
      ["Mixed drivers", String(summary.mixedDriversCount)],
      ["Mixed driver names", summary.mixedDrivers],
      ["Strongest bullish driver", summary.strongestBullishDriver],
      ["Strongest bearish driver", summary.strongestBearishDriver],
      ["Main conflict", summary.mainConflict],
      ["Main risk", summary.mainRisk],
      ["Best session to wait for", summary.bestSessionToWaitFor],
      ["Pre-trade verdict", summary.preTradeVerdict],
      ["Checklist result", checklistResult],
      ["Personal Gold rule", GOLD_PERSONAL_RULE]
    ],
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 23, 42] }
  });

  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Driver", "News Headline", "News Summary", "Chart Observation", "Bias", "Impact", "Confidence", "Guidance"]],
    body: summary.driverSummaries.map((report) => [
      report.driverName,
      report.newsHeadline,
      report.newsSummary,
      report.chartObservation,
      report.goldBias,
      report.impactLevel,
      `${report.confidenceScore}%`,
      report.finalGuidance
    ]),
    theme: "grid",
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] }
  });

  doc.save(filename);
}

export async function exportGoldBiasSummaryPdf(reports: GoldResearchReport[], checklistResult: GoldChecklistResult) {
  await exportGoldResearchPackPdf(reports, checklistResult, `primasta-gold-bias-summary-${new Date().toISOString().slice(0, 10)}.pdf`, "Gold Bias Summary");
}

function reportRows(report: GoldResearchReport) {
  return [
    ["Date", report.reportDate],
    ["Driver", report.driverName],
    ["Headline", report.inputHeadline || "-"],
    ["News summary", report.inputSummary || "-"],
    ["Current data/value", report.currentValue || "-"],
    ["Chart observation", report.chartObservation || "-"],
    ["Driver fields", formatDriverFields(report) || "-"],
    ["Gold bias", report.goldBias],
    ["Impact level", report.impactLevel],
    ["Time sensitivity", report.timeSensitivity],
    ["Confidence score", `${report.confidenceScore}%`],
    ["Summary of the news headline", report.headlineSummary],
    ["Summary of the news driver", report.newsDriverSummary],
    ["Chart observation interpretation", report.chartObservationInterpretation],
    ["Bullish Gold clues", formatClues(report.bullishGoldClues)],
    ["Bearish Gold clues", formatClues(report.bearishGoldClues)],
    ["Key conflict or risk", report.keyConflictOrRisk],
    ["Explanation", report.explanation],
    ["What this means for Gold", report.goldMeaning],
    ["Checklist effect", report.checklistEffect],
    ["Trading caution", report.tradingCaution],
    ["Final guidance", report.finalGuidance],
    ["Source", report.sourceLink || "-"],
    ["Notes", report.notes || "-"],
    ["Personal Gold rule", GOLD_PERSONAL_RULE]
  ];
}

function emptyRow() {
  return {
    Date: "",
    Driver: "",
    Headline: "",
    "News summary": "",
    "Chart observation": "",
    "Driver fields": "",
    Bias: "",
    Impact: "",
    "Time sensitivity": "",
    Confidence: "",
    "Headline summary": "",
    "News driver summary": "",
    "Chart interpretation": "",
    "Bullish clues": "",
    "Bearish clues": "",
    "Key conflict or risk": "",
    "Checklist effect": "",
    Guidance: "",
    Source: "",
    Notes: ""
  };
}

function formatDriverFields(report: GoldResearchReport) {
  return Object.entries(report.driverFields ?? {})
    .filter(([key]) => !CORE_FIELD_KEYS.has(key))
    .filter(([, value]) => String(value ?? "").trim())
    .map(([key, value]) => `${formatDriverFieldLabel(key)}: ${value}`)
    .join(" | ");
}

const CORE_FIELD_KEYS = new Set(["newsHeadline", "newsSummary", "chartObservation", "sourceLink", "notes"]);

function formatClues(clues: string[] | undefined) {
  return clues?.length ? clues.join(" | ") : "None detected";
}

function formatDriverFieldLabel(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
