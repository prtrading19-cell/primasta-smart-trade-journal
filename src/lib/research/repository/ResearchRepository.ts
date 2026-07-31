import type { ResearchSnapshot, SnapshotFilter, RepositoryStatistics, SnapshotOrigin } from "./types";

export class ResearchRepository {
  private static instance: ResearchRepository;

  private snapshots: ResearchSnapshot[] = [];
  private maxSnapshots = 10000;

  static getInstance(): ResearchRepository {
    if (!ResearchRepository.instance) {
      ResearchRepository.instance = new ResearchRepository();
    }
    return ResearchRepository.instance;
  }

  saveSnapshot(snapshot: ResearchSnapshot): void {
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.splice(0, this.snapshots.length - this.maxSnapshots);
    }
  }

  getSnapshot(id: string): ResearchSnapshot | undefined {
    return this.snapshots.find((s) => s.id === id);
  }

  getLatest(asset?: string): ResearchSnapshot | undefined {
    if (asset) {
      const assetSnapshots = this.snapshots.filter((s) => s.asset === asset);
      return assetSnapshots[assetSnapshots.length - 1];
    }
    return this.snapshots[this.snapshots.length - 1];
  }

  getHistory(asset?: string, limit = 100): ResearchSnapshot[] {
    const filtered = asset
      ? this.snapshots.filter((s) => s.asset === asset)
      : [...this.snapshots];
    return filtered.slice(-limit).reverse();
  }

  search(filter: SnapshotFilter): ResearchSnapshot[] {
    let results = [...this.snapshots];

    if (filter.asset) results = results.filter((s) => s.asset === filter.asset);
    if (filter.origin) results = results.filter((s) => s.origin === filter.origin);
    if (filter.since) results = results.filter((s) => s.timestamp >= filter.since!);
    if (filter.until) results = results.filter((s) => s.timestamp <= filter.until!);
    if (filter.decisionAction) {
      results = results.filter((s) => s.result.decision.action === filter.decisionAction);
    }
    if (filter.riskLevel) {
      results = results.filter((s) => s.result.risk.overallRisk === filter.riskLevel);
    }
    if (filter.conflictSeverity) {
      results = results.filter((s) => s.result.conflicts.severity === filter.conflictSeverity);
    }
    if (filter.minConfidence != null) {
      results = results.filter((s) => s.result.confidence.score >= filter.minConfidence!);
    }
    if (filter.maxConfidence != null) {
      results = results.filter((s) => s.result.confidence.score <= filter.maxConfidence!);
    }

    const limit = filter.limit ?? 100;
    const offset = filter.offset ?? 0;
    return results.slice(offset, offset + limit).reverse();
  }

  getStatistics(): RepositoryStatistics {
    if (this.snapshots.length === 0) {
      return {
        totalSnapshots: 0,
        totalAssets: 0,
        oldestSnapshot: null,
        newestSnapshot: null,
        snapshotsByAsset: {},
        snapshotsByOrigin: {},
        averageExecutionDuration: 0,
      };
    }

    const snapshotsByAsset: Record<string, number> = {};
    const snapshotsByOrigin: Record<string, number> = {};
    let totalDuration = 0;

    for (const s of this.snapshots) {
      snapshotsByAsset[s.asset] = (snapshotsByAsset[s.asset] ?? 0) + 1;
      snapshotsByOrigin[s.origin] = (snapshotsByOrigin[s.origin] ?? 0) + 1;
      totalDuration += s.executionDurationMs;
    }

    return {
      totalSnapshots: this.snapshots.length,
      totalAssets: Object.keys(snapshotsByAsset).length,
      oldestSnapshot: this.snapshots[0].timestamp,
      newestSnapshot: this.snapshots[this.snapshots.length - 1].timestamp,
      snapshotsByAsset,
      snapshotsByOrigin,
      averageExecutionDuration: Math.round(totalDuration / this.snapshots.length),
    };
  }

  getAssetOverviews(): { assetId: string; totalSnapshots: number; firstSnapshot: string; lastSnapshot: string; averageConfidence: number; decisionDistribution: Record<string, number>; averageRisk: number }[] {
    const assetMap = new Map<string, ResearchSnapshot[]>();

    for (const s of this.snapshots) {
      const list = assetMap.get(s.asset) ?? [];
      list.push(s);
      assetMap.set(s.asset, list);
    }

    const overviews: { assetId: string; totalSnapshots: number; firstSnapshot: string; lastSnapshot: string; averageConfidence: number; decisionDistribution: Record<string, number>; averageRisk: number }[] = [];

    for (const [assetId, snapshots] of assetMap) {
      let totalConf = 0;
      let totalRiskScore = 0;
      const decisionDist: Record<string, number> = {};

      for (const s of snapshots) {
        totalConf += s.result.confidence.score;
        totalRiskScore += s.result.risk.overallScore;
        const action = s.result.decision.action;
        decisionDist[action] = (decisionDist[action] ?? 0) + 1;
      }

      overviews.push({
        assetId,
        totalSnapshots: snapshots.length,
        firstSnapshot: snapshots[0].timestamp,
        lastSnapshot: snapshots[snapshots.length - 1].timestamp,
        averageConfidence: Math.round(totalConf / snapshots.length),
        decisionDistribution: decisionDist,
        averageRisk: Math.round(totalRiskScore / snapshots.length),
      });
    }

    return overviews.sort((a, b) => b.totalSnapshots - a.totalSnapshots);
  }

  getSnapshotsInRange(since: string, until: string, asset?: string): ResearchSnapshot[] {
    return this.search({ asset, since, until });
  }

  clear(): void {
    this.snapshots = [];
  }

  get size(): number {
    return this.snapshots.length;
  }
}
