import { buildGoldBiasSummary } from "@/lib/goldResearch";
import { GOLD_PERSONAL_RULE, type GoldChecklistResult, type GoldResearchReport } from "@/types/goldResearch";

const APP_NAME = "PRIMASTA GOLD RESEARCH DESK";

export function exportGoldResearchCsv(reports: GoldResearchReport[], filename = "primasta-gold-research.csv") {
  const rows = reports.map((report) => ({
    Date: report.reportDate,
    Driver: report.driverName,
    Headline: report.inputHeadline,
    Bias: report.goldBias,
    Impact: report.impactLevel,
    "Time sensitivity": report.timeSensitivity,
    Confidence: report.confidenceScore,
    "Checklist effect": report.checklistEffect,
    Guidance: report.finalGuidance,
    Source: report.sourceLink ?? "",
    Notes: report.notes ?? ""
  }));
  const headers = Object.keys(rows[0] ?? emptyRow());
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header as keyof typeof row])).join(","))].join("\n");
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
      ["Bearish drivers", String(summary.bearishDriversCount)],
      ["Mixed drivers", String(summary.mixedDriversCount)],
      ["Strongest bullish driver", summary.strongestBullishDriver],
      ["Strongest bearish driver", summary.strongestBearishDriver],
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
    head: [["Date", "Driver", "Bias", "Impact", "Time", "Confidence", "Guidance"]],
    body: reports.map((report) => [
      report.reportDate,
      report.driverName,
      report.goldBias,
      report.impactLevel,
      report.timeSensitivity,
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
    ["Current data/value", report.currentValue || "-"],
    ["Chart observation", report.chartObservation || "-"],
    ["Gold bias", report.goldBias],
    ["Impact level", report.impactLevel],
    ["Time sensitivity", report.timeSensitivity],
    ["Confidence score", `${report.confidenceScore}%`],
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
    Bias: "",
    Impact: "",
    "Time sensitivity": "",
    Confidence: "",
    "Checklist effect": "",
    Guidance: "",
    Source: "",
    Notes: ""
  };
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
