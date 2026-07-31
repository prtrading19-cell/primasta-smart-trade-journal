"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { InstitutionalDashboardData } from "./types";
import { DecisionIntelligenceHero } from "./DecisionIntelligenceHero";
import { EvidencePanel } from "./EvidencePanel";
import { ConfidenceBreakdownPanel } from "./ConfidenceBreakdownPanel";
import { ConflictPanel } from "./ConflictPanel";
import { ScenarioPanel } from "./ScenarioPanel";
import { RiskPanel } from "./RiskPanel";
import { ProviderStatusTable } from "./ProviderStatusPanel";
import { SchedulerPanel } from "./SchedulerPanel";
import { TimelinePanel } from "./TimelinePanel";
import { DecisionHistoryTable } from "./DecisionHistoryTable";
import { InstitutionalAnalyticsSection } from "./InstitutionalAnalyticsSection";
import { formatTime } from "./primitives";

export function InstitutionalDashboard({ pollIntervalMs = 30000 }: { pollIntervalMs?: number }) {
  const [data, setData] = useState<InstitutionalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/institutional/dashboard");
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const json = (await res.json()) as InstitutionalDashboardData;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load institutional intelligence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    timer.current = setInterval(load, pollIntervalMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [pollIntervalMs]);

  if (loading && !data) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border-subtle bg-surface-panel/50" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-loss/20 bg-loss/5 p-5">
        <AlertCircle className="h-5 w-5 shrink-0 text-loss" />
        <div>
          <p className="text-sm font-bold text-text-primary">Institutional Intelligence unavailable</p>
          <p className="text-xs text-text-muted">{error}</p>
        </div>
        <button onClick={load} className="ml-auto flex items-center gap-1.5 rounded-lg bg-surface-panel px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-surface-panel/70">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const mutate = () => load();

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-profit opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-profit" />
          </span>
          Live institutional snapshot · updated {data.fetchedAt ? formatTime(data.fetchedAt) : "—"}
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg bg-surface-panel px-2.5 py-1 text-[10px] font-bold text-text-muted transition-colors hover:text-text-primary">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {data.intelligence && (
        <>
          <DecisionIntelligenceHero intelligence={data.intelligence} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ConfidenceBreakdownPanel intelligence={data.intelligence} />
            <RiskPanel risk={data.intelligence.risk} />
            <ConflictPanel conflicts={data.intelligence.conflicts} />
            <ScenarioPanel scenario={data.intelligence.scenario} />
          </div>
          <EvidencePanel evidence={data.intelligence.evidence} />
        </>
      )}

      <SchedulerPanel scheduler={data.scheduler} onMutate={mutate} />
      <ProviderStatusTable providers={data.providers} />

      <InstitutionalAnalyticsSection data={data} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TimelinePanel timeline={data.timeline} />
        <DecisionHistoryTable rows={data.decisionHistory} />
      </div>
    </div>
  );
}
