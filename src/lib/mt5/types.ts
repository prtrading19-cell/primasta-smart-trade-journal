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
  | "sell-stop"
  | "buy-stop-limit"
  | "sell-stop-limit";

export type Mt5FillPolicy = "fok" | "ioc" | "return";

export type Mt5TimePolicy = "gtc" | "day" | "specified" | "specified-day";

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
  stopLimit?: number | null;
  fillPolicy?: Mt5FillPolicy;
  timePolicy?: Mt5TimePolicy;
  expiration?: string | null;
}

export interface Mt5ModifyRequest {
  ticket: number;
  sl: number | null;
  tp: number | null;
  price?: number | null;
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
  maxOpenTrades?: number;
  maxExposureLots?: number;
  maxSpreadPoints?: number;
  correlationLimits?: Record<string, number>;
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
  spread?: number | null;
  latencyMs?: number | null;
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
  | "execution"
  | "gateway";

export interface Mt5LogEntry {
  id: string;
  at: string;
  category: Mt5LogCategory;
  message: string;
  detail: string | null;
  meta: Record<string, unknown> | null;
}

export interface Mt5Symbol {
  symbol: string;
  digits: number;
  point: number;
  spreadPoints: number;
  spread: number;
  contractSize: number;
  tickSize: number;
  tickValue: number;
  volumeMin: number;
  volumeMax: number;
  volumeStep: number;
  tradeMode: number;
  tradeAllowed: boolean;
}

export interface Mt5SymbolSpec extends Mt5Symbol {
  available: boolean;
  tickValueProfit: number;
  tickValueLoss: number;
  stopsLevelPoints: number;
  freezeLevelPoints: number;
  stopsLevel: number;
  freezeLevel: number;
  swapLong: number;
  swapShort: number;
  tradeCalcMode: number;
  tradeModeFlags: number;
  marginInitial: number;
  marginMaintenance: number;
  marginHedged: number;
  marginLong: number;
  marginShort: number;
  currencyBase: string;
  currencyProfit: string;
  currencyMargin: string;
  description: string;
  path: string;
  session: {
    tradeMode: number;
    enabled: boolean;
    longAllowed: boolean;
    shortAllowed: boolean;
  };
  updatedAt: string;
}

export interface Mt5Tick {
  symbol: string;
  available: boolean;
  bid: number;
  ask: number;
  last: number;
  spread: number;
  volume: number;
  time: string;
  timeMs: number;
  ageSeconds: number;
  marketLive: boolean;
  updatedAt: string;
}

export interface Mt5ValidationCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: "blocking" | "warning";
  message: string;
}

export interface Mt5ValidationResult {
  passed: boolean;
  checks: Mt5ValidationCheck[];
  blockedReasons: string[];
  warnings: string[];
  evaluatedAt: string;
}

export interface Mt5OrderPreview {
  symbol: string;
  orderType: Mt5OrderType;
  volume: number;
  entryPrice: number | null;
  sl: number | null;
  tp: number | null;
  bid: number;
  ask: number;
  spread: number;
  spreadCost: number;
  pipValue: number;
  positionValue: number;
  requiredMargin: number;
  commission: number | null;
  swap: number;
  dollarRisk: number;
  riskPercent: number;
  reward: number;
  rewardPercent: number;
  rrRatio: number;
  estimatedProfit: number;
  estimatedLoss: number;
  balance: number;
  equity: number;
  freeMargin: number;
  marginLevel: number | null;
  balanceAfterLoss: number;
  freeMarginAfterEntry: number;
  marginLevelAfterEntry: number | null;
  evaluatedAt: string;
}

