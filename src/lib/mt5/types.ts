export type Mt5ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnecting";

export type Mt5HealthStatus = "healthy" | "degraded" | "down" | "unknown";

export type Mt5PositionType = "buy" | "sell";

export type Mt5OrderType =
  | "buy"
  | "sell"
  | "buy-limit"
  | "sell-limit"
  | "buy-stop"
  | "sell-stop";

export type Mt5OrderState = "pending" | "filled" | "cancelled" | "expired" | "unknown";

export type Mt5DealType = "buy" | "sell" | "balance" | "credit";

export type Mt5DealDirection = "in" | "out";

export type Mt5ExecutionOutcome =
  | "submitted"
  | "filled"
  | "rejected"
  | "failed"
  | "pending_approval"
  | "unavailable";

export type Mt5ProposalStatus = "pending" | "approved" | "rejected" | "cancelled" | "expired";

export type Mt5ProposalSource = "research" | "portfolio" | "manual";

export type Mt5SyncStatus = "success" | "failed" | "unavailable" | "never";

export interface Mt5AccountInfo {
  login: number | null;
  name: string;
  server: string;
  currency: string;
  leverage: number;
  balance: number;
  equity: number;
  margin: number;
  marginFree: number;
  marginLevel: number | null;
  profit: number;
  credit: number;
  brokerName: string;
  terminalVersion: string;
  terminalBuild: number;
  terminalPath: string;
  updatedAt: string;
}

export interface Mt5Position {
  ticket: number;
  symbol: string;
  type: Mt5PositionType;
  magic: number;
  volume: number;
  priceOpen: number;
  priceCurrent: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  commission: number;
  comment: string;
  openTime: string;
  openTimeRaw: number;
}

export interface Mt5Order {
  ticket: number;
  symbol: string;
  type: Mt5OrderType;
  state: Mt5OrderState;
  magic: number;
  volume: number;
  priceOpen: number;
  priceCurrent: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  comment: string;
  openTime: string;
  closeTime: string | null;
  reason: string | null;
}

export interface Mt5Deal {
  ticket: number;
  orderTicket: number;
  symbol: string;
  type: Mt5DealType;
  direction: Mt5DealDirection;
  volume: number;
  price: number;
  profit: number;
  commission: number;
  swap: number;
  fee: number;
  comment: string;
  time: string;
  timeRaw: number;
}

export interface Mt5Heartbeat {
  sequence: number;
  at: string;
  latencyMs: number | null;
  ok: boolean;
}

export interface Mt5LatencyStats {
  lastMs: number | null;
  averageMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  samples: number;
}

export interface Mt5ConnectionState {
  status: Mt5ConnectionStatus;
  connected: boolean;
  connectedAt: string | null;
  disconnectedAt: string | null;
  reconnectAttempts: number;
  server: string | null;
  login: number | null;
  brokerName: string | null;
  terminalVersion: string | null;
  terminalBuild: number | null;
  terminalPath: string | null;
  lastHeartbeatAt: string | null;
  lastSyncAt: string | null;
  error: string | null;
}

export interface Mt5HealthRecord {
  brokerId: string;
  status: Mt5HealthStatus;
  heartbeat: Mt5Heartbeat | null;
  latency: Mt5LatencyStats;
  lastCommunicationAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  disconnections: number;
  reconnections: number;
  timeouts: number;
  brokerErrors: number;
  totalErrors: number;
  lastErrorMessage: string | null;
}

export interface Mt5AccountSnapshot {
  at: string;
  account: Mt5AccountInfo | null;
  source: Exclude<Mt5SyncStatus, "never">;
  error: string | null;
}

export interface Mt5AccountSynchronizerState {
  latest: Mt5AccountInfo | null;
  history: Mt5AccountInfo[];
  lastSyncAt: string | null;
  lastSyncStatus: Mt5SyncStatus;
  error: string | null;
  floatingPnl: number | null;
  closedPnl: number | null;
  syncCount: number;
}

