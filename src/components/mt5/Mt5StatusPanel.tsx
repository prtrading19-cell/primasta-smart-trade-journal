"use client";

import { Activity, RefreshCw, Server, ShieldAlert, TerminalSquare } from "lucide-react";
import type { Mt5BrokerStatus } from "@/lib/mt5/types";
import { PanelShell } from "@/components/trading/primitives";
import { formatClock, formatDuration } from "@/components/institutional/primitives";
import { cn } from "@/lib/format";

function ConnectionBadge({ status, connected }: { status: Mt5BrokerStatus["status"]; connected: boolean }) {
  const tone = connected ? "bg-profit text-profit" : status === "reconnecting" || status === "connecting"
    ? "bg-warning text-warning"
    : "bg-loss text-loss";
  return (
    <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-opacity-10", tone)}>
      {connected ? "Connected" : status === "reconnecting" ? "Reconnecting" : status === "connecting" ? "Connecting" : "Disconnected"}
    </span>
  );
}

export function Mt5StatusPanel({
  status,
  onConnect,
  onDisconnect,
  onReconnect,
  onRefresh,
  busy,
}: {
  status: Mt5BrokerStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  onReconnect: () => void;
  onRefresh: () => void;
  busy: string | null;
}) {
  const gatewayAvailable = status.gateway.available;

  return (
    <PanelShell
      eyebrow="Broker Connectivity"
      title={status.brokerName}
      icon={Server}
      badge={<ConnectionBadge status={status.status} connected={status.connected} />}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Server" value={status.server ?? "—"} />
          <Info label="Account" value={status.accountNumber ?? "—"} />
          <Info label="Terminal" value={status.terminalVersion ?? "—"} sub={status.terminalBuild != null ? `build ${status.terminalBuild}` : undefined} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricValue label="Latency" value={status.latency.lastMs != null ? `${status.latency.lastMs}ms` : "—"} />
          <MetricValue label="Avg Latency" value={status.latency.averageMs != null ? `${status.latency.averageMs}ms` : "—"} />
          <MetricValue label="Heartbeat" value={formatClock(status.lastHeartbeatAt ? new Date(status.lastHeartbeatAt).getTime() : null)} />
          <MetricValue label="Last Sync" value={status.lastSyncAt ? formatDuration(Date.now() - new Date(status.lastSyncAt).getTime()) : "Never"} />
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-panel/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <TerminalSquare className="h-3.5 w-3.5 text-gold" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">MT5 Gateway</p>
            <span className={cn("ml-auto flex items-center gap-1.5 text-[10px] font-bold", gatewayAvailable ? "text-profit" : "text-warning")}>
              <Activity className="h-3 w-3" />
              {gatewayAvailable ? status.gateway.label : "No live gateway configured"}
            </span>
          </div>
          {!gatewayAvailable && (
            <p className="mt-2 text-[11px] leading-5 text-text-muted">
              Secure order transmission is disabled until a bridge / Python / Windows / Docker MT5 gateway service is
              configured and connected. Trade proposals are prepared and reviewed manually below.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] text-text-muted">
            <ShieldAlert className="h-3.5 w-3.5 text-warning" />
            Safety:             <span className={cn("font-bold", status.safety.killSwitch ? "text-loss" : "text-profit")}>
              {status.safety.killSwitch ? "KILL SWITCH ACTIVE" : "Kill switch OFF"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onConnect}
              disabled={!!busy}
              className="rounded-lg bg-profit/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-profit transition-colors hover:bg-profit/20 disabled:opacity-40"
            >
              Connect
            </button>
            <button
              onClick={onReconnect}
              disabled={!!busy}
              className="rounded-lg bg-warning/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-warning transition-colors hover:bg-warning/20 disabled:opacity-40"
            >
              Reconnect
            </button>
            <button
              onClick={onDisconnect}
              disabled={!!busy}
              className="rounded-lg bg-loss/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-loss transition-colors hover:bg-loss/20 disabled:opacity-40"
            >
              Disconnect
            </button>
            <button
              onClick={onRefresh}
              disabled={!!busy}
              className="flex items-center gap-1 rounded-lg bg-surface-panel px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-primary transition-colors hover:bg-surface-panel/70 disabled:opacity-40"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-panel/40 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-text-primary">{value}</p>
      {sub && <p className="text-[10px] text-text-muted">{sub}</p>}
    </div>
  );
}

function MetricValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-panel/40 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}
