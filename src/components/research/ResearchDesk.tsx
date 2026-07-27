"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { useResearchAsset } from "@/context/ResearchAssetContext";
import { getProfile } from "@/lib/research/ResearchRegistry";
import { analyzeResearchAsset, buildAutoFillSummary } from "@/lib/research/ResearchService";
import { collectUS100Data, mapUS100DataToEngine, buildUS100MacroContext, buildUS100TechnicalInput, buildUS100InstitutionalInput } from "@/lib/research/us100";
import type { US100FullDataset } from "@/lib/research/us100";
import type { ResearchEngineResult, ResearchSummary, ResearchSection } from "@/lib/research/ResearchTypes";
import type { DriverAnalysisObject } from "@/types/goldResearchConfig";

import {
  MarketOverviewCard,
  MegaCapLeadershipCard,
  MacroEnvironmentCard,
  EarningsCard,
  SectorRotationCard,
  MarketBreadthCard,
  VolatilityCard,
  TechnicalCard,
  InstitutionalSummaryCard,
  AIAnalysisCard,
  DecisionCard,
  DataStatusCard,
} from "./sections";
import { LoadingSkeleton } from "./shared";

interface MacroDriver {
  label: string;
  value: string;
  impact: string;
  reason: string;
  source: string;
}

export function US100ResearchDesk() {
  const { selectedAsset } = useResearchAsset();
  const profile = getProfile(selectedAsset);

  const [dataset, setDataset] = useState<US100FullDataset | null>(null);
  const [engineResult, setEngineResult] = useState<ResearchEngineResult | null>(null);
  const [summary, setSummary] = useState<ResearchSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const collectAndAnalyze = useCallback(async () => {
    if (selectedAsset !== "us100" || !profile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await collectUS100Data();
      setDataset(data);

      const driverAnalyses: DriverAnalysisObject[] = mapUS100DataToEngine(data);
      const technicalInput = buildUS100TechnicalInput(data);
      const institutionalInput = buildUS100InstitutionalInput(data);

      console.log("[RUNTIME-AUDIT] buildUS100TechnicalInput output:", JSON.stringify(technicalInput, null, 2));
      console.log("[RUNTIME-AUDIT] buildUS100InstitutionalInput output:", JSON.stringify(institutionalInput, null, 2));
      console.log("[RUNTIME-AUDIT] dataset.index.meta.status:", data.index.meta.status);
      console.log("[RUNTIME-AUDIT] dataset.stocks.length:", data.stocks.length, "live:", data.stocks.filter(s => s.meta.status === "live").length);
      console.log("[RUNTIME-AUDIT] dataset.volatility.meta.status:", data.volatility.meta.status, "vix:", data.volatility.vix);
      console.log("[RUNTIME-AUDIT] dataset.sectors.meta.status:", data.sectors.meta.status);
      console.log("[RUNTIME-AUDIT] driverAnalyses count:", driverAnalyses.length);

      const result = analyzeResearchAsset({
        asset: "us100",
        driverAnalyses,
        technicalInput,
        institutionalInput,
        currentPrice: data.index.meta.status === "live" ? data.index.price : undefined,
        timestamp: data.collectedAt,
      });

      console.log("[RUNTIME-AUDIT] analyzeResearchAsset result.success:", result.success);
      console.log("[RUNTIME-AUDIT] analyzeResearchAsset result.error:", result.error);

      if (result.success && result.analysis) {
        console.log("[RUNTIME-AUDIT] engineResult.categoryScores:", JSON.stringify(result.analysis.categoryScores, null, 2));
        console.log("[RUNTIME-AUDIT] engineResult.technicalBias:", JSON.stringify(result.analysis.technicalBias, null, 2));
        console.log("[RUNTIME-AUDIT] engineResult.institutionalFlow:", JSON.stringify(result.analysis.institutionalFlow, null, 2));
        console.log("[RUNTIME-AUDIT] engineResult.decision:", JSON.stringify(result.analysis.decision, null, 2));
        console.log("[RUNTIME-AUDIT] engineResult.institutionalDecision:", JSON.stringify(result.analysis.institutionalDecision, null, 2));
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
        const s = buildAutoFillSummary("us100", sections, decisionForSummary);
        setSummary(s);
      } else {
        setError(result.error || "Engine analysis failed");
      }
      setLastFetched(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to collect US100 data");
    } finally {
      setLoading(false);
    }
  }, [selectedAsset, profile]);

  useEffect(() => {
    if (selectedAsset === "us100") {
      collectAndAnalyze();
    }
  }, [selectedAsset, collectAndAnalyze]);

  const macroDrivers: MacroDriver[] = useMemo(() => {
    if (!dataset) return [];
    const ctx = buildUS100MacroContext(dataset);
    return [
      { label: "Market Snapshot", value: ctx || "N/A", impact: "Neutral", reason: "Derived from live data", source: "FMP / Twelve Data" },
    ];
  }, [dataset]);

  const dataSources = useMemo(() => {
    if (!dataset) return [];
    const sources: { name: string; status: "live" | "delayed" | "unavailable" | "error"; timestamp?: string; error?: string }[] = [];
    sources.push({ name: dataset.index.meta.source, status: dataset.index.meta.status, timestamp: dataset.index.meta.lastUpdated, error: dataset.index.meta.error });
    sources.push({ name: "Twelve Data Stocks", status: dataset.stocks.some((s) => s.meta.status === "live") ? "live" : "unavailable", timestamp: dataset.collectedAt });
    sources.push({ name: dataset.sectors.meta.source, status: dataset.sectors.meta.status, timestamp: dataset.sectors.meta.lastUpdated, error: dataset.sectors.meta.error });
    sources.push({ name: dataset.earnings.length > 0 ? dataset.earnings[0].meta.source : "FMP Earnings", status: dataset.earnings.some((e) => e.meta.status === "live") ? "live" : "unavailable", timestamp: dataset.collectedAt });
    sources.push({ name: dataset.movers.meta.source, status: dataset.movers.meta.status, timestamp: dataset.movers.meta.lastUpdated, error: dataset.movers.meta.error });
    sources.push({ name: dataset.volatility.meta.source, status: dataset.volatility.meta.status, timestamp: dataset.volatility.meta.lastUpdated, error: dataset.volatility.meta.error });
    return sources;
  }, [dataset]);

  if (selectedAsset !== "us100") return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">US100 Institutional Research</h2>
          <p className="text-xs text-text-muted">Nasdaq-100 — Mega Cap Leadership, Macro Environment, Sector Rotation, Technical Analysis</p>
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

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-loss/30 bg-loss/5 px-4 py-3 text-xs text-loss">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !dataset && (
        <div className="rounded-lg border border-border-subtle bg-surface-card p-6">
          <LoadingSkeleton rows={5} />
        </div>
      )}

      {/* Content */}
      {dataset && (
        <>
          {/* Decision + Market Overview — top row */}
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <MarketOverviewCard index={dataset.index} />
            {engineResult && <DecisionCard decision={engineResult.decision} institutionalDecision={engineResult.institutionalDecision} />}
          </div>

          {/* Mega Cap Leadership — full width */}
          <MegaCapLeadershipCard stocks={dataset.stocks} />

          {/* Macro + Volatility — two column */}
          <div className="grid gap-6 md:grid-cols-2">
            <MacroEnvironmentCard drivers={macroDrivers} />
            <VolatilityCard volatility={dataset.volatility} />
          </div>

          {/* Earnings + Sector Rotation — two column */}
          <div className="grid gap-6 md:grid-cols-2">
            <EarningsCard earnings={dataset.earnings} />
            <SectorRotationCard sectors={dataset.sectors} />
          </div>

          {/* Market Breadth + Technical — two column */}
          <div className="grid gap-6 md:grid-cols-2">
            <MarketBreadthCard available={engineResult?.categoryScores.scores.some(s => s.categoryId === "breadth" && s.driverCount > 0 && s.confidence > 20) ?? false} />
            {engineResult && <TechnicalCard technicalBias={engineResult.technicalBias} />}
          </div>

          {/* Institutional Flow — full width */}
          {engineResult && <InstitutionalSummaryCard institutionalFlow={engineResult.institutionalFlow} />}

          {/* AI Summary — full width */}
          <AIAnalysisCard summary={summary} />

          {/* Data Status — footer */}
          <DataStatusCard sources={dataSources} collectedAt={dataset.collectedAt} errors={dataset.errors} />
        </>
      )}

      {/* Engine diagnostics */}
      {engineResult && (
        <div className="rounded-lg border border-border-subtle bg-surface-card p-4">
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
