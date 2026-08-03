"use client";

import { HeartPulse } from "lucide-react";
import type { Mt5HealthRecord } from "@/lib/mt5/types";
import { PanelShell, StatusBadge } from "@/components/trading/primitives";
import { formatClock, formatDuration } from "@/components/institutional/primitives";

export function Mt5HealthPanel({ health }: { health: Mt5HealthRecord }) {
  const rows: { label: string; value: string; tone?: "profit" | "loss" | "warning" }[] = [
    { label: "API Latency (last)", value: health.latency.lastMs != null ? `${health.latency.lastMs}ms` : "—" },
    { label: "API Latency (avg)", value: health.latency.averageMs != null ? `${health.latency.averageMs}ms` : "—" },
    { label: "Last Communication", value: formatClock(health.lastCommunicationAt ? new Date(health.lastCommunicationAt).getTime() : null) },
    { label: "Last Success", value: formatClock(health.lastSuccessAt ? new Date(health.lastSuccessAt).getTime() : null) },
    { label: "Last Error", value: health.lastErrorAt ? formatDuration(Date.now() - new Date(health.lastErrorAt).getTime()) : "None", tone: health.lastErrorAt ? "warning" : "profit" },
    { label: "Disconnections", value: String(health.disconnections), tone: health.disconnections > 0 ? "warning" : "profit" },
    { label: "Reconnections", value: String(health.reconnections), tone: health.reconnections > 0 ? "warning" : "profit" },
    { label: "Timeouts", value: String(health.timeouts), tone: health.timeouts > 0 ? "warning" : "profit" },
    { label: "Broker Errors", value: String(health.brokerErrors), tone: health.brokerErrors > 0 ? "loss" : "profit" },
    { label: "Heartbeat", value: health.heartbeat ? `#${health.heartbeat.sequence} · ${formatClock(new Date(health.heartbeat.at).getTime())}` : "—" },
  ];

  return (
    <PanelShell
      eyebrow="Broker Health Engine"
      title="Connection Health"
      icon={HeartPulse}
      badge={<StatusBadge status={health.status} />}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg border border-border-subtle bg-surface-panel/40 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{r.label}</p>
            <p className={`mt-1 text-sm font-bold ${r.tone === "profit" ? "text-profit" : r.tone === "loss" ? "text-loss" : r.tone === "warning" ? "text-warning" : "text-text-primary"}`}>
              {r.value}
            </p>
          </div>
        ))}
      </div>
      {health.lastErrorMessage && (
        <p className="mt-3 rounded-lg border border-loss/20 bg-loss/5 px-3 py-2 text-[11px] leading-5 text-loss">
          {health.lastErrorMessage}
        </p>
      )}
    </PanelShell>
  );
}