export interface Mt5PositionSynchronizerState {
  positions: Mt5Position[];
  pendingOrders: Mt5Order[];
  closedOrders: Mt5Order[];
  deals: Mt5Deal[];
  lastSyncAt: string | null;
  lastSyncStatus: Mt5SyncStatus;
  error: string | null;
  syncCount: number;
  openCount: number;
  pendingCount: number;
  magicNumbers: number[];
}

export interface Mt5PlaceRequest {
  requestId: string;
  sourceSignalId: string | null;
  symbol: string;
  type: Mt5OrderType;
  volume: number;
  price: number | null;
  sl: number | null;
  tp: number | null;
  magic: number;
  deviation: number;
  comment: string;
  riskPercent: number | null;
  source: Mt5ProposalSource;
}

export interface Mt5ModifyRequest {
  ticket: number;
  sl: number | null;
  tp: number | null;
  comment?: string;
}

export interface Mt5CloseRequest {
  ticket: number;
  volume?: number;
}

export interface Mt5RawResult {
  ticket: number | null;
  price: number | null;
  message: string;
  error: string | null;
}

export interface Mt5GatewayResponse<T> {
  ok: boolean;
  available: boolean;
  data: T | null;
  error: string | null;
  at: string;
}

export interface Mt5SafetyConfig {
  maxRiskPerTradePercent: number;
  maxLotsPerOrder: number;
  maxDailyLossPercent: number;
  maxDailyTrades: number;
  maxDrawdownPercent: number;
  minFreeMarginRequired: number;
  tradingDays: number[];
  tradingOpenHour: number;
  tradingCloseHour: number;
  emergencyKillSwitch: boolean;
}

export interface Mt5SafetyCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: "blocking" | "warning";
  message: string;
}

export interface Mt5SafetyResult {
  passed: boolean;
  checks: Mt5SafetyCheck[];
  blockedReasons: string[];
  warnings: string[];
  evaluatedAt: string;
}

export interface Mt5ExecutionConfirmation {
  id: string;
  requestId: string;
  proposalId: string;
  ticket: number | null;
  fillPrice: number | null;
  executedAt: string | null;
  brokerMessage: string;
  status: Mt5ExecutionOutcome;
  slippage: number | null;
  rejectionReason: string | null;
  symbol: string;
  volume: number;
  orderType: Mt5OrderType;
  requestedPrice: number | null;
  sl: number | null;
  tp: number | null;
}

export interface Mt5TradeProposal {
  id: string;
  requestId: string;
  signalId: string | null;
  request: Mt5PlaceRequest;
  source: Mt5ProposalSource;
  status: Mt5ProposalStatus;
  safety: Mt5SafetyResult;
  confirmations: Mt5ExecutionConfirmation[];
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
  approvalNote: string | null;
}

export interface Mt5BrokerStatus {
  brokerId: string;
  brokerName: string;
  status: Mt5ConnectionStatus;
  connected: boolean;
  server: string | null;
  login: number | null;
  accountNumber: string | null;
  terminalVersion: string | null;
  terminalBuild: number | null;
  latency: Mt5LatencyStats;
  lastHeartbeatAt: string | null;
  lastSyncAt: string | null;
  health: Mt5HealthStatus;
  gateway: {
    transportId: string;
    label: string;
    available: boolean;
  };
  safety: {
    killSwitch: boolean;
    lastResult: Mt5SafetyResult | null;
  };
  enabled: boolean;
  hasCredentials: boolean;
}

export interface Mt5RedactedConfig {
  enabled: boolean;
  loginMasked: string;
  hasPassword: boolean;
  hasInvestorPassword: boolean;
  server: string | null;
  brokerName: string;
  terminalPath: string | null;
  gatewayTransport: string;
  gatewayUrl: string | null;
  magic: number;
  defaultDeviation: number;
  safety: Mt5SafetyConfig;
}

export type Mt5LogCategory =
  | "connection"
  | "disconnection"
  | "reconnect"
  | "error"
  | "order"
  | "fill"
  | "position-sync"
  | "account-sync"
  | "latency"
  | "health"
  | "approval"
  | "safety"
  | "gateway";

export interface Mt5LogEntry {
  id: string;
  at: string;
  category: Mt5LogCategory;
  message: string;
  detail: string | null;
  meta: Record<string, unknown> | null;
}
