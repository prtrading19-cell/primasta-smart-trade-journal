"use client";

import { Layers } from "lucide-react";
import type { Mt5Order, Mt5Position } from "@/lib/mt5/types";
import { PanelShell } from "@/components/trading/primitives";
import { formatTime } from "@/components/institutional/primitives";
import { cn } from "@/lib/format";

function money(value: number): string {
  if (value == null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

export function Mt5PositionsPanel({
  positions,
  pendingOrders,
  openCount,
  pendingCount,
  syncStatus,
}: {
  positions: Mt5Position[];
  pendingOrders: Mt5Order[];
  openCount: number;
  pendingCount: number;
  syncStatus: string;
}) {
  return (
    <PanelShell
      eyebrow="Position Synchronization"
      title="Open Positions"
      icon={Layers}
      badge={<span className="text-[10px] text-text-muted">{openCount} open · {pendingCount} pending</span>}
    >
      {positions.length === 0 && pendingOrders.length === 0 ? (
        <p className="text-xs text-text-muted">
          No open positions or pending orders. Sync completes only through a connected MT5 gateway.
        </p>
      ) : (
        <div className="space-y-4">
          {positions.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Open Positions</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-text-muted">
                    <tr>
                      <th className="pb-2 pr-3 font-bold">Ticket</th>
                      <th className="pb-2 pr-3 font-bold">Symbol</th>
                      <th className="pb-2 pr-3 font-bold">Side</th>
                      <th className="pb-2 pr-3 font-bold">Lots</th>
                      <th className="pb-2 pr-3 font-bold">Open</th>
                      <th className="pb-2 pr-3 font-bold">Current</th>
                      <th className="pb-2 pr-3 font-bold">SL</th>
                      <th className="pb-2 pr-3 font-bold">TP</th>
                      <th className="pb-2 pr-3 font-bold">Profit</th>
                      <th className="pb-2 font-bold">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p) => (
                      <tr key={p.ticket} className="border-t border-border-subtle">
                        <td className="py-2 pr-3 text-text-muted">{p.ticket}</td>
                        <td className="py-2 pr-3 font-bold text-text-primary">{p.symbol}</td>
                        <td className={cn("py-2 pr-3 font-bold uppercase", p.type === "buy" ? "text-profit" : "text-loss")}>{p.type}</td>
                        <td className="py-2 pr-3 text-text-secondary">{p.volume}</td>
                        <td className="py-2 pr-3 text-text-secondary">{p.priceOpen}</td>
                        <td className="py-2 pr-3 text-text-secondary">{p.priceCurrent}</td>
                        <td className="py-2 pr-3 text-text-muted">{p.sl || "—"}</td>
                        <td className="py-2 pr-3 text-text-muted">{p.tp || "—"}</td>
                        <td className={cn("py-2 pr-3 font-bold", p.profit + p.swap > 0 ? "text-profit" : p.profit + p.swap < 0 ? "text-loss" : "text-text-secondary")}>
                          {money(p.profit + p.swap)}
                        </td>
                        <td className="py-2 text-text-muted">{formatTime(p.openTime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {pendingOrders.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Pending Orders</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-text-muted">
                    <tr>
                      <th className="pb-2 pr-3 font-bold">Ticket</th>
                      <th className="pb-2 pr-3 font-bold">Symbol</th>
                      <th className="pb-2 pr-3 font-bold">Type</th>
                      <th className="pb-2 pr-3 font-bold">Lots</th>
                      <th className="pb-2 pr-3 font-bold">Price</th>
                      <th className="pb-2 pr-3 font-bold">SL</th>
                      <th className="pb-2 pr-3 font-bold">TP</th>
                      <th className="pb-2 font-bold">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingOrders.map((o) => (
                      <tr key={o.ticket} className="border-t border-border-subtle">
                        <td className="py-2 pr-3 text-text-muted">{o.ticket}</td>
                        <td className="py-2 pr-3 font-bold text-text-primary">{o.symbol}</td>
                        <td className="py-2 pr-3 text-text-secondary">{o.type}</td>
                        <td className="py-2 pr-3 text-text-secondary">{o.volume}</td>
                        <td className="py-2 pr-3 text-text-secondary">{o.priceOpen}</td>
                        <td className="py-2 pr-3 text-text-muted">{o.sl || "—"}</td>
                        <td className="py-2 pr-3 text-text-muted">{o.tp || "—"}</td>
                        <td className="py-2 text-text-muted">{formatTime(o.openTime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </PanelShell>
  );
}
