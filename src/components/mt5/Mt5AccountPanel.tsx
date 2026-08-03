"use client";

import { Wallet } from "lucide-react";
import type { Mt5AccountInfo } from "@/lib/mt5/types";
import { PanelShell, StatusBadge } from "@/components/trading/primitives";
import { formatDuration } from "@/components/institutional/primitives";
import { cn } from "@/lib/format";

function money(value: number | null | undefined, currency: string): string {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function pnlTone(value: number | null | undefined): string {
  if (value == null || value === 0) return "text-text-primary";
  return value > 0 ? "text-profit" : "text-loss";
}

export function Mt5AccountPanel({
  account,
  floatingPnl,
  closedPnl,
  syncStatus,
  lastSyncAt,
  todayPnl = null,
  todayTrades = null,
  dailyRiskPercent = null,
}: {
  account: Mt5AccountInfo | null;
  floatingPnl: number | null;
  closedPnl: number | null;
  syncStatus: string;
  lastSyncAt: string | null;
  todayPnl?: number | null;
  todayTrades?: number | null;
  dailyRiskPercent?: number | null;
}) {
  const currency = account?.currency ?? "USD";

  const riskTone =
    dailyRiskPercent == null
      ? "text-text-primary"
      : dailyRiskPercent >= 75
        ? "text-loss"
        : dailyRiskPercent >= 50
          ? "text-warning"
          : "text-profit";

  return (
    <PanelShell
      eyebrow="Account Synchronization"
      title="MT5 Account"
      icon={Wallet}
      badge={
        <span className="flex items-center gap-2">
          {account && (
            <span className="text-[10px] text-text-muted">
              Login {account.login} · {account.server}
            </span>
          )}
          <StatusBadge status={syncStatus === "success" ? "healthy" : syncStatus === "failed" ? "down" : syncStatus === "unavailable" ? "cancelled" : "pending"} />
        </span>
      }
    >
      {!account ? (
        <div>
          <p className="text-xs text-text-muted">
            No MT5 account data synchronized. Connect a live MT5 gateway to stream account metrics.
          </p>
          <p className="mt-2 text-[11px] text-text-muted">
            Last sync: {lastSyncAt ? formatDuration(Date.now() - new Date(lastSyncAt).getTime()) : "Never"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Cell label="Balance" value={money(account.balance, currency)} />
            <Cell label="Equity" value={money(account.equity, currency)} />
            <Cell label="Margin" value={money(account.margin, currency)} />
            <Cell label="Free Margin" value={money(account.marginFree, currency)} />
            <Cell label="Margin Level" value={account.marginLevel != null ? `${account.marginLevel.toFixed(0)}%` : "—"} />
            <Cell label="Floating P/L" value={money(floatingPnl ?? account.profit, currency)} tone={pnlTone(floatingPnl ?? account.profit)} />
            <Cell label="Closed P/L" value={money(closedPnl, currency)} tone={pnlTone(closedPnl)} />
            <Cell label="Credit" value={money(account.credit, currency)} />
            <Cell label="Currency" value={account.currency || "—"} />
            <Cell label="Leverage" value={account.leverage ? `1:${account.leverage}` : "—"} />
            <Cell label="Broker" value={account.brokerName || "—"} />
            <Cell label="Last Sync" value={formatDuration(Date.now() - new Date(account.updatedAt).getTime())} />
            <Cell label="Today's P/L" value={money(todayPnl, currency)} tone={pnlTone(todayPnl)} />
            <Cell label="Today's Trades" value={todayTrades != null ? String(todayTrades) : "—"} />
            <Cell label="Daily Risk Used" value={dailyRiskPercent != null ? `${dailyRiskPercent.toFixed(0)}%` : "—"} tone={riskTone} />
          </div>
          <p className="text-[10px] text-text-muted">
            Account info is mirrored from the MT5 terminal over the configured gateway. Credentials are never exposed to the browser.
          </p>
        </div>
      )}
    </PanelShell>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-panel/40 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className={cn("mt-1 text-sm font-bold", tone ?? "text-text-primary")}>{value}</p>
    </div>
  );
}
