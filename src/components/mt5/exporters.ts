import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  Mt5Deal,
  Mt5ExecutionEvent,
  Mt5Order,
  Mt5Position,
  Mt5TradeProposal,
} from "@/lib/mt5/types";

export type ExportRow = (string | number)[];
export type ExportHeader = string[];

function toCsv(headers: ExportHeader, rows: ExportRow[]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

function toHtmlTable(sheetName: string, headers: ExportHeader, rows: ExportRow[]): string {
  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"/></head><body><table><tr>${headers
    .map((h) => `<th>${h}</th>`)
    .join("")}</tr>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${String(c ?? "")}</td>`).join("")}</tr>`)
    .join("")}</table></body></html>`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCsv(filename: string, headers: ExportHeader, rows: ExportRow[]): void {
  downloadBlob(
    new Blob(["\uFEFF" + toCsv(headers, rows)], { type: "text/csv;charset=utf-8" }),
    `${filename}.csv`
  );
}

export function exportExcel(filename: string, sheetName: string, headers: ExportHeader, rows: ExportRow[]): void {
  downloadBlob(
    new Blob([toHtmlTable(sheetName, headers, rows)], {
      type: "application/vnd.ms-excel;charset=utf-8",
    }),
    `${filename}.xls`
  );
}

export function exportPdf(filename: string, title: string, headers: ExportHeader, rows: ExportRow[]): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(title, 40, 40);
  doc.setFontSize(8);
  doc.text(`PrimaSta Smart Trade Journal · exported ${new Date().toLocaleString()}`, 40, 56);
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((c) => String(c ?? ""))),
    startY: 68,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [22, 22, 26], textColor: [212, 175, 55] },
  });
  doc.save(`${filename}.pdf`);
}

export function dealsToRows(deals: Mt5Deal[]): ExportRow[] {
  return deals.map((d) => [
    d.ticket,
    d.orderTicket,
    d.symbol,
    `${d.type} ${d.direction}`,
    d.volume,
    d.price,
    Number(d.profit.toFixed(2)),
    Number(d.swap.toFixed(2)),
    Number(d.commission.toFixed(2)),
    Number((d.profit + d.swap + d.commission).toFixed(2)),
    d.time,
  ]);
}

export const DEAL_HEADERS: ExportHeader = ["Ticket", "Order", "Symbol", "Side", "Lots", "Price", "Profit", "Swap", "Commission", "Net", "Time"];

export function positionsToRows(positions: Mt5Position[]): ExportRow[] {
  return positions.map((p) => [
    p.ticket,
    p.symbol,
    p.type,
    p.volume,
    p.priceOpen,
    p.priceCurrent,
    p.sl,
    p.tp,
    Number((p.profit + p.swap + p.commission).toFixed(2)),
    p.magic,
    p.openTime,
  ]);
}

export const POSITION_HEADERS: ExportHeader = ["Ticket", "Symbol", "Side", "Lots", "Open", "Current", "SL", "TP", "Net P/L", "Magic", "Opened"];

export function ordersToRows(orders: Mt5Order[]): ExportRow[] {
  return orders.map((o) => [
    o.ticket,
    o.symbol,
    o.type,
    o.state,
    o.volume,
    o.priceOpen,
    o.sl,
    o.tp,
    o.magic,
    o.openTime,
    o.closeTime ?? "",
  ]);
}

export const ORDER_HEADERS: ExportHeader = ["Ticket", "Symbol", "Type", "State", "Lots", "Price", "SL", "TP", "Magic", "Opened", "Closed"];

export function proposalsToRows(proposals: Mt5TradeProposal[]): ExportRow[] {
  return proposals.map((p) => [
    p.id,
    p.request.symbol,
    `${p.request.type} ${p.request.source}`,
    p.request.volume,
    p.request.price ?? "",
    p.request.sl ?? "",
    p.request.tp ?? "",
    p.request.riskPercent != null ? `${p.request.riskPercent}%` : "",
    p.safety.passed ? "passed" : "blocked",
    p.status,
    p.createdAt,
    p.decidedAt ?? "",
  ]);
}

export const PROPOSAL_HEADERS: ExportHeader = ["Proposal", "Symbol", "Type", "Lots", "Price", "SL", "TP", "Risk %", "Safety", "Status", "Created", "Decided"];

export function eventsToRows(events: Mt5ExecutionEvent[]): ExportRow[] {
  return events.map((e) => [
    e.id,
    e.proposalId ?? "",
    e.stage,
    e.result,
    e.symbol,
    e.orderType,
    e.price ?? "",
    e.volume,
    e.error ?? "",
    e.latencyMs ?? "",
    e.at,
  ]);
}

export const EVENT_HEADERS: ExportHeader = ["Event", "Proposal", "Stage", "Result", "Symbol", "Type", "Price", "Lots", "Error", "Latency", "At"];
