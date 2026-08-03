import type { PortfolioIntelligenceResult } from "@/lib/research/portfolio";
import type {
  BrokerAccount,
  BrokerHealth,
  BrokerPosition,
  ExecutionHistoryEntry,
  ExecutionRecord,
  ExecutionTimelineEntry,
  TradeExecutionMetrics,
  TradeSignal,
} from "@/lib/trading";

export interface BrokerSummary {
  id: string;
  name: string;
  mode: "paper" | "simulation" | "live";
  connected: boolean;
  connectedAt: string | null;
}

export interface TradingOverview {
  generatedAt: string;
  portfolio: PortfolioIntelligenceResult | null;
  signals: TradeSignal[];
  metrics: TradeExecutionMetrics;
  history: ExecutionHistoryEntry[];
  timeline: ExecutionTimelineEntry[];
  brokers: BrokerSummary[];
  brokerHealth: Record<string, BrokerHealth>;
  positions: BrokerPosition[];
  account: BrokerAccount | null;
  executions: ExecutionRecord[];
}

export interface ExecuteResponse {
  ok: boolean;
  error?: string;
  signalId?: string;
  record?: ExecutionRecord | null;
  rejectedReasons?: string[];
}
