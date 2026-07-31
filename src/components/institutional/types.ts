export interface InstitutionalProvider {
  id: string;
  name: string;
  source: string;
  assetClass: string;
  type: string;
  priority: number;
  enabled: boolean;
  status: "healthy" | "degraded" | "down" | "unknown";
  latency: number;
  health: number;
  failures: number;
  successRate: number;
  totalRequests: number;
  cacheHitRate: number;
  cacheAge: number | null;
  ttlMs: number;
  refreshIntervalMs: number;
  timeoutMs: number;
  lastUpdate: number | null;
  lastErrorMessage: string | null;
  refreshStatus: string;
  refreshDuration: number | null;
}

export interface InstitutionalScheduler {
  status: "running" | "paused" | "stopped";
  uptimeMs: number;
  startedAt: number | null;
  queueSize: number;
  activeJobs: number;
  pendingJobs: number;
  averageLatency: number;
  lastLatency: number;
  successfulRefreshCount: number;
  failedRefreshCount: number;
  refreshFrequency: number;
  totalProviderRefreshes: number;
  totalAssetRefreshes: number;
  lastRefreshAt: number | null;
  lastError: string | null;
}

export interface InstitutionalAsset {
  assetId: string;
  status: string;
  lastRefresh: number | null;
  lastSuccess: number | null;
  lastFailure: number | null;
  lastError: string | null;
  refreshDuration: number | null;
  consecutiveFailures: number;
}

export interface InstitutionalEvidence {
  id: string;
  category: string;
  driverId: string;
  driverTitle: string;
  bias: string;
  confidence: number;
  source: string;
  timestamp: string;
  value: string;
  interpretation: string;
  weight: number;
}

export interface InstitutionalConflict {
  score: number;
  severity: string;
  conflictingPairs: { driverA: string; driverB: string; biasA: string; biasB: string; severity: number; explanation: string }[];
  consensusDrivers: string[];
  discordDrivers: string[];
  explanation: string;
}

export interface InstitutionalScenario {
  bull: { type: string; title: string; probability: number; supportingEvidence: string[]; invalidationConditions: string[]; catalysts: string[]; risks: string[] };
  base: { type: string; title: string; probability: number; supportingEvidence: string[]; invalidationConditions: string[]; catalysts: string[]; risks: string[] };
  bear: { type: string; title: string; probability: number; supportingEvidence: string[]; invalidationConditions: string[]; catalysts: string[]; risks: string[] };
  mostLikely: "bull" | "base" | "bear";
}

export interface InstitutionalRisk {
  marketRisk: string;
  liquidityRisk: string;
  volatilityRisk: string;
  macroRisk: string;
  institutionalRisk: string;
  newsRisk: string;
  eventRisk: string;
  overallRisk: string;
  overallScore: number;
  breakdown: { category: string; score: number; level: string; driver: string }[];
}

export interface InstitutionalIntelligence {
  asset: string;
  timestamp: string;
  executionDurationMs: number | null;
  origin: string;
  decision: {
    action: string;
    confidence: number;
    summary: string;
    reasonsFor: string[];
    reasonsAgainst: string[];
    keyDrivers: { name: string; impact: string; contribution: number }[];
    invalidationConditions: string[];
    catalysts: string[];
    worstCase: string;
    bestCase: string;
  };
  confidence: {
    score: number;
    level: string;
    components: { freshness: number; providerHealth: number; evidenceCount: number; agreement: number; completeness: number };
  };
  conflicts: InstitutionalConflict;
  scenario: InstitutionalScenario;
  risk: InstitutionalRisk;
  evidence: InstitutionalEvidence[];
  aiSummary: string | null;
  providerHealth: Record<string, { successRate: number; averageLatency: number; lastFailure?: string }>;
}

export interface InstitutionalTimelineEntry {
  timestamp: string;
  engine: string;
  result: string;
  confidence: number;
  durationMs: number;
}

export interface InstitutionalHistoryRow {
  id: string;
  asset: string;
  timestamp: string;
  action: string;
  confidence: number;
  risk: string;
  conflict: number;
  scenario: string;
}

export interface InstitutionalAnalytics {
  totalSnapshots: number;
  totalAssets: number;
  averageExecutionDuration: number;
  snapshotsByAsset: Record<string, number>;
  snapshotsByOrigin: Record<string, number>;
  averageConfidence: number;
  averageRisk: number;
  averageConflict: number;
  decisionDistribution: Record<string, number>;
  confidenceDistribution: { range: string; count: number }[];
  scenarioDistribution: Record<string, number>;
  riskDistribution: Record<string, number>;
  providerAnalytics: { providerId: string; totalRefreshes: number; uptime: number; failures: number; successRate: number; averageLatency: number; lastLatency: number; latencyTrend: string; averageConfidenceContribution: number }[];
  evidenceBreakdown: { category: string; total: number; biases: { bias: string; count: number; percentage: string }[] }[];
  overallBiasDistribution: { bias: string; count: number; percentage: string }[];
}

export interface InstitutionalDashboardData {
  fetchedAt: string;
  providers: InstitutionalProvider[];
  scheduler: InstitutionalScheduler;
  assets: InstitutionalAsset[];
  intelligence: InstitutionalIntelligence | null;
  timeline: InstitutionalTimelineEntry[];
  decisionHistory: InstitutionalHistoryRow[];
  analytics: InstitutionalAnalytics;
  logStats: { totalLogs: number; successRate: number; averageLatency: number; cacheHitRate: number; topErrors: { reason: string; count: number }[] };
}