export interface Mt5ExecutionEvent {
  id: string;
  at: string;
  stage:
    | "proposal-created"
    | "validated"
    | "approved"
    | "rejected"
    | "sent"
    | "accepted"
    | "executed"
    | "failed"
    | "cancelled"
    | "closed"
    | "modified";
  proposalId: string | null;
  ticket: number | null;
  dealId: number | null;
  user: string;
  account: string;
  symbol: string;
  orderType: string;
  volume: number;
  price: number | null;
  sl: number | null;
  tp: number | null;
  result: string;
  error: string | null;
  latencyMs: number | null;
}

export interface Mt5PositionActionResult {
  ticket: number | null;
  price: number | null;
  message: string;
  error: string | null;
  dealId?: number | null;
}

export interface Mt5BulkCloseResult {
  requested: number;
  closed: number;
  failed: number;
  results: Mt5PositionActionResult[];
  error: string | null;
}

/* ════════════════════════════════════════════════════════════════════════
 * Institutional execution groups (OCO / bracket / scale-in / scale-out /
 * basket). Linked orders are orchestrated by InstitutionalOrderEngine and
 * tracked here so a single approval decision governs the whole group.
 * ════════════════════════════════════════════════════════════════════════ */

export type Mt5ExecutionGroupMode = "bracket" | "oco" | "scale-in" | "scale-out" | "basket";

export type Mt5ExecutionGroupStatus =
  | "pending"
  | "approved"
  | "active"
  | "completed"
  | "cancelled"
  | "failed";

export type Mt5ExecutionGroupLegStatus =
  | "pending"
  | "approved"
  | "transmitted"
  | "filled"
  | "cancelled"
  | "rejected";

export interface Mt5ExecutionGroupLeg {
  proposalId: string | null;
  ticket: number | null;
  symbol: string;
  type: Mt5OrderType;
  volume: number;
  price: number | null;
  sl: number | null;
  tp: number | null;
  stopLimit: number | null;
  status: Mt5ExecutionGroupLegStatus;
  error: string | null;
}

