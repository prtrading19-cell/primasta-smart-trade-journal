import type { DecisionIntelligenceResult } from "../decision/types";

export type SnapshotOrigin = "scheduler" | "manual" | "pipeline" | "api";

export interface ResearchSnapshot {
  id: string;
  asset: string;
  timestamp: string;
  origin: SnapshotOrigin;
  executionDurationMs: number;
  providerVersions: Record<string, string>;
  providerHealth: Record<string, { successRate: number; averageLatency: number; lastFailure?: string }>;
  result: DecisionIntelligenceResult;
}

export interface SnapshotFilter {
  asset?: string;
  origin?: SnapshotOrigin;
  since?: string;
  until?: string;
  minConfidence?: number;
  maxConfidence?: number;
  decisionAction?: string;
  riskLevel?: string;
  conflictSeverity?: string;
  limit?: number;
  offset?: number;
}

export interface RepositoryStatistics {
  totalSnapshots: number;
  totalAssets: number;
  oldestSnapshot: string | null;
  newestSnapshot: string | null;
  snapshotsByAsset: Record<string, number>;
  snapshotsByOrigin: Record<string, number>;
  averageExecutionDuration: number;
}

export interface AssetOverview {
  assetId: string;
  totalSnapshots: number;
  firstSnapshot: string;
  lastSnapshot: string;
  averageConfidence: number;
  decisionDistribution: Record<string, number>;
  averageRisk: number;
}
