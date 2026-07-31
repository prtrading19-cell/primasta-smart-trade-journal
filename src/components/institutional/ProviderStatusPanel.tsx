import { Server } from "lucide-react";
import type { InstitutionalProvider } from "./types";
import { Panel, ProgressBar, formatDuration, formatTime } from "./primitives";
import { cn } from "@/lib/format";

const STATUS_STYLE: Record<string, string> = {
  healthy: "bg-profit/10 text-profit",
  degraded: "bg-warning/10 text-warning",
  down: "bg-loss/10 text-loss",
  unknown: "bg-surface-panel text-text-muted",
};

const REFRESH_STYLE: Record<string, string> = {
  idle: "bg-surface-panel text-text-muted",
  refreshing: "bg-gold/15 text-gold",
  success: "bg-profit/10 text-profit",
  failed: "bg-loss/10 text-loss",
};

export function ProviderStatusTable({ providers }: { providers: InstitutionalProvider[] }) {
  const healthy = providers.filter((p) => p.status === "healthy").length;
  const degraded = providers.filter((p) => p.status === "degraded").length;
  const down = providers.filter((p) => p.status === "down").length;

  return (
    <Panel
      eyebrow="Infrastructure"
      title="Provider Status"
      icon={Server}
      badge={
        <span className="flex items-center gap-1.5 rounded bg-surface-panel px-2 py-0.5 text-[10px] font-bold text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-profit" /> {healthy}/{providers.length} healthy
          {degraded > 0 && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
          {down > 0 && <span className="h-1.5 w-1.5 rounded-full bg-loss" />}
        </span>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted">
              <th className="py-2 pr-2">Provider</th>
              <th className="py-2 pr-2">Asset Class</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2 pr-2">Refresh</th>
              <th className="py-2 pr-2">Health</th>
              <th className="py-2 pr-2 text-right">Latency</th>
              <th className="py-2 pr-2 text-right">Cache Hit</th>
              <th className="py-2 pr-2 text-right">Failures</th>
              <th className="py-2 text-right">Last Update</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.id} className="border-b border-border-subtle/60 last:border-0 hover:bg-surface-panel/30">
                <td className="py-2.5 pr-2">
                  <p className="font-bold text-text-primary">{p.name}</p>
                  <p className="text-[9px] text-text-muted">{p.id} · prio {p.priority}</p>
                </td>
                <td className="py-2.5 pr-2">
                  <span className="rounded bg-surface-panel px-1.5 py-0.5 text-[10px] text-text-secondary">{p.assetClass}</span>
                </td>
                <td className="py-2.5 pr-2">
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", STATUS_STYLE[p.status] ?? STATUS_STYLE.unknown)}>{p.status}</span>
                </td>
                <td className="py-2.5 pr-2">
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", REFRESH_STYLE[p.refreshStatus] ?? REFRESH_STYLE.idle)}>{p.refreshStatus}</span>
                </td>
                <td className="py-2.5 pr-2">
                  <div className="flex w-16 items-center gap-1.5">
                    <ProgressBar value={p.health} tone={p.health >= 70 ? "profit" : p.health >= 40 ? "warning" : "loss"} />
                    <span className="text-[10px] font-bold text-text-primary">{p.health}%</span>
                  </div>
                </td>
                <td className="py-2.5 pr-2 text-right font-mono text-text-secondary">{p.latency}ms</td>
                <td className="py-2.5 pr-2 text-right font-mono text-text-secondary">{p.cacheHitRate}%</td>
                <td className="py-2.5 pr-2 text-right font-mono text-loss">{p.failures}</td>
                <td className="py-2.5 text-right text-[10px] text-text-muted">
                  {p.lastUpdate != null ? `${formatTime(p.lastUpdate)} (${formatDuration(Date.now() - p.lastUpdate)})` : "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