export interface Mt5ExecutionGroup {
  id: string;
  mode: Mt5ExecutionGroupMode;
  status: Mt5ExecutionGroupStatus;
  symbol: string;
  legs: Mt5ExecutionGroupLeg[];
  proposalIds: string[];
  note: string | null;
  scaleOutLevels: number[];
  scaleOutOriginalVolume: number | null;
  scaleOutClosedVolume: number;
  scaleOutTicket: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Mt5BracketLeg {
  type: Mt5OrderType;
  volume: number;
  price: number | null;
  sl: number | null;
  tp: number | null;
}

export interface Mt5BracketRequest {
  symbol: string;
  legs: Mt5BracketLeg[];
  magic?: number;
  deviation?: number;
  comment?: string;
}

export interface Mt5OcoRequest {
  symbol: string;
  first: Mt5BracketLeg;
  second: Mt5BracketLeg;
  magic?: number;
  deviation?: number;
  comment?: string;
}

export interface Mt5ScaleInTranche {
  volume: number;
  price: number | null;
  sl?: number | null;
  tp?: number | null;
}

export interface Mt5ScaleInRequest {
  symbol: string;
  direction: Mt5PositionType;
  tranches: Mt5ScaleInTranche[];
  magic?: number;
  deviation?: number;
  comment?: string;
}

export interface Mt5ScaleOutRequest {
  ticket: number;
  levels: number[];
  note?: string | null;
}

export interface Mt5BasketLeg {
  symbol: string;
  type: Mt5OrderType;
  volume: number;
  price?: number | null;
  sl?: number | null;
  tp?: number | null;
}

export interface Mt5BasketRequest {
  legs: Mt5BasketLeg[];
  magic?: number;
  deviation?: number;
  comment?: string;
}

/* ════════════════════════════════════════════════════════════════════════
 * Execution analytics (G) + trade replay (H)
 * ════════════════════════════════════════════════════════════════════════ */

export interface Mt5ExecutionStatEntry {
  id: string;
  proposalId: string | null;
  ticket: number | null;
  symbol: string;
  orderType: Mt5OrderType;
  volume: number;
  submittedAt: string;
  fillAt: string | null;
  latencyMs: number | null;
  requestedPrice: number | null;
  fillPrice: number | null;
  slippage: number | null;
  spread: number | null;
  sl: number | null;
  tp: number | null;
  profit: number | null;
  swap: number | null;
  commission: number | null;
  holdingTimeMs: number | null;
  rrRatio: number | null;
  outcome: "win" | "loss" | "breakeven" | "open" | "rejected";
}

export interface Mt5ExecutionSymbolStat {
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number | null;
  netPnl: number;
}

export interface Mt5ExecutionAnalytics {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  winRate: number | null;
  averageRR: number | null;
  expectancy: number | null;
  averageHoldingTimeMs: number | null;
  averageProfit: number | null;
  averageLoss: number | null;
  totalProfit: number;
  totalLoss: number;
  netPnl: number;
  totalCommission: number;
  totalSwap: number;
  averageLatencyMs: number | null;
  averageSlippage: number | null;
  averageSpread: number | null;
  profitFactor: number | null;
  stats: Mt5ExecutionSymbolStat[];
  computedAt: string;
}

export interface Mt5ReplayStep {
  index: number;
  stage: Mt5ExecutionEvent["stage"];
  at: string;
  result: string;
  error: string | null;
  latencyMs: number | null;
  price: number | null;
  ticket: number | null;
  deltaMs: number | null;
}

export interface Mt5ReplaySession {
  id: string;
  proposalId: string | null;
  symbol: string;
  orderType: string;
  volume: number;
  steps: Mt5ReplayStep[];
  startedAt: string | null;
  endedAt: string | null;
  totalDurationMs: number | null;
  result: string;
}

/* ════════════════════════════════════════════════════════════════════════
 * FIX-ready execution venues (J) + multi-account routing (F)
 * ════════════════════════════════════════════════════════════════════════ */

export type Mt5VenueId =
  | "mt5-python"
  | "lmax"
  | "primexm"
  | "onezero"
  | "interactive-brokers"
  | "dxtrade";

export type Mt5VenueStatus = "active" | "configured" | "available" | "unavailable";

export interface Mt5VenueDescriptor {
  id: Mt5VenueId;
  name: string;
  protocol: "MT5" | "FIX" | "REST" | "native";
  status: Mt5VenueStatus;
  description: string;
}

export interface Mt5VenueRoutingResult {
  venueId: Mt5VenueId;
  accepted: boolean;
  orderId: string | null;
  message: string;
  error: string | null;
}

export interface Mt5AccountDescriptor {
  accountId: string;
  label: string;
  venueId: Mt5VenueId;
  isActive: boolean;
  login: number | null;
  server: string | null;
}

/* ════════════════════════════════════════════════════════════════════════
 * Order book preparation (I) — placeholder interfaces only. No fake data is
 * ever produced; a NoopOrderBookFeed returns the "not connected" state.
 * ════════════════════════════════════════════════════════════════════════ */

export interface Mt5DepthEntry {
  price: number;
  volume: number;
  side: "bid" | "ask";
}

export interface Mt5DepthOfMarket {
  symbol: string;
  available: boolean;
  connected: boolean;
  bids: Mt5DepthEntry[];
  asks: Mt5DepthEntry[];
  updatedAt: string | null;
}

export interface Mt5Level2Entry {
  price: number;
  volume: number;
  side: "bid" | "ask";
  level: number;
}

export interface Mt5LiquidityHeatmapCell {
  symbol: string;
  depthPoints: number;
  bidLiquidity: number;
  askLiquidity: number;
}

export interface Mt5OrderBookSnapshot {
  symbol: string;
  connected: boolean;
  depth: Mt5DepthOfMarket | null;
  level2: Mt5Level2Entry[];
  heatmap: Mt5LiquidityHeatmapCell[];
  error: string | null;
  updatedAt: string;
}
