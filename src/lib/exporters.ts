import type { DashboardMetrics } from "@/lib/calculations";
import type { Trade } from "@/types/trade";
import { getAPlusScore, getPlannedRiskReward, isRuleFollowed } from "@/lib/calculations";

const APP_NAME = "TradeOS";
type ExportRow = Record<string, string | number>;

export function exportTradesCsv(trades: Trade[], filename = "primasta-trades.csv") {
  const csv = toCsv(trades);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

export function exportTradesJson(trades: Trade[], filename = "primasta-trades-backup.json") {
  downloadBlob(new Blob([JSON.stringify({ app: APP_NAME, exportedAt: new Date().toISOString(), trades }, null, 2)], { type: "application/json" }), filename);
}

export function exportTradesExcel(trades: Trade[], filename = "primasta-trades.xls") {
  const rows = buildRows(trades);
  const headers = Object.keys(rows[0] ?? emptyRow());
  const html = `
    <html>
      <head><meta charset="utf-8" /></head>
      <body>
        <table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows
              .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(String(row[header] ?? ""))}</td>`).join("")}</tr>`)
              .join("")}
          </tbody>
        </table>
      </body>
    </html>`;

  downloadBlob(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }), filename);
}

export async function exportFullReportPdf(
  trades: Trade[],
  metrics: DashboardMetrics,
  filename = "primasta-performance-report.pdf",
  title = "Full Performance Report"
) {
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape" });
  const closedTrades = trades.filter((trade) => trade.status === "Closed");

  doc.setFontSize(18);
  doc.text(APP_NAME, 14, 18);
  doc.setFontSize(11);
  doc.text(title, 14, 27);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);
  doc.text("Performance calculations are based only on closed trades.", 14, 41);

  const summaryRows = [
    ["Open trades count", String(metrics.openTradesCount)],
    ["Closed trades count", String(metrics.closedTradesCount)],
    ["Total closed trades", String(metrics.closedTradesCount)],
    ["Win rate", `${metrics.winRate.toFixed(1)}%`],
    ["Total profit/loss", money(metrics.totalProfitLoss)],
    ["Total R", metrics.totalR.toFixed(2)],
    ["Best strategy", metrics.bestStrategy],
    ["Best pair", metrics.bestPair],
    ["Most common mistake", metrics.mostCommonMistake],
    ["Rule-following percentage", `${metrics.ruleFollowingPercentage.toFixed(1)}%`]
  ];

  (doc as any).autoTable({
    startY: 48,
    head: [["Metric", "Value"]],
    body: summaryRows,
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 23, 42] }
  });

  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Date", "Pair", "Type", "Strategy", "Grade", "A+ Score", "HTF Bias", "POI", "Session", "Result", "P/L", "R", "Mistake", "Rules followed"]],
    body: closedTrades.map((trade) => [
      trade.date,
      trade.pair,
      trade.tradeType,
      trade.strategy,
      trade.setupGrade ?? "",
      `${getAPlusScore(trade)}/15`,
      trade.htfBias ?? "",
      trade.entryPoi ?? "",
      trade.session,
      trade.finalResult ?? "",
      money(Number(trade.profitLoss ?? 0)),
      Number(trade.rMultiple ?? 0).toFixed(2),
      trade.mistakeMade || "-",
      isRuleFollowed(trade.checklist) ? "Yes" : "No"
    ]),
    theme: "grid",
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] }
  });

  doc.save(filename);
}

