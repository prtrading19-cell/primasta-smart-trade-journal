"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, FileType } from "lucide-react";
import type { Mt5Deal, Mt5ExecutionEvent, Mt5Order, Mt5Position, Mt5TradeProposal } from "@/lib/mt5/types";
import { PanelShell } from "@/components/trading/primitives";
import { cn } from "@/lib/format";
import {
  exportCsv,
  exportExcel,
  exportPdf,
  dealsToRows,
  DEAL_HEADERS,
  positionsToRows,
  POSITION_HEADERS,
  ordersToRows,
  ORDER_HEADERS,
  proposalsToRows,
  PROPOSAL_HEADERS,
  eventsToRows,
  EVENT_HEADERS,
} from "./exporters";

export function Mt5HistoryExport({
  deals,
  positions,
  closedOrders,
  proposals = [],
  events = [],
}: {
  deals: Mt5Deal[];
  positions: Mt5Position[];
  closedOrders: Mt5Order[];
  proposals?: Mt5TradeProposal[];
  events?: Mt5ExecutionEvent[];
}) {
  const [notice, setNotice] = useState<string | null>(null);

  const stamp = new Date().toISOString().slice(0, 10);
  const run = (label: string, fn: () => void) => {
    try {
      fn();
      setNotice(`${label} exported`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : `${label} export failed`);
    }
  };

  return (
    <PanelShell
      eyebrow="Audit Export"
      title="Export Trade Records"
      icon={Download}
      badge={<span className="text-[10px] text-text-muted">{deals.length} deals</span>}
    >
      <div className="space-y-4">
        <p className="text-[11px] leading-5 text-text-muted">
          Export synchronized broker data to CSV, Excel, or PDF. All figures are the gateway&apos;s live synced values.
        </p>

        <ExportGroup
          title={`Deals (${deals.length})`}
          onCsv={() => exportCsv(`mt5-deals-${stamp}`, DEAL_HEADERS, dealsToRows(deals))}
          onExcel={() => exportExcel(`mt5-deals-${stamp}`, "Deals", DEAL_HEADERS, dealsToRows(deals))}
          onPdf={() => exportPdf(`mt5-deals-${stamp}`, `MT5 Deals — ${stamp}`, DEAL_HEADERS, dealsToRows(deals))}
        />
        <ExportGroup
          title={`Open Positions (${positions.length})`}
          onCsv={() => exportCsv(`mt5-positions-${stamp}`, POSITION_HEADERS, positionsToRows(positions))}
          onExcel={() => exportExcel(`mt5-positions-${stamp}`, "Positions", POSITION_HEADERS, positionsToRows(positions))}
          onPdf={() => exportPdf(`mt5-positions-${stamp}`, `MT5 Positions — ${stamp}`, POSITION_HEADERS, positionsToRows(positions))}
        />
        <ExportGroup
          title={`Closed Orders (${closedOrders.length})`}
          onCsv={() => exportCsv(`mt5-orders-${stamp}`, ORDER_HEADERS, ordersToRows(closedOrders))}
          onExcel={() => exportExcel(`mt5-orders-${stamp}`, "Orders", ORDER_HEADERS, ordersToRows(closedOrders))}
          onPdf={() => exportPdf(`mt5-orders-${stamp}`, `MT5 Orders — ${stamp}`, ORDER_HEADERS, ordersToRows(closedOrders))}
        />
        <ExportGroup
          title={`Approval Proposals (${proposals.length})`}
          onCsv={() => exportCsv(`mt5-proposals-${stamp}`, PROPOSAL_HEADERS, proposalsToRows(proposals))}
          onExcel={() => exportExcel(`mt5-proposals-${stamp}`, "Proposals", PROPOSAL_HEADERS, proposalsToRows(proposals))}
          onPdf={() => exportPdf(`mt5-proposals-${stamp}`, `MT5 Proposals — ${stamp}`, PROPOSAL_HEADERS, proposalsToRows(proposals))}
        />
        <ExportGroup
          title={`Audit Trail (${events.length})`}
          onCsv={() => exportCsv(`mt5-audit-${stamp}`, EVENT_HEADERS, eventsToRows(events))}
          onExcel={() => exportExcel(`mt5-audit-${stamp}`, "Audit", EVENT_HEADERS, eventsToRows(events))}
          onPdf={() => exportPdf(`mt5-audit-${stamp}`, `MT5 Audit — ${stamp}`, EVENT_HEADERS, eventsToRows(events))}
        />

        {notice && <p className="rounded-lg border border-gold/20 bg-gold/5 px-3 py-2 text-[11px] font-bold text-gold">{notice}</p>}
      </div>
    </PanelShell>
  );
}

function ExportGroup({ title, onCsv, onExcel, onPdf }: {
  title: string;
  onCsv: () => void;
  onExcel: () => void;
  onPdf: () => void;
}) {
  const btn =
    "flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-panel/40 px-3 py-1.5 text-[10px] font-bold text-text-muted transition-colors hover:text-text-primary";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs font-bold text-text-primary">{title}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button className={btn} onClick={() => runExport(onCsv)}><FileType className="h-3.5 w-3.5" /> CSV</button>
        <button className={btn} onClick={() => runExport(onExcel)}><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</button>
        <button className={btn} onClick={() => runExport(onPdf)}><FileText className="h-3.5 w-3.5" /> PDF</button>
      </div>
    </div>
  );
}

function runExport(fn: () => void): void {
  try {
    fn();
  } catch {
    /* surfaced by the parent notice */
  }
}
