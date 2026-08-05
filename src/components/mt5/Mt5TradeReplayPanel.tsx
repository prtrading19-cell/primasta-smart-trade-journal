"use client";

import { useEffect, useState } from "react";
import { Clapperboard, RefreshCw } from "lucide-react";
import { PanelShell, ToneBadge } from "@/components/trading/primitives";
import { formatTime } from "@/components/institutional/primitives";
import type { Mt5ReplaySession } from "@/lib/mt5";

export function Mt5TradeReplayPanel() {
  const [sessions, setSessions] = useState<Mt5ReplaySession[]>([]);
  const [selected, setSelected] = useState<Mt5ReplaySession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (proposalId?: string) => {
    try {
      const suffix = proposalId ? `?proposalId=${encodeURIComponent(proposalId)}` : "";
      const res = await fetch(`/api/mt5/replay${suffix}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      if (proposalId) {
        setSelected(json.session as Mt5ReplaySession | null);
      } else {
        setSessions(json.sessions as Mt5ReplaySession[]);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load replay sessions");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const open = (p: string) => {
    setSelected(null);
    void load(p);
  };
  return (
    <PanelShell
      eyebrow="Trade Replay"
      title="Execution Timeline Replay"
      icon={Clapperboard}
      badge={<ToneBadge text={`${sessions.length} sessions`} tone="neutral" />}
    >
      <div className="space-y-4">
        <p className="text-[11px] leading-5 text-text-muted">
          Reconstructs each order&apos;s lifecycle step-by-step from the immutable execution event trail and broker
          confirmations.
        </p>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => {
              setSelected(null);
              void load();
            }}
            className="flex items-center gap-1 rounded-lg bg-surface-panel px-2.5 py-1 text-[10px] font-bold text-text-muted hover:text-text-primary"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
          {selected && (
            <button
              onClick={() => setSelected(null)}
              className="rounded-lg bg-surface-panel px-2.5 py-1 text-[10px] font-bold text-text-muted hover:text-text-primary"
            >
              Back to list
            </button>
          )}
        </div>

        {error && <p className="text-xs text-loss">{error}</p>}

        {!selected && (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {sessions.length === 0 && !error && (
              <p className="rounded-lg border border-border-subtle bg-surface-panel/30 px-3 py-2 text-[11px] text-text-muted">
                No replayable executions yet. Place an order (or approve a proposal) to see its lifecycle here.
              </p>
            )}
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => s.proposalId && open(s.proposalId)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-panel/30 px-3 py-2 text-left transition-colors hover:border-gold/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-text-primary">
                    {s.symbol} · {s.orderType}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {s.steps.length} steps · {s.totalDurationMs != null ? `${(s.totalDurationMs / 1000).toFixed(1)}s` : "—"} ·{" "}
                    {s.result}
                  </p>
                </div>
                <ToneBadge
                  text={s.result}
                  tone={s.result === "accepted" || s.result === "executed" ? "profit" : s.result === "failed" || s.result === "rejected" ? "loss" : "neutral"}
                />
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
              <ToneBadge text={selected.symbol} tone="neutral" />
              <ToneBadge text={selected.orderType} tone="neutral" />
              <span>volume {selected.volume}</span>
              <span>· total {(selected.totalDurationMs ?? 0) / 1000}s</span>
            </div>
            <ol className="relative space-y-0 border-l border-border-subtle pl-4">
              {selected.steps.map((step, i) => (
                <li key={i} className="relative pb-4 last:pb-0">
                  <span className="absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-card bg-gold" />
                  <p className="text-xs font-bold text-text-primary">
                    {step.stage} <span className="ml-1 font-normal text-text-muted">{formatTime(step.at)}</span>
                  </p>
                  <p className="text-[11px] text-text-muted">
                    {step.result}
                    {step.error ? <span className="ml-2 text-loss">{step.error}</span> : null}
                    {step.latencyMs != null && <span className="ml-2 text-gold">{step.latencyMs}ms</span>}
                    {step.deltaMs != null && i > 0 && <span className="ml-2 text-text-muted">+{(step.deltaMs / 1000).toFixed(1)}s</span>}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
