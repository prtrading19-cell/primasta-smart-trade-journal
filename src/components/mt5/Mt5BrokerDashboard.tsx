"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, RadioTower, RefreshCw } from "lucide-react";
import type { Mt5Overview, Mt5ActionResponse } from "./types";
import type { Mt5ExecutionEvent } from "@/lib/mt5/types";
import { Mt5StatusPanel } from "./Mt5StatusPanel";
import { Mt5ConnectionManagerPanel } from "./Mt5ConnectionManagerPanel";
import { Mt5AccountPanel } from "./Mt5AccountPanel";
import { Mt5PositionsPanel } from "./Mt5PositionsPanel";
import { Mt5HistoryPanel } from "./Mt5HistoryPanel";
import { Mt5HealthPanel } from "./Mt5HealthPanel";
import { Mt5ApprovalPanel } from "./Mt5ApprovalPanel";
import { Mt5LogPanel } from "./Mt5LogPanel";
import { Mt5TradeExecutionPanel } from "./Mt5TradeExecutionPanel";
import { Mt5OrderPreviewPanel } from "./Mt5OrderPreviewPanel";
import { Mt5ExecutionTimeline } from "./Mt5ExecutionTimeline";
import { Mt5RiskEnginePanel } from "./Mt5RiskEnginePanel";
import { Mt5PositionActionsPanel } from "./Mt5PositionActionsPanel";
import { Mt5HistoryExport } from "./Mt5HistoryExport";
import { Mt5AdvancedOrdersPanel } from "./Mt5AdvancedOrdersPanel";
import { Mt5ExecutionAnalyticsPanel } from "./Mt5ExecutionAnalyticsPanel";
import { Mt5TradeReplayPanel } from "./Mt5TradeReplayPanel";
import { Mt5InfrastructurePanel } from "./Mt5InfrastructurePanel";
import { formatTime } from "@/components/institutional/primitives";

