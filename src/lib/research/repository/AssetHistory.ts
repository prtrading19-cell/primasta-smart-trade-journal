import { ResearchRepository } from "./ResearchRepository";
import { computeHistoricalAnalytics } from "./HistoricalAnalytics";
import { computeDecisionAnalytics } from "./DecisionAnalytics";
import type { AssetOverview } from "./types";

export class AssetHistory {
  private repo = ResearchRepository.getInstance();

  getHistory(assetId: string, limit = 100) {
    return this.repo.getHistory(assetId, limit);
  }

  getLatest(assetId: string) {
    return this.repo.getLatest(assetId);
  }

  getStatistics(assetId: string) {
    const snapshots = this.repo.search({ asset: assetId });
    if (snapshots.length === 0) {
      return {
        assetId,
        totalSnapshots: 0,
        firstSnapshot: null,
        lastSnapshot: null,
        averageConfidence: 0,
        decisionDistribution: {},
        averageRisk: 0,
      };
    }

    let totalConf = 0;
    let totalRisk = 0;
    const decisionDist: Record<string, number> = {};

    for (const s of snapshots) {
      totalConf += s.result.confidence.score;
      totalRisk += s.result.risk.overallScore;
      decisionDist[s.result.decision.action] = (decisionDist[s.result.decision.action] ?? 0) + 1;
    }

    return {
      assetId,
      totalSnapshots: snapshots.length,
      firstSnapshot: snapshots[0].timestamp,
      lastSnapshot: snapshots[snapshots.length - 1].timestamp,
      averageConfidence: Math.round(totalConf / snapshots.length),
      decisionDistribution: decisionDist,
      averageRisk: Math.round(totalRisk / snapshots.length),
    };
  }

  getTrends(assetId: string) {
    const snapshots = this.repo.search({ asset: assetId });
    return computeHistoricalAnalytics(snapshots);
  }

  getDecisionAnalytics(assetId: string) {
    const snapshots = this.repo.search({ asset: assetId });
    return computeDecisionAnalytics(snapshots);
  }

  getAssetOverviews(): AssetOverview[] {
    return this.repo.getAssetOverviews();
  }
}

export const globalAssetHistory = new AssetHistory();
