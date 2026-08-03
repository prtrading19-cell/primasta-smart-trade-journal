import "../initialize";
import type {
  CapitalAllocationResult,
  CorrelationMatrix,
  DiversificationResult,
  ExposureResult,
  HedgingResult,
  InstitutionalFlowItem,
  PortfolioAssetConfig,
  PortfolioBias,
  PortfolioConflict,
  PortfolioDecision,
  PortfolioHistoryEntry,
  PortfolioIntelligenceResult,
  PortfolioOpportunity,
  PortfolioPosition,
  PortfolioRiskResult,
  PortfolioSummary,
  PortfolioWarning,
} from "./types";
import type { ResearchSnapshot } from "../repository/types";
import type { ProviderResult } from "../providers/shared";
import type { COTReportData, ETFData, MacroData, OpenInterestRecord, BreadthData, VolatilityData } from "@/types/institutional";
import { getSharedSingleton } from "../infrastructure/singleton";
import { ProviderCache } from "../infrastructure/ProviderCache";
import { ResearchRepository } from "../repository/ResearchRepository";
import { run as runPipeline } from "../engine/ResearchPipeline";
import { collectAssetData } from "../config";
import { ensureAssetRegistryLoaded, getConfig } from "../config/AssetRegistryLoader";
import { getEnabledAssets } from "../asset/AssetRegistry";
import { initializeProviderRegistry } from "../infrastructure/registerProviders";
import { PortfolioTimeline } from "./PortfolioTimeline";
import { PortfolioHistory } from "./PortfolioHistory";
import { PortfolioPositionEngine } from "./PortfolioPositionEngine";
import { computeCrossAssetCorrelation } from "./CrossAssetCorrelationEngine";
import { computeExposure } from "./ExposureEngine";
import { computeDiversification } from "./DiversificationEngine";
import { computePortfolioRisk } from "./PortfolioRiskEngine";
import { computeCapitalAllocation } from "./CapitalAllocationEngine";
import { computeHedging } from "./HedgingEngine";
import { computePortfolioDecision } from "./PortfolioDecisionEngine";
import { computePortfolioSummary } from "./PortfolioSummaryEngine";

export const globalPortfolioTimeline = getSharedSingleton("globalPortfolioTimeline", () => new PortfolioTimeline());
export const globalPortfolioHistory = getSharedSingleton("globalPortfolioHistory", () => new PortfolioHistory());

export interface PortfolioIntelligenceOptions {
  assetIds?: string[];
  refresh?: boolean;
  historyLimit?: number;
}

export class PortfolioIntelligenceEngine {
  private timeline = globalPortfolioTimeline;
  private history = globalPortfolioHistory;

