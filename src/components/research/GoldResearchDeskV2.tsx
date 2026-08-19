"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { useResearchAsset } from "@/context/ResearchAssetContext";
import { getProfile } from "@/lib/research/ResearchRegistry";
import { analyzeResearchAsset, buildAutoFillSummary } from "@/lib/research/ResearchService";
import { collectGoldData, mapGoldDataToEngine, buildGoldTechnicalInput, buildGoldInstitutionalInput } from "@/lib/research/gold";
import type { GoldFullDataset } from "@/lib/research/gold";
import type { ResearchEngineResult, ResearchSummary, ResearchSection } from "@/lib/research/ResearchTypes";
import type { DriverAnalysisObject } from "@/types/goldResearchConfig";

import {
  MacroEnvironmentCard,
  VolatilityCard,
  TechnicalCard,
  InstitutionalSummaryCard,
  AIAnalysisCard,
  DecisionCard,
  DataStatusCard,
  EtfFlowsCard,
  OpenInterestCard,
} from "./sections";
import { LoadingSkeleton } from "./shared";
import { InstitutionalCompact } from "@/components/institutional";

export function GoldResearchDeskV2() {
  const { selectedAsset } = useResearchAsset();
  const profile = getProfile(selectedAsset);

  const [dataset, setDataset] = useState<GoldFullDataset | null>(null);
  const [engineResult, setEngineResult] = useState<ResearchEngineResult | null>(null);
  const [summary, setSummary] = useState<ResearchSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const collectAndAnalyze = useCallback(async () => {
    if (selectedAsset !== "gold" || !profile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await collectGoldData();
      setDataset(data);

      const driverAnalyses: DriverAnalysisObject[] = mapGoldDataToEngine(data);
      const technicalInput = buildGoldTechnicalInput(data);
      const institutionalInput = buildGoldInstitutionalInput(data);

      const result = analyzeResearchAsset({
        asset: "gold",
        driverAnalyses,
        technicalInput,
        institutionalInput,
        currentPrice: data.meta.status === "live" ? data.goldPrice : undefined,
        timestamp: data.collectedAt,
      });

      if (result.success && result.analysis) {
        setEngineResult(result.analysis);
        const sections: ResearchSection[] = driverAnalyses.map((d) => ({
          driver: d.driverTitle,
          currentDataValue: d.dataFields?.price ?? d.dataFields?.status ?? "",
          direction: d.bias,
          newsHeadline: "",
          newsSummary: d.biasReason,
          chartObservation: d.technicalObservation,
          sourceLink: d.sourceUrl || "",
          impact: d.bias,
          reason: d.reason || d.biasReason,
        }));
        const decisionForSummary = result.analysis.decision;
        const s = buildAutoFillSummary("gold", sections, decisionForSummary);
        setSummary(s);
      } else {
        setError(result.error || "Engine analysis failed");
      }
      setLastFetched(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to collect gold data");
    } finally {
      setLoading(false);
    }
  }, [selectedAsset, profile]);

  useEffect(() => {
    if (selectedAsset === "gold") {
      collectAndAnalyze();
    }
  }, [selectedAsset, collectAndAnalyze]);

  const dataSources = useMemo(() => {
    if (!dataset) return [];
    const sourceStatus = (meta?: { status?: string; stale?: boolean }): "live" | "delayed" | "unavailable" => {
      if (!meta) return "unavailable";
      if (meta.stale) return "delayed";
      if (meta.status === "live") return "live";
      if (meta.status === "delayed") return "delayed";
      return "unavailable";
    };
    const sources: { name: string; status: "live" | "delayed" | "unavailable" | "error"; timestamp?: string; error?: string }[] = [];
    sources.push({ name: "Twelve Data Gold", status: sourceStatus(dataset.meta), timestamp: dataset.meta.lastUpdated, error: dataset.meta.error });
    if (dataset.macro) sources.push({ name: dataset.macro.meta.source, status: sourceStatus(dataset.macro.meta), timestamp: dataset.macro.meta.timestamp, error: dataset.macro.meta.error });
    if (dataset.volatilityInstitutional) sources.push({ name: dataset.volatilityInstitutional.meta.source, status: sourceStatus(dataset.volatilityInstitutional.meta), timestamp: dataset.volatilityInstitutional.meta.timestamp, error: dataset.volatilityInstitutional.meta.error });
    if (dataset.etf) sources.push({ name: dataset.etf.meta.source, status: sourceStatus(dataset.etf.meta), timestamp: dataset.etf.meta.timestamp, error: dataset.etf.meta.error });
    if (dataset.cot && dataset.cot.length > 0) {
      const cotMeta = dataset.cot.find((c) => c.meta.status === "live")?.meta ?? dataset.cot[0]?.meta;
      sources.push({ name: "CFTC COT", status: sourceStatus(cotMeta), timestamp: cotMeta?.timestamp, error: cotMeta?.error });
    }
    if (dataset.openInterest && dataset.openInterest.length > 0) {
      const oiMeta = dataset.openInterest.find((o) => o.meta.status === "live")?.meta ?? dataset.openInterest[0]?.meta;
      sources.push({ name: "COMEX Open Interest", status: sourceStatus(oiMeta), timestamp: oiMeta?.timestamp, error: oiMeta?.error });
    }
    return sources;
  }, [dataset]);

  if (selectedAsset !== "gold") return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Gold Institutional Research</h2>
          <p className="text-xs text-text-muted">XAU/USD — Macro Drivers, Technical Analysis, Institutional Flow, Decision Engine</p>
        </div>
        <button
          onClick={collectAndAnalyze}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-4 py-2 text-xs font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Fetching..." : "Refresh Data"}
        </button>
      </div>

      <InstitutionalCompact asset="gold" />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-loss/30 bg-loss/5 px-4 py-3 text-xs text-loss">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {loading && !dataset && (
        <div className="rounded-xl border border-border-subtle bg-surface-card p-6">
          <LoadingSkeleton rows={5} />
        </div>
      )}

      {dataset && (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <GoldOverviewCard dataset={dataset} />
            {engineResult && <DecisionCard decision={engineResult.decision} institutionalDecision={engineResult.institutionalDecision} />}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <MacroEnvironmentCard
              drivers={dataset.macro?.meta.status === "live" ? dataset.macro.indicators.map((ind) => ({
                label: ind.name,
                value: `${ind.value} (${ind.change >= 0 ? "+" : ""}${ind.change})`,
                impact: ind.impact,
                reason: ind.trend,
                source: dataset.macro!.meta.source,
              })) : []}
              macroData={dataset.macro}
            />
            <VolatilityCard volatility={dataset.volatilityInstitutional ?? { vix: null, gvz: null, gvzChange: null, trend: "N/A", riskRating: "N/A", meta: { source: "composite", status: "unavailable", lastUpdated: "", timestamp: "" } } as any} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {engineResult && <TechnicalCard technicalBias={engineResult.technicalBias} />}
            <div className="space-y-6">
              <EtfFlowsCard etf={dataset.etf} />
              <OpenInterestCard records={dataset.openInterest} />
            </div>
          </div>

          {engineResult && <InstitutionalSummaryCard institutionalFlow={engineResult.institutionalFlow} />}

          <AIAnalysisCard summary={summary} />

          <DataStatusCard sources={dataSources} collectedAt={dataset.collectedAt} errors={dataset.errors} />
        </>
      )}

      {engineResult && (
        <div className="rounded-xl border border-border-subtle bg-surface-card p-4">
          <div className="flex items-center justify-between text-[10px] text-text-muted">
            <span>Pipeline: {engineResult.pipelineStatus} | Schema: {engineResult.schemaVersion}</span>
            <span>Execution: {engineResult.executionTimeMs}ms | Drivers: {engineResult.driverAnalyses.length}</span>
          </div>
          {engineResult.warnings.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {engineResult.warnings.map((w, i) => (
                <span key={i} className="rounded bg-gold/10 px-1.5 py-0.5 text-[10px] text-gold">{w}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoldOverviewCard({ dataset }: { dataset: GoldFullDataset }) {
  const isLive = dataset.meta.status === "live";
  const changeDir = dataset.goldChange >= 0 ? "+" : "";
  const changePctDir = dataset.goldChangePercent >= 0 ? "+" : "";

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Gold / XAU/USD</span>
        {isLive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-profit/15 px-2 py-0.5 text-[10px] font-bold text-profit">
            <span className="h-1.5 w-1.5 rounded-full bg-profit animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-black tracking-tight text-text-primary">
          ${dataset.goldPrice.toFixed(2)}
        </span>
        {isLive && (
          <span className={`text-sm font-bold ${dataset.goldChange >= 0 ? "text-profit" : "text-loss"}`}>
            {changeDir}{dataset.goldChange.toFixed(2)} ({changePctDir}{dataset.goldChangePercent.toFixed(2)}%)
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="flex justify-between">
          <span className="text-text-muted">Open</span>
          <span className="font-medium text-text-primary">${dataset.goldOpen.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">High</span>
          <span className="font-medium text-profit">${dataset.goldHigh.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Low</span>
          <span className="font-medium text-loss">${dataset.goldLow.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Prev Close</span>
          <span className="font-medium text-text-primary">${dataset.goldPreviousClose.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px] text-text-muted">
        <span>Source: {dataset.meta.source}</span>
        {dataset.meta.lastUpdated && <span>| Updated: {new Date(dataset.meta.lastUpdated).toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}
