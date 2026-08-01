"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { useResearchAsset } from "@/context/ResearchAssetContext";
import { getProfile } from "@/lib/research/ResearchRegistry";
import { analyzeResearchAsset, buildAutoFillSummary } from "@/lib/research/ResearchService";
import { collectUS100Data, mapUS100DataToEngine, buildUS100TechnicalInput, buildUS100InstitutionalInput } from "@/lib/research/us100";
import type { US100FullDataset } from "@/lib/research/us100";
import type { ResearchEngineResult, ResearchSummary, ResearchSection } from "@/lib/research/ResearchTypes";
import type { DriverAnalysisObject } from "@/types/goldResearchConfig";
import type { InstitutionalFlowResult } from "@/types/institutionalFlow";

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
  EtfFlowsCard,
  OpenInterestCard,
} from "./sections";
import { LoadingSkeleton } from "./shared";
import { InstitutionalCompact } from "@/components/institutional";

interface MacroDriver {
  label: string;
  value: string;
  impact: string;
  reason: string;
  source: string;
}

const US100_INSTITUTIONAL_TERM_MAP: Record<string, string> = {
  "Central Bank Demand": "Large Trader Positioning",
  "COT Positioning": "Market Participant Positioning",
  "Open Interest": "Derivatives Exposure",
};

