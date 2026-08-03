"use client";

import { History } from "lucide-react";
import type { Mt5Deal } from "@/lib/mt5/types";
import { PanelShell } from "@/components/trading/primitives";
import { formatTime } from "@/components/institutional/primitives";
import { cn } from "@/lib/format";

export function Mt5HistoryPanel({ deals, closedOrders }: { deals: Mt5Deal[]; closedOrders: number }) {
  return (
    <PanelShell
      eyebrow="Trade History"
      title="Recent Deals"
      icon={History}
      badge={<span className="text-[10px] text-text-muted">{deals.length} deals</span>}
    >
      {deals.length === 0 ? (
        <p className="text-xs text-text-muted">
          No deals synchronized yet. Deal history streams once an MT5 gateway is connected.
        </p>
      ) : (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-surface-card text-[10px] uppercase tracking-wider text-text-muted">
              <tr>
                <th className="pb-2 pr-3 font-bold">Ticket</th>
                <th className="pb-2 pr-3 font-bold">Order</th>
                <th className="pb-2 pr-3 font-bold">Symbol</th>
                <th className="pb-2 pr-3 font-bold">Side</th>
                <th className="pb-2 pr-3 font-bold">Lots</th>
                <th className="pb-2 pr-3 font-bold">Price</th>
                <th className="pb-2 pr-3 font-bold">Profit</th>
                <th className="pb-2 font-bold">Time</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.ticket} className="border-t border-border-subtle">
                  <td className="py-2 pr-3 text-text-muted">{d.ticket}</td>
                  <td className="py-2 pr-3 text-text-muted">{d.orderTicket}</td>
                  <td className="py-2 pr-3 font-bold text-text-primary">{d.symbol}</td>
                  <td className={cn("py-2 pr-3 font-bold uppercase", d.type === "buy" ? "text-profit" : d.type === "sell" ? "text-loss" : "text-text-secondary")}>
                    {d.direction}
                  </td>
                  <td className="py-2 pr-3 text-text-secondary">{d.volume}</td>
                  <td className="py-2 pr-3 text-text-secondary">{d.price}</td>
                  <td className={cn("py-2 pr-3 font-bold", d.profit + d.swap + d.commission > 0 ? "text-profit" : d.profit + d.swap + d.commission < 0 ? "text-loss" : "text-text-secondary")}>
                    {d.profit + d.swap + d.commission > 0 ? "+" : ""}{(d.profit + d.swap + d.commission).toFixed(2)}
                  </td>
                  <td className="py-2 text-text-muted">{formatTime(d.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}
