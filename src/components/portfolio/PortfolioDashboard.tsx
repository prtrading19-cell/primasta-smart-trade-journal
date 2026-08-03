"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { PortfolioIntelligenceResult } from "./types";
import { PortfolioHero } from "./PortfolioHero";
import { SummaryPanel } from "./SummaryPanel";
import { DecisionPanel } from "./DecisionPanel";
import { PositionsPanel } from "./PositionsPanel";
import { CorrelationPanel } from "./CorrelationPanel";
import { ExposurePanel } from "./ExposurePanel";
import { DiversificationPanel } from "./DiversificationPanel";
import { RiskPanel } from "./RiskPanel";
import { AllocationPanel } from "./AllocationPanel";
import { HedgingPanel } from "./HedgingPanel";
import { InstitutionalFlowPanel } from "./InstitutionalFlowPanel";
import { TimelinePanel } from "./TimelinePanel";
import { HistoryPanel } from "./HistoryPanel";
import { DataQualityPanel } from "./DataQualityPanel";
import { formatTime } from "@/components/institutional/primitives";

export function PortfolioDashboard({ pollIntervalMs = 30000 }: { pollIntervalMs?: number }) {
  const [data, setData] = useState<PortfolioIntelligenceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/portfolio/intelligence");
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const json = (await res.json()) as PortfolioIntelligenceResult;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load portfolio intelligence.");
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
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border-subtle bg-surface-panel/50" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-loss/20 bg-loss/5 p-5">
        <AlertCircle className="h-5 w-5 shrink-0 text-loss" />
        <div>
          <p className="text-sm font-bold text-text-primary">Portfolio Intelligence unavailable</p>
          <p className="text-xs text-text-muted">{error}</p>
        </div>
        <button onClick={load} className="ml-auto flex items-center gap-1.5 rounded-lg bg-surface-panel px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-surface-panel/70">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-profit opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-profit" />
          </span>
          Portfolio snapshot · updated {formatTime(data.generatedAt)}
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg bg-surface-panel px-2.5 py-1 text-[10px] font-bold text-text-muted transition-colors hover:text-text-primary">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      <PortfolioHero data={data} />
      <SummaryPanel summary={data.summary} />
      <DecisionPanel
        decision={data.decision}
        conflicts={data.conflicts}
        opportunities={data.opportunities}
        warnings={data.warnings}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <PositionsPanel positions={data.positions} />
        <CorrelationPanel correlation={data.correlation} />
        <ExposurePanel exposure={data.exposure} />
        <DiversificationPanel diversification={data.diversification} />
        <RiskPanel risk={data.risk} />
        <AllocationPanel allocation={data.allocation} />
        <HedgingPanel hedging={data.hedging} />
        <InstitutionalFlowPanel flows={data.institutionalFlows} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TimelinePanel timeline={data.timeline} />
        <HistoryPanel history={data.history} />
      </div>

      <DataQualityPanel quality={data.dataQuality} />
    </div>
  );
}