  async build(options: PortfolioIntelligenceOptions = {}): Promise<PortfolioIntelligenceResult> {
    const startedAt = Date.now();
    ensureAssetRegistryLoaded();
    initializeProviderRegistry();

    const enabled = getEnabledAssets();
    const assetIds = options.assetIds?.length ? options.assetIds : enabled.map((a) => a.id);
    const historyLimit = options.historyLimit ?? 40;

    const assets: PortfolioAssetConfig[] = assetIds.map((id) => {
      const cfg = getConfig(id);
      return {
        assetId: cfg.id,
        name: cfg.name,
        displayName: cfg.displayName,
        assetClass: cfg.assetClass,
        enabled: cfg.enabled,
        baseCurrency: cfg.baseCurrency,
        quoteCurrency: cfg.quoteCurrency,
      };
    });

    const repo = ResearchRepository.getInstance();
    const histories = new Map<string, ResearchSnapshot[]>();
    const missingAssets: string[] = [];

    for (const id of assetIds) {
      const history = repo.getHistory(id, historyLimit);
      if (history.length > 0) {
        histories.set(id, history);
      } else if (options.refresh) {
        await this.refreshAsset(id, histories);
      } else {
        missingAssets.push(id);
      }
    }

    /* 1. Positions */
    const positionEngine = new PortfolioPositionEngine();
    const positions: PortfolioPosition[] = [];
    const positionReasons: string[] = [];
    for (const asset of assets) {
      const history = histories.get(asset.assetId) ?? [];
      const latest = history[0] ?? null;
      const { position, reason } = positionEngine.evaluate({ asset, snapshot: latest, history });
      if (position) positions.push(position);
      positionReasons.push(reason);
    }
    this.timeline.add("PortfolioPositionEngine", `Evaluated ${positions.length} position(s)`, positions.length > 0 ? Math.round(positions.reduce((s, p) => s + p.confidence, 0) / positions.length) : 0, 1);

    /* 2. Correlation */
    const correlation = computeCrossAssetCorrelation(
      assetIds.map((id) => ({ assetId: id, snapshots: histories.get(id) ?? [] }))
    );
    this.timeline.add("CrossAssetCorrelationEngine", `${correlation.cells.length} pair(s)`, 70, 1);

    /* 3. Exposure */
    const exposure = computeExposure(positions);
    this.timeline.add("ExposureEngine", `Net ${exposure.netExposure}, gross ${exposure.grossExposure}`, positions.length > 0 ? Math.round(positions.reduce((s, p) => s + p.confidence, 0) / positions.length) : 0, 1);

    /* 4. Diversification */
    const diversification = computeDiversification({ correlation, exposure });
    this.timeline.add("DiversificationEngine", `Score ${diversification.score}/100`, Math.round(diversification.score), 1);

    /* 5. Risk */
    const risk = computePortfolioRisk({ positions, correlation, exposure });
    this.timeline.add("PortfolioRiskEngine", `${risk.overallRisk} (${risk.overallScore}/100)`, Math.max(0, 100 - risk.overallScore), 1);

    /* 6. Allocation */
    const allocation = computeCapitalAllocation({ positions, exposure });
    this.timeline.add("CapitalAllocationEngine", `${allocation.suggestions.length} suggestion(s)`, 70, 1);

    /* 7. Institutional flows */
    const institutionalFlows = this.readInstitutionalFlows(assets);
    this.timeline.add("InstitutionalFlowReader", `${institutionalFlows.length} flow set(s)`, 60, 1);

    /* 8. Hedging */
    const hedging = computeHedging({ positions, correlation, risk, institutionalFlows });
    this.timeline.add("HedgingEngine", `${hedging.suggestions.length} hedge(s)`, 60, 1);

    /* 9. Decision */
    const decision = computePortfolioDecision({ positions, risk });
    this.timeline.add("PortfolioDecisionEngine", `${decision.action} (${decision.bias})`, decision.confidence, 1);

    /* 10. Conflicts & opportunities & warnings */
    const conflicts = this.detectConflicts(positions, correlation);
    const opportunities = this.detectOpportunities(positions, allocation, hedging);
    const warnings = this.detectWarnings(positions, risk, hedging);

    /* 11. Summary */
    const summary = computePortfolioSummary({ decision, exposure, diversification, risk, allocation, hedging, correlation });
    this.timeline.add("PortfolioSummaryEngine", summary.headline, decision.confidence, 1);

    /* 12. History */
    const historyEntry: PortfolioHistoryEntry = {
      id: `pf-${Date.now()}`,
      timestamp: new Date().toISOString(),
      bias: decision.bias,
      score: decision.score,
      confidence: decision.confidence,
      risk: risk.overallRisk,
      positionCount: positions.length,
      summary: summary.headline,
    };
    this.history.add(historyEntry);

    const portfolioBias: PortfolioBias = {
      overallBias: decision.bias,
      overallScore: decision.score,
      confidence: decision.confidence,
      alignmentScore: this.computeAlignmentScore(positions),
      conflictScore: risk.riskClusters.length > 0 ? Math.min(100, risk.riskClusters.length * 25) : 0,
    };

    const elapsed = Date.now() - startedAt;
    this.timeline.add("PortfolioIntelligenceEngine", `Completed in ${elapsed}ms`, decision.confidence, elapsed);

    return {
      generatedAt: new Date().toISOString(),
      assets,
      positions,
      correlation,
      exposure,
      diversification,
      risk,
      allocation,
      hedging,
      conflicts,
      opportunities,
      warnings,
      institutionalFlows,
      decision,
      summary,
      timeline: this.timeline.getRecent(30),
      history: this.history.getRecent(20),
      dataQuality: {
        assetsTracked: assets.length,
        assetsWithData: assetIds.length - missingAssets.length,
        missingAssets,
        snapshotCount: [...histories.values()].reduce((s, h) => s + h.length, 0),
        providerCacheHits: institutionalFlows.reduce((s, f) => s + f.sources.length, 0),
        usedFallback: missingAssets.length > 0,
      },
    };
  }

