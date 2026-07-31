"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, ChevronDown, ChevronUp, Server } from "lucide-react";
import type { InstitutionalDashboardData, InstitutionalIntelligence } from "./types";
import { ActionBadge, ProgressBar, RiskBadge, formatTime } from "./primitives";
import { cn } from "@/lib/format";

interface CompactProps {
  asset?: string;
}

function latestForAsset(data: InstitutionalDashboardData, asset?: string): InstitutionalIntelligence | null {
  if (!asset) return data.intelligence;
  if (data.intelligence && data.intelligence.asset.toLowerCase() === asset.toLowerCase()) return data.intelligence;
  const row = data.decisionHistory.find((r) => r.asset.toLowerCase() === asset.toLowerCase());
  if (!row) return null;
  const historyEntry = data.decisionHistory[0];
  return {
    asset: row.asset,
    timestamp: row.timestamp,
    executionDurationMs: null,
    origin: "history",
    decision: {
      action: row.action,
      confidence: row.confidence,
      summary: "",
      reasonsFor: [],
      reasonsAgainst: [],
      keyDrivers: [],
      invalidationConditions: [],
      catalysts: [],
      worstCase: "",
      bestCase: "",
    },
    confidence: { score: row.confidence, level: row.confidence >= 70 ? "High" : row.confidence >= 45 ? "Moderate" : "Low", components: { freshness: 0, providerHealth: 0, evidenceCount: 0, agreement: 0, completeness: 0 } },
    conflicts: { score: row.conflict, severity: row.conflict >= 40 ? "High" : row.conflict >= 20 ? "Moderate" : "Low", conflictingPairs: [], consensusDrivers: [], discordDrivers: [], explanation: "" },
    scenario: { bull: { type: "bull", title: "Bull", probability: 0, supportingEvidence: [], invalidationConditions: [], catalysts: [], risks: [] }, base: { type: "base", title: "Base", probability: 0, supportingEvidence: [], invalidationConditions: [], catalysts: [], risks: [] }, bear: { type: "bear", title: "Bear", probability: 0, supportingEvidence: [], invalidationConditions: [], catalysts: [], risks: [] }, mostLikely: row.scenario as "bull" | "base" | "bear" },
    risk: { marketRisk: "", liquidityRisk: "", volatilityRisk: "", macroRisk: "", institutionalRisk: "", newsRisk: "", eventRisk: "", overallRisk: row.risk, overallScore: 0, breakdown: [] },
    evidence: [],
    aiSummary: null,
    providerHealth: {},
    ...(historyEntry ? {} : {}),
  };
}

export function InstitutionalCompact({ asset }: CompactProps) {
  const [data, setData] = useState<InstitutionalDashboardData | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/institutional/dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`API ${r.status}`))))
      .then((json: InstitutionalDashboardData) => {
        if (active) {
          setData(json);
          setError(null);
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      active = false;
    };
  }, []);

  if (error && !data) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-loss/20 bg-loss/5 px-4 py-3 text-xs text-loss">
        Institutional intelligence unavailable.
      </div>
    );
  }

  if (!data) {
    return <div className="h-16 animate-pulse rounded-lg border border-border-subtle bg-surface-panel/50" />;
  }

  const intelligence = latestForAsset(data, asset);
  const healthy = data.providers.filter((p) => p.status === "healthy").length;

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-panel/40"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold/20 bg-gold/10">
          <BrainCircuit className="h-4 w-4 text-gold" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold">Institutional Intelligence</p>
          <p className="truncate text-xs font-bold text-text-primary">
            {intelligence ? `${intelligence.asset.toUpperCase()} · ${intelligence.decision.action} · ${intelligence.confidence.score}% confidence` : "No research snapshot yet"}
          </p>
        </div>
        <span className="hidden items-center gap-2 text-[10px] text-text-muted sm:flex">
          <span className="flex items-center gap-1"><Server className="h-3 w-3" /> {healthy}/{data.providers.length} providers</span>
        </span>
        {intelligence && (
          <span className="hidden items-center gap-2 text-[10px] text-text-muted md:flex">
            Risk <RiskBadge risk={intelligence.risk.overallRisk} />
          </span>
        )}
        {open ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
      </button>

      {open && intelligence && (
        <div className="space-y-4 border-t border-border-subtle bg-surface-panel/20 p-4 animate-fade-in">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border-subtle bg-surface-card p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted">Overall Decision</p>
              <div className="mt-1.5"><ActionBadge action={intelligence.decision.action} className="px-2 py-1 text-[11px]" /></div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-card p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted">Confidence</p>
              <p className="mt-1.5 text-lg font-black text-text-primary">{intelligence.confidence.score}%</p>
              <ProgressBar value={intelligence.confidence.score} tone="gold" className="mt-1" />
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-card p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted">Conflict</p>
              <p className={cn("mt-1.5 text-lg font-black", intelligence.conflicts.score >= 40 ? "text-loss" : intelligence.conflicts.score >= 20 ? "text-warning" : "text-profit")}>
                {intelligence.conflicts.score}%
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-card p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted">Scenario</p>
              <p className="mt-1.5 text-lg font-black uppercase text-text-primary">{intelligence.scenario.mostLikely}</p>
              <p className="text-[10px] text-text-muted">B {intelligence.scenario.bull.probability}% / {intelligence.scenario.bear.probability}%</p>
            </div>
          </div>

          {intelligence.evidence.length > 0 && (
            <div>
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted">Evidence by Category</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(
                  intelligence.evidence.reduce<Record<string, number>>((acc, e) => {
                    acc[e.category] = (acc[e.category] ?? 0) + 1;
                    return acc;
                  }, {})
                ).map(([cat, count]) => (
                  <span key={cat} className="rounded bg-surface-panel px-2 py-1 text-[10px] text-text-secondary">{cat} <b className="text-text-primary">{count}</b></span>
                ))}
              </div>
            </div>
          )}

          {data.decisionHistory.filter((r) => !asset || r.asset.toLowerCase() === asset.toLowerCase()).slice(0, 3).length > 0 && (
            <div>
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted">Recent Decisions</p>
              <div className="space-y-1.5">
                {data.decisionHistory.filter((r) => !asset || r.asset.toLowerCase() === asset.toLowerCase()).slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-[11px]">
                    <ActionBadge action={r.action} />
                    <span className="text-text-secondary">{formatTime(r.timestamp)}</span>
                    <span className="ml-auto text-text-muted">{r.confidence}% conf · risk {r.risk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