export async function exportTradePdf(trade: Trade, filename = `primasta-trade-${trade.id}.pdf`) {
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

  const doc = new jsPDF();
  doc.setFontSize(17);
  doc.text(APP_NAME, 14, 18);
  doc.setFontSize(11);
  doc.text(`Trade Report: ${trade.pair} ${trade.tradeType}`, 14, 28);

  (doc as any).autoTable({
    startY: 36,
    head: [["Field", "Value"]],
    body: [
      ["Date", trade.date],
      ["Status", trade.status],
      ["Pair", trade.pair],
      ["Strategy", trade.strategy],
      ["Setup grade", trade.setupGrade ?? "-"],
      ["A+ score", `${getAPlusScore(trade)}/15`],
      ["HTF bias", trade.htfBias ?? "-"],
      ["Liquidity swept", trade.liquiditySwept ?? "-"],
      ["Entry POI", trade.entryPoi ?? "-"],
      ["Confirmation timeframe", trade.confirmationTimeframe ?? "-"],
      ["News risk", trade.newsRisk ?? "-"],
      ["Trading rule status", trade.tradingRuleStatus ?? "-"],
      ["Planned R:R", formatPlannedRiskReward(trade)],
      ["Session", trade.session],
      ["Timeframe", trade.timeframe],
      ["Entry", String(trade.entryPrice)],
      ["Stop loss", String(trade.stopLoss)],
      ["Take profit", String(trade.takeProfit)],
      ["Risk amount", money(trade.riskAmount)],
      ["Result", trade.finalResult ?? "Open"],
      ["Profit/loss", trade.profitLoss === undefined ? "-" : money(trade.profitLoss)],
      ["R-multiple", trade.rMultiple === undefined ? "-" : trade.rMultiple.toFixed(2)],
      ["Rules followed", isRuleFollowed(trade.checklist) ? "Yes" : "No"],
      ["Entry reason", trade.entryReason],
      ["Exit reason", trade.exitReason || "-"],
      ["Mistake made", trade.mistakeMade || "-"],
      ["Lesson learned", trade.lessonLearned || "-"]
    ],
    theme: "grid",
    styles: { fontSize: 9, cellWidth: "wrap" },
    columnStyles: { 1: { cellWidth: 125 } },
    headStyles: { fillColor: [15, 23, 42] }
  });

  doc.save(filename);
}

export function filteredFilename(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.pdf`;
}

function toCsv(trades: Trade[]) {
  const rows = buildRows(trades);
  const headers = Object.keys(rows[0] ?? emptyRow());
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
}

function buildRows(trades: Trade[]): ExportRow[] {
  return trades.map((trade) => ({
    Date: trade.date,
    Pair: trade.pair,
    "Buy/Sell": trade.tradeType,
    Strategy: trade.strategy,
    "Setup Grade": trade.setupGrade ?? "",
    "A+ Score": getAPlusScore(trade),
    "HTF Bias": trade.htfBias ?? "",
    "Liquidity Swept": trade.liquiditySwept ?? "",
    "Entry POI": trade.entryPoi ?? "",
    "Confirmation Timeframe": trade.confirmationTimeframe ?? "",
    "News Risk": trade.newsRisk ?? "",
    "Trading Rule Status": trade.tradingRuleStatus ?? "",
    "Planned R:R": formatPlannedRiskReward(trade),
    Session: trade.session,
    Timeframe: trade.timeframe,
    Entry: trade.entryPrice,
    "Stop loss": trade.stopLoss,
    "Take profit": trade.takeProfit,
    "Lot size": trade.lotSize,
    "Risk amount": trade.riskAmount,
    Status: trade.status,
    Exit: trade.exitPrice ?? "",
    Result: trade.finalResult ?? "",
    "Profit/Loss": trade.profitLoss ?? "",
    "R-multiple": trade.rMultiple ?? "",
    Mistake: trade.mistakeMade ?? "",
    "Rules followed": isRuleFollowed(trade.checklist) ? "Yes" : "No",
    Notes: trade.lessonLearned ?? "",
    "Entry reason": trade.entryReason,
    "Exit reason": trade.exitReason ?? ""
  }));
}

function emptyRow(): ExportRow {
  return {
    Date: "",
    Pair: "",
    "Buy/Sell": "",
    Strategy: "",
    "Setup Grade": "",
    "A+ Score": "",
    "HTF Bias": "",
    "Liquidity Swept": "",
    "Entry POI": "",
    "Confirmation Timeframe": "",
    "News Risk": "",
    "Trading Rule Status": "",
    "Planned R:R": "",
    Session: "",
    Timeframe: "",
    Entry: "",
    "Stop loss": "",
    "Take profit": "",
    "Lot size": "",
    "Risk amount": "",
    Status: "",
    Exit: "",
    Result: "",
    "Profit/Loss": "",
    "R-multiple": "",
    Mistake: "",
    "Rules followed": "",
    Notes: "",
    "Entry reason": "",
    "Exit reason": ""
  };
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPlannedRiskReward(trade: Trade) {
  const value = getPlannedRiskReward(trade);
  return value === null ? "" : `1:${value.toFixed(2)}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}