  private async refreshAsset(id: string, histories: Map<string, ResearchSnapshot[]>): Promise<void> {
    try {
      const dataset = await collectAssetData(id as any);
      if (!dataset) return;
      const pipeline = await runPipeline(dataset, { enableDecisionIntelligence: true });
      if (!pipeline.decisionIntelligence) return;
      const snapshot: ResearchSnapshot = {
        id: `pf-snap-${Date.now()}-${id}`,
        asset: id,
        timestamp: pipeline.decisionIntelligence.timestamp,
        origin: "pipeline",
        executionDurationMs: pipeline.executionTimeMs,
        providerVersions: {},
        providerHealth: {},
        result: pipeline.decisionIntelligence,
      };
      histories.set(id, [snapshot]);
      ResearchRepository.getInstance().saveSnapshot(snapshot);
      this.timeline.add("PipelineRefresh", `Refreshed ${id}`, pipeline.decisionIntelligence.confidence.score, pipeline.executionTimeMs);
    } catch {
      /* keep asset missing if pipeline refresh fails */
    }
  }

  private readInstitutionalFlows(assets: PortfolioAssetConfig[]): InstitutionalFlowItem[] {
    const cache = ProviderCache.getInstance();
    return assets.map((asset) => {
      const sources: string[] = [];
      let cotNetCommercial: number | null = null;
      let etfFlowDirection: string | null = null;
      let openInterestTrend: string | null = null;
      let breadthScore: number | null = null;
      let volatilityRating: string | null = null;
      let vix: number | null = null;
      let gvz: number | null = null;
      let macroSummary = "";
      let flowScore = 0;

      const cot = cache.getLastKnownGood<{ data: ProviderResult<COTReportData[]> }>("exec:cot-institutional");
      if (cot.hit && cot.data?.data?.data) {
        sources.push("COT");
        const records = cot.data.data.data;
        const record = records.find((r) => r.assetId === asset.assetId) ?? records[0];
        if (record) {
          cotNetCommercial = record.commercials.netLong - record.commercials.netShort;
          flowScore += cotNetCommercial > 0 ? 1 : cotNetCommercial < 0 ? -1 : 0;
        }
      }

      const etf = cache.getLastKnownGood<{ data: ProviderResult<ETFData> }>("exec:etf-institutional");
      if (etf.hit && etf.data?.data?.data) {
        sources.push("ETF");
        const { etfs } = etf.data.data.data;
        const inflows = etfs.filter((e) => e.flowDirection === "Inflow").length;
        const outflows = etfs.filter((e) => e.flowDirection === "Outflow").length;
        etfFlowDirection = inflows > outflows ? "Inflow" : outflows > inflows ? "Outflow" : "Flat";
        flowScore += etfFlowDirection === "Inflow" ? 1 : etfFlowDirection === "Outflow" ? -1 : 0;
      }

      const oi = cache.getLastKnownGood<{ data: ProviderResult<OpenInterestRecord[]> }>("exec:open-interest-institutional");
      if (oi.hit && oi.data?.data?.data) {
        sources.push("OpenInterest");
        const records = oi.data.data.data;
        const record = records.find((r) => r.assetId === asset.assetId) ?? records[0];
        if (record) {
          openInterestTrend = record.trend;
          flowScore += record.trend === "Rising" ? 1 : record.trend === "Falling" ? -1 : 0;
        }
      }

      const breadth = cache.getLastKnownGood<{ data: ProviderResult<BreadthData[]> }>("exec:breadth-institutional");
      if (breadth.hit && breadth.data?.data?.data) {
        sources.push("Breadth");
        const record = breadth.data.data.data[0];
        if (record) {
          breadthScore = record.breadthScore;
          flowScore += record.breadthScore > 50 ? 1 : record.breadthScore < 50 ? -1 : 0;
        }
      }

      const volatility = cache.getLastKnownGood<{ data: ProviderResult<VolatilityData> }>("exec:volatility-institutional");
      if (volatility.hit && volatility.data?.data?.data) {
        sources.push("Volatility");
        const v = volatility.data.data.data;
        volatilityRating = v.riskRating;
        vix = v.vix;
        gvz = v.gvz;
        flowScore += (v.riskRating === "Low" || v.riskRating === "Moderate") ? 1 : -1;
      }

      const macro = cache.getLastKnownGood<{ data: ProviderResult<MacroData> }>("exec:macro-institutional");
      if (macro.hit && macro.data?.data?.data) {
        sources.push("Macro");
        const indicators = macro.data.data.data.indicators ?? [];
        macroSummary = indicators.length > 0
          ? indicators.map((i) => `${i.name}: ${i.value}`).join(" · ")
          : "No indicators";
      }

      return {
        assetId: asset.assetId,
        assetName: asset.displayName,
        sources,
        cotNetCommercial,
        etfFlowDirection,
        openInterestTrend,
        breadthScore,
        volatilityRating,
        vix,
        gvz,
        macroSummary,
        flowBias: flowScore > 0 ? "Bullish" : flowScore < 0 ? "Bearish" : "Neutral",
        flowScore,
        timestamp: new Date().toISOString(),
      };
    });
  }

