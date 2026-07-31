import { Pause, Play, RotateCw, Settings2 } from "lucide-react";
import type { InstitutionalScheduler } from "./types";
import { Panel, formatClock, formatDuration } from "./primitives";
import { cn } from "@/lib/format";

const STATUS_STYLE: Record<string, string> = {
  running: "bg-profit/10 text-profit",
  paused: "bg-warning/10 text-warning",
  stopped: "bg-loss/10 text-loss",
};

async function schedulerAction(action: string, mutate: () => void) {
  try {
    await fetch(`/api/admin/scheduler?action=${action}`, { method: "POST" });
  } catch {
    /* noop */
  }
  mutate();
}

export function SchedulerPanel({ scheduler, onMutate }: { scheduler: InstitutionalScheduler; onMutate?: () => void }) {
  const mutate = onMutate ?? (() => {});
  const isRunning = scheduler.status === "running";

  const stats = [
    { label: "Uptime", value: formatDuration(scheduler.uptimeMs), sub: `since ${formatClock(scheduler.startedAt)}` },
    { label: "Queue", value: `${scheduler.queueSize}`, sub: `${scheduler.pendingJobs} pending` },
    { label: "Provider Refreshes", value: `${scheduler.totalProviderRefreshes}`, sub: `${scheduler.successfulRefreshCount} ok / ${scheduler.failedRefreshCount} failed` },
    { label: "Asset Refreshes", value: `${scheduler.totalAssetRefreshes}`, sub: scheduler.lastRefreshAt != null ? `last ${formatClock(scheduler.lastRefreshAt)}` : "never" },
    { label: "Avg Latency", value: `${scheduler.averageLatency}ms`, sub: scheduler.lastLatency ? `last ${scheduler.lastLatency}ms` : "" },
    { label: "Refresh Frequency", value: `${scheduler.refreshFrequency}ms`, sub: "interval" },
  ];

  return (
    <Panel
      eyebrow="Orchestration"
      title="Scheduler Engine"
      icon={Settings2}
      badge={<span className={cn("rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_STYLE[scheduler.status] ?? STATUS_STYLE.stopped)}>{scheduler.status}</span>}
    >
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => schedulerAction(isRunning ? "pause" : "start", mutate)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
            isRunning ? "bg-warning/15 text-warning hover:bg-warning/25" : "bg-profit/15 text-profit hover:bg-profit/25"
          )}
        >
          {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          onClick={() => schedulerAction("refresh-all", mutate)}
          className="flex items-center gap-1.5 rounded-lg bg-gold/15 px-3 py-1.5 text-xs font-bold text-gold transition-colors hover:bg-gold/25"
        >
          <RotateCw className="h-3.5 w-3.5" /> Refresh All
        </button>
        {scheduler.lastError && (
          <span className="ml-auto truncate text-[10px] text-loss">Last error: {scheduler.lastError}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border-subtle bg-surface-panel/40 p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted">{s.label}</p>
            <p className="mt-1 truncate text-sm font-black text-text-primary">{s.value}</p>
            {s.sub && <p className="mt-0.5 truncate text-[9px] text-text-muted">{s.sub}</p>}
          </div>
        ))}
      </div>
    </Panel>
  );
}