function refineUS100InstitutionalFlow(flow: InstitutionalFlowResult): InstitutionalFlowResult {
  const renamedFactors = flow.factors.map((factor) => {
    const name = US100_INSTITUTIONAL_TERM_MAP[factor.name] ?? factor.name;
    const reason = factor.reason
      .replace(/central bank/gi, "large trader")
      .replace(/COT/gi, "market participant")
      .replace(/open interest/gi, "derivatives exposure");
    return { ...factor, name, reason };
  });

  const renamedAvailable = flow.dataQuality.availableDrivers.map((d) =>
    US100_INSTITUTIONAL_TERM_MAP[d] ?? d
  );
  const renamedMissing = flow.dataQuality.missingDrivers.map((d) =>
    US100_INSTITUTIONAL_TERM_MAP[d] ?? d
  );

  const summary = flow.summary
    .replace(/central bank/gi, "large trader")
    .replace(/COT/gi, "market participant")
    .replace(/open interest/gi, "derivatives exposure");

  return {
    ...flow,
    factors: renamedFactors,
    summary,
    dataQuality: {
      ...flow.dataQuality,
      availableDrivers: renamedAvailable,
      missingDrivers: renamedMissing,
    },
  };
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

      const result = analyzeResearchAsset({
        asset: "us100",
        driverAnalyses,
        technicalInput,
        institutionalInput,
        currentPrice: data.index.meta.status === "live" ? data.index.price : undefined,
        timestamp: data.collectedAt,
      });

      if (result.success && result.analysis) {
        const refinedInstitutionalFlow = refineUS100InstitutionalFlow(result.analysis.institutionalFlow);
        const refinedAnalysis = {
          ...result.analysis,
          institutionalFlow: refinedInstitutionalFlow,
        };

        setEngineResult(refinedAnalysis);
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
        const decisionForSummary = refinedAnalysis.decision;
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
    const drivers: MacroDriver[] = [];

    if (dataset.index.meta.status === "live") {
      drivers.push({
        label: "Market Snapshot",
        value: `${dataset.index.price.toFixed(2)} (${dataset.index.changePercent >= 0 ? "+" : ""}${dataset.index.changePercent.toFixed(2)}%)`,
        impact: dataset.index.changePercent >= 0 ? "Bullish" : "Bearish",
        reason: "Derived from live data",
        source: dataset.index.meta.source,
      });
    }

    if (dataset.volatility.meta.status === "live") {
      const vol = dataset.volatility;
      drivers.push({
        label: "Volatility Environment",
        value: `VIX ${vol.vix !== null ? vol.vix.toFixed(2) : "N/A"} | Risk: ${vol.riskRating}`,
        impact: vol.riskRating === "Extreme" || vol.riskRating === "High" ? "Bearish" : "Neutral",
        reason: "Derived from Twelve Data stocks",
        source: vol.meta.source,
      });
    }

    if (dataset.movers.meta.status === "live") {
      if (dataset.movers.topGainers.length > 0) {
        const top = dataset.movers.topGainers[0];
        drivers.push({
          label: "Top Gainer",
          value: `${top.symbol} $${top.price.toFixed(2)} (+${top.changePercent.toFixed(2)}%)`,
          impact: "Bullish",
          reason: "Leading momentum",
          source: dataset.movers.meta.source,
        });
      }
      if (dataset.movers.topLosers.length > 0) {
        const bottom = dataset.movers.topLosers[0];
        drivers.push({
          label: "Top Loser",
          value: `${bottom.symbol} $${bottom.price.toFixed(2)} (${bottom.changePercent.toFixed(2)}%)`,
          impact: "Bearish",
          reason: "Weakest momentum",
          source: dataset.movers.meta.source,
        });
      }
    }

    return drivers;
  }, [dataset]);

  const hasMacroProviderData = dataset?.macro?.meta.status === "live";

  const dataSources = useMemo(() => {
    if (!dataset) return [];
    const sources: { name: string; status: "live" | "delayed" | "unavailable" | "error"; timestamp?: string; error?: string }[] = [];
    sources.push({ name: dataset.index.meta.source, status: dataset.index.meta.status, timestamp: dataset.index.meta.lastUpdated, error: dataset.index.meta.error });
    sources.push({ name: "Twelve Data Stocks", status: dataset.stocks.some((s) => s.meta.status === "live") ? "live" : "unavailable", timestamp: dataset.collectedAt });
    sources.push({ name: dataset.sectors.meta.source, status: dataset.sectors.meta.status, timestamp: dataset.sectors.meta.lastUpdated, error: dataset.sectors.meta.error });
    const earningsLive = dataset.earnings.some((e) => e.meta.status === "live");
    const earningsName = earningsLive ? (dataset.earnings[0]?.meta.source ?? "FMP Earnings") : "Corporate Earnings";
    const earningsError = earningsLive ? undefined : "Corporate Earnings unavailable (FMP rate limit)";
    sources.push({ name: earningsName, status: earningsLive ? "live" : "unavailable", timestamp: dataset.collectedAt, error: earningsError });
    sources.push({ name: dataset.movers.meta.source, status: dataset.movers.meta.status, timestamp: dataset.movers.meta.lastUpdated, error: dataset.movers.meta.error });
    sources.push({ name: dataset.volatility.meta.source, status: dataset.volatility.meta.status, timestamp: dataset.volatility.meta.lastUpdated, error: dataset.volatility.meta.error });
    sources.push({ name: dataset.volatilityInstitutional?.meta.source ?? "Institutional Volatility", status: (dataset.volatilityInstitutional?.meta.status === "live" ? "live" : "unavailable") as "live" | "unavailable", timestamp: dataset.volatilityInstitutional?.meta.timestamp, error: dataset.volatilityInstitutional?.meta.error });
    sources.push({ name: dataset.etf?.meta.source ?? "ETF Flows", status: (dataset.etf?.meta.status === "live" ? "live" : "unavailable") as "live" | "unavailable", timestamp: dataset.etf?.meta.timestamp, error: dataset.etf?.meta.error });
    const cotLive = dataset.cot?.some((c) => c.meta.status === "live");
    sources.push({ name: "COT", status: cotLive ? "live" : "unavailable", timestamp: dataset.cot?.[0]?.meta.timestamp });
    const oiLive = dataset.openInterest?.some((o) => o.meta.status === "live");
    sources.push({ name: "Open Interest", status: oiLive ? "live" : "unavailable", timestamp: dataset.openInterest?.[0]?.meta.timestamp });
    const macroLive = dataset.macro?.meta.status === "live";
    sources.push({ name: dataset.macro?.meta.source ?? "Macro", status: macroLive ? "live" : "unavailable", timestamp: dataset.macro?.meta.timestamp, error: dataset.macro?.meta.error });
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

      {/* Institutional Intelligence strip */}
      <InstitutionalCompact asset="us100" />

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
            <MacroEnvironmentCard drivers={macroDrivers} macroData={hasMacroProviderData ? dataset.macro : undefined} />
            <VolatilityCard volatility={dataset.volatility} />
          </div>

          {/* Earnings + Sector Rotation — two column */}
          <div className="grid gap-6 md:grid-cols-2">
            <EarningsCard earnings={dataset.earnings} />
            <SectorRotationCard sectors={dataset.sectors} />
          </div>

          {/* Market Breadth + Technical — two column */}
          <div className="grid gap-6 md:grid-cols-2">
            <MarketBreadthCard breadth={dataset.marketBreadth} />
            {engineResult && <TechnicalCard technicalBias={engineResult.technicalBias} />}
          </div>

          {/* Institutional Data: ETF, OI, GVZ — two column */}
          <div className="grid gap-6 md:grid-cols-2">
            <EtfFlowsCard etf={dataset.etf} />
            <div className="space-y-6">
              <OpenInterestCard records={dataset.openInterest} />
              {dataset.volatilityInstitutional?.meta.status === "live" && dataset.volatilityInstitutional.gvz !== null ? (
                <div className="rounded-lg border border-border-subtle bg-surface-card shadow-soft">
                  <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">GVZ (Gold Volatility)</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-secondary">GVZ</span>
                        <span className={`font-medium ${dataset.volatilityInstitutional.gvz > 25 ? "text-loss" : dataset.volatilityInstitutional.gvz > 18 ? "text-gold" : "text-profit"}`}>
                          {dataset.volatilityInstitutional.gvz.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-secondary">Change</span>
                        <span className={`font-medium ${(dataset.volatilityInstitutional.gvzChange ?? 0) >= 0 ? "text-profit" : "text-loss"}`}>
                          {dataset.volatilityInstitutional.gvzChange !== null ? `${dataset.volatilityInstitutional.gvzChange >= 0 ? "+" : ""}${dataset.volatilityInstitutional.gvzChange.toFixed(2)}` : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-secondary">Trend</span>
                        <span className="font-medium text-text-primary">{dataset.volatilityInstitutional.trend}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-secondary">Risk</span>
                        <span className={`font-medium ${dataset.volatilityInstitutional.riskRating === "Extreme" || dataset.volatilityInstitutional.riskRating === "High" ? "text-loss" : dataset.volatilityInstitutional.riskRating === "Moderate" ? "text-gold" : "text-profit"}`}>
                          {dataset.volatilityInstitutional.riskRating}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
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