export function Mt5BrokerDashboard({ pollIntervalMs = 15000 }: { pollIntervalMs?: number }) {
  const [data, setData] = useState<Mt5Overview | null>(null);
  const [events, setEvents] = useState<Mt5ExecutionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasData = useRef(false);

  const load = async (attempt = 0) => {
    try {
      const [overviewRes, eventsRes] = await Promise.all([
        fetch("/api/mt5/overview", { cache: "no-store" }),
        fetch("/api/mt5/execution-events", { cache: "no-store" }),
      ]);
      if (!overviewRes.ok) throw new Error(`API responded ${overviewRes.status}`);
      const json = (await overviewRes.json()) as Mt5Overview;
      hasData.current = true;
      setData(json);
      try {
        const eventsJson = (await eventsRes.json()) as { events?: Mt5ExecutionEvent[] };
        setEvents(eventsJson.events ?? []);
      } catch {
        /* best effort */
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load MT5 broker data.");
      if (!hasData.current && attempt < 3) {
        retryTimer.current = setTimeout(() => void load(attempt + 1), 750 * Math.pow(2, attempt));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    timer.current = setInterval(() => void load(), pollIntervalMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollIntervalMs]);

  const act = async (path: string, label: string) => {
    setBusy(label);
    setNotice(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const json = (await res.json()) as Mt5ActionResponse;
      setNotice(json.error ?? json.message ?? `${label} complete`);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : `${label} failed`);
    } finally {
      setBusy(null);
    }
  };

  const handleApprove = async (proposalId: string) => {
    setBusy(proposalId);
    setNotice(null);
    try {
      const res = await fetch("/api/mt5/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, action: "approve" }),
      });
      const json = (await res.json()) as Mt5ActionResponse;
      if (!res.ok || !json.ok) {
        setNotice(json.error ?? "Approval failed.");
      } else {
        const status = json.confirmation?.status ?? "approved";
        setNotice(
          status === "unavailable"
            ? `Approved — gateway not connected, order NOT transmitted.`
            : status === "rejected"
              ? `Approved but safety blocked transmission: ${json.confirmation?.rejectionReason ?? "unknown"}`
              : `Proposal approved and transmitted (${status}).`
        );
      }
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Approval failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (proposalId: string) => {
    setBusy(proposalId);
    setNotice(null);
    try {
      const res = await fetch("/api/mt5/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, action: "reject" }),
      });
      const json = (await res.json()) as Mt5ActionResponse;
      setNotice(json.error ?? `Proposal ${proposalId} rejected.`);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Reject failed.");
    } finally {
      setBusy(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-border-subtle bg-surface-panel/50" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-loss/20 bg-loss/5 p-5">
        <AlertCircle className="h-5 w-5 shrink-0 text-loss" />
        <div>
          <p className="text-sm font-bold text-text-primary">MT5 Broker unavailable</p>
          <p className="text-xs text-text-muted">{error}</p>
        </div>
        <button onClick={() => void load()} className="ml-auto flex items-center gap-1.5 rounded-lg bg-surface-panel px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-surface-panel/70">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayDeals = (data.positions.deals ?? []).filter((d) => {
    const t = new Date(d.time).getTime();
    return Number.isFinite(t) && t >= startOfToday.getTime();
  });
  const todayPnl = todayDeals.reduce(
    (sum, d) => sum + (d.profit ?? 0) + (d.swap ?? 0) + (d.commission ?? 0),
    0
  );
  const balance = data.account.latest?.balance ?? null;
  const maxDailyLossPercent = data.config?.safety?.maxDailyLossPercent ?? null;
  const maxDailyLoss =
    balance != null && maxDailyLossPercent != null ? Math.abs((balance * maxDailyLossPercent) / 100) : null;
  const dailyRiskPercent =
    maxDailyLoss != null && maxDailyLoss > 0
      ? Math.min(100, Math.max(0, (-Math.min(todayPnl, 0) / maxDailyLoss) * 100))
      : null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
          </span>
          <RadioTower className="h-3.5 w-3.5 text-gold" />
          MT5 live broker layer · updated {formatTime(data.generatedAt)} · gateway {data.status.gateway.available ? "available" : "not configured"}
        </div>
        <div className="flex items-center gap-2">
          {busy && <span className="text-[10px] text-text-muted">{busy}…</span>}
          <button onClick={() => void load()} className="flex items-center gap-1.5 rounded-lg bg-surface-panel px-2.5 py-1 text-[10px] font-bold text-text-muted transition-colors hover:text-text-primary">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
          <p className="text-xs font-bold text-gold">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-[10px] text-text-muted">Dismiss</button>
        </div>
      )}

      <Mt5ConnectionManagerPanel onChanged={() => void load()} />

      <Mt5TradeExecutionPanel connected={data.status.connected} onExecuted={() => void load()} />

      <Mt5AdvancedOrdersPanel onChanged={() => void load()} />

      <Mt5StatusPanel
        status={data.status}
        onConnect={() => act("/api/mt5/connect", "Connecting")}
        onDisconnect={() => act("/api/mt5/disconnect", "Disconnecting")}
        onReconnect={() => act("/api/mt5/reconnect", "Reconnecting")}
        onRefresh={() => act("/api/mt5/refresh", "Refreshing")}
        busy={busy}
      />

      <Mt5AccountPanel
        account={data.account.latest}
        floatingPnl={data.account.floatingPnl}
        closedPnl={data.account.closedPnl}
        syncStatus={data.account.lastSyncStatus}
        lastSyncAt={data.account.lastSyncAt}
        todayPnl={todayPnl}
        todayTrades={data.dailyTrades}
        dailyRiskPercent={dailyRiskPercent}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Mt5PositionsPanel
          positions={data.positions.positions}
          pendingOrders={data.positions.pendingOrders}
          openCount={data.positions.openCount}
          pendingCount={data.positions.pendingCount}
          syncStatus={data.positions.lastSyncStatus}
        />
        <Mt5HistoryPanel deals={data.positions.deals} closedOrders={data.positions.closedOrders.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Mt5PositionActionsPanel
          positions={data.positions.positions}
          pendingOrders={data.positions.pendingOrders}
          onChanged={() => void load()}
        />
        <Mt5HistoryExport
          deals={data.positions.deals}
          positions={data.positions.positions}
          closedOrders={data.positions.closedOrders}
          proposals={data.proposals}
          events={events}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Mt5RiskEnginePanel
          config={data.config}
          positions={data.positions.positions}
          dailyTrades={data.dailyTrades}
        />
        <Mt5ExecutionTimeline events={events} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Mt5ExecutionAnalyticsPanel />
        <Mt5TradeReplayPanel />
      </div>

      <Mt5InfrastructurePanel />

      <div className="grid gap-4 lg:grid-cols-2">
        <Mt5HealthPanel health={data.health} />
        <Mt5ApprovalPanel
          proposals={data.proposals}
          confirmations={data.confirmations}
          busy={busy}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>

      <Mt5LogPanel logs={data.logs} total={data.logs.length} />
    </div>
  );
}