  private detectConflicts(positions: PortfolioPosition[], correlation: CorrelationMatrix): PortfolioConflict[] {
    const conflicts: PortfolioConflict[] = [];
    for (const cell of correlation.cells) {
      if (cell.status !== "computed" || cell.coefficient === null) continue;
      if (cell.coefficient >= 0.7) {
        conflicts.push({
          assetA: cell.assetA,
          assetB: cell.assetB,
          severity: "Moderate",
          description: `High positive correlation (${cell.coefficient.toFixed(2)}) concentrates risk; moves together reduce diversification.`,
        });
      }
    }
    const longIds = positions.filter((p) => p.direction === "long").map((p) => p.assetId);
    const shortIds = positions.filter((p) => p.direction === "short").map((p) => p.assetId);
    for (const l of longIds) {
      for (const s of shortIds) {
        conflicts.push({
          assetA: l,
          assetB: s,
          severity: "Moderate",
          description: `Opposing research signals (long ${l} vs short ${s}) create cross-asset tension.`,
        });
      }
    }
    return conflicts;
  }

  private detectOpportunities(positions: PortfolioPosition[], allocation: CapitalAllocationResult, hedging: HedgingResult): PortfolioOpportunity[] {
    const opportunities: PortfolioOpportunity[] = [];
    for (const pos of positions) {
      if (pos.state === "Active" && pos.score >= 60) {
        opportunities.push({
          assetId: pos.assetId,
          assetName: pos.assetName,
          type: "Scale In",
          conviction: Math.round(pos.confidence),
          description: `${pos.assetName} is strongly supported (${pos.action}) with ${pos.confidence}% confidence — scale-in candidate.`,
        });
      }
      if (hedging.suggestions.length === 0 && pos.score <= -60) {
        opportunities.push({
          assetId: pos.assetId,
          assetName: pos.assetName,
          type: "Hedge",
          conviction: Math.round(Math.abs(pos.score)),
          description: `Negative signal on ${pos.assetName} with no hedge currently flagged — consider protective action.`,
        });
      }
    }
    for (const s of allocation.suggestions) {
      if (s.action === "Rotate" || s.action === "Scale Out") {
        opportunities.push({
          assetId: s.assetId,
          assetName: s.assetName,
          type: s.action,
          conviction: s.conviction,
          description: s.reason,
        });
      }
    }
    return opportunities;
  }

  private detectWarnings(positions: PortfolioPosition[], risk: PortfolioRiskResult, hedging: HedgingResult): PortfolioWarning[] {
    const warnings: PortfolioWarning[] = [];
    for (const pos of positions) {
      if (pos.state === "Invalidated") {
        warnings.push({
          severity: "High",
          category: "Position",
          message: `${pos.assetName} signal invalidated: ${pos.invalidationReasons.join("; ")}`,
          assets: [pos.assetId],
        });
      }
      if (pos.riskLevel === "High" || pos.riskLevel === "Extreme") {
        warnings.push({
          severity: pos.riskLevel === "Extreme" ? "High" : "Medium",
          category: "Risk",
          message: `${pos.assetName} carries ${pos.riskLevel} risk (score ${pos.riskScore}).`,
          assets: [pos.assetId],
        });
      }
    }
    if (risk.correlationImpact === "concentrating") {
      warnings.push({
        severity: "Medium",
        category: "Correlation",
        message: "Portfolio signals are positively correlated, reducing diversification benefit.",
        assets: [],
      });
    }
    if (hedging.concentrationExposure >= 80 && hedging.suggestions.length === 0) {
      warnings.push({
        severity: "Medium",
        category: "Concentration",
        message: "Long concentration is high without any hedging signal flagged.",
        assets: [],
      });
    }
    return warnings;
  }

  private computeAlignmentScore(positions: PortfolioPosition[]): number {
    const nonFlat = positions.filter((p) => p.direction !== "flat");
    if (nonFlat.length === 0) return 50;
    const longs = nonFlat.filter((p) => p.direction === "long").length;
    const shortRatio = Math.min(longs, nonFlat.length - longs) / nonFlat.length;
    return Math.round(100 - shortRatio * 100);
  }
}

export async function buildPortfolioIntelligence(options?: PortfolioIntelligenceOptions): Promise<PortfolioIntelligenceResult> {
  return new PortfolioIntelligenceEngine().build(options);
}
