export type ExecutionMode = "paper" | "simulation" | "live";
export type TradeDirection = "buy" | "sell" | "flat";
export type TradeSignalType = "BUY" | "SELL" | "WAIT" | "REDUCE" | "SCALE IN" | "SCALE OUT" | "CLOSE";
export type SignalSource = "portfolio" | "decision" | "research";
export type OrderType = "MARKET" | "LIMIT" | "STOP";
export type OrderStatus =
  | "DRAFT"
  | "VALIDATED"
  | "REJECTED"
  | "BUILT"
  | "SENT"
  | "FILLED"
  | "PARTIAL"
  | "CANCELLED"
  | "FAILED";
export type ExecutionStatus =
  | "pending"
  | "validated"
  | "rejected"
  | "built"
  | "sent"
  | "filled"
  | "cancelled"
  | "failed";
export type BrokerType =
  | "mt5"
  | "ctrader"
  | "ib"
  | "oanda"
  | "alpaca"
  | "binance"
  | "bybit"
  | "dxtrade"
  | "tradelocker"
  | "paper"
  | "simulation";

export interface TradeSignal {
  id: string;
  assetId: string;
  assetName: string;
  symbol: string;
  type: TradeSignalType;
  direction: TradeDirection;
  strength: number;
  confidence: number;
  riskLevel: string;
  source: SignalSource;
  reasoning: string[];
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface ValidationCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: "info" | "warning" | "blocking";
  message: string;
}

export interface ValidationResult {
  signalId: string;
  passed: boolean;
  checks: ValidationCheck[];
  rejectedReasons: string[];
  validatedAt: string;
}

export type PositionSizingMethod = "fixed-lots" | "fixed-risk" | "kelly" | "atr" | "portfolio" | "institutional";

export interface PositionSizingConfig {
  method: PositionSizingMethod;
  accountBalance: number;
  baseRiskPercent: number;
  maxRiskPercent: number;
  fixedLots: number;
  kellyFraction: number;
  atrMultiplier: number;
  atrDistance: number;
  portfolioPercent: number;
  institutionalPercent: number;
  contractSize: number;
  minLot: number;
  maxLot: number;
  maxPortfolioRiskPercent: number;
  maxRiskPerTradePercent: number;
}

export interface PositionSizingResult {
  method: PositionSizingMethod;
  methodLabel: string;
  lots: number;
  riskAmount: number;
  riskPercent: number;
  estimatedPnl: number;
  estimatedNotional: number;
  stopDistance: number;
  confidenceFactor: number;
  strengthFactor: number;
  notes: string[];
  positionSizingConfig: PositionSizingConfig;
  calculatedAt: string;
}

export interface Order {
  id: string;
  signalId: string;
  symbol: string;
  assetId: string;
  assetName: string;
  direction: TradeDirection;
  orderType: OrderType;
  entry: number;
  stop: number;
  takeProfit: number;
  lotSize: number;
  riskAmount: number;
  riskPercent: number;
  rewardRatio: number;
  mode: ExecutionMode;
  status: OrderStatus;
  notes: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionEvent {
  type: string;
  status: ExecutionStatus;
  timestamp: string;
  detail: string;
}

export interface ExecutionRecord {
  id: string;
  signalId: string;
  orderId: string;
  assetId: string;
  assetName: string;
  symbol: string;
  direction: TradeDirection;
  signalType: TradeSignalType;
  mode: ExecutionMode;
  brokerId: string;
  brokerOrderId: string | null;
  status: ExecutionStatus;
  validation: ValidationResult | null;
  order: Order | null;
  events: ExecutionEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionTimelineEntry {
  timestamp: string;
  type: string;
  detail: string;
  signalId?: string;
  orderId?: string;
}

export interface ExecutionHistoryEntry {
  id: string;
  timestamp: string;
  assetId: string;
  assetName: string;
  symbol: string;
  direction: TradeDirection;
  signalType: TradeSignalType;
  status: ExecutionStatus;
  mode: ExecutionMode;
  brokerId: string;
  confidence: number;
  lotSize: number | null;
  summary: string;
}

export interface BrokerAccount {
  id: string;
  name: string;
  balance: number;
  equity: number;
  marginUsed: number;
  currency: string;
  mode: ExecutionMode;
}

export interface BrokerPosition {
  id: string;
  symbol: string;
  direction: TradeDirection;
  lotSize: number;
  entryPrice: number;
  openTime: string;
  unrealizedPnl: number;
}

export interface BrokerHealth {
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  lastChecked: string;
  error: string | null;
}

export interface BrokerOrderRequest {
  orderId: string;
  symbol: string;
  direction: TradeDirection;
  orderType: OrderType;
  lotSize: number;
  entry?: number;
  stop?: number;
  takeProfit?: number;
  mode: ExecutionMode;
}

export interface BrokerOrderResponse {
  brokerOrderId: string;
  status: "filled" | "submitted" | "rejected" | "failed";
  fillPrice?: number;
  message?: string;
}

export interface BrokerOrderModify {
  lotSize?: number;
  stop?: number;
  takeProfit?: number;
}

export interface BrokerAdapter {
  readonly id: string;
  readonly name: string;
  readonly mode: ExecutionMode;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  placeOrder(request: BrokerOrderRequest): Promise<BrokerOrderResponse>;
  modifyOrder(brokerOrderId: string, changes: BrokerOrderModify): Promise<BrokerOrderResponse>;
  closeOrder(brokerOrderId: string): Promise<BrokerOrderResponse>;
  getPositions(): Promise<BrokerPosition[]>;
  getAccount(): Promise<BrokerAccount>;
  health(): Promise<BrokerHealth>;
}

export interface TradeValidationConfig {
  confidenceThreshold: number;
  maxRiskLevel: "Low" | "Medium" | "High";
  accountBalance?: number;
  maxRiskScore: number;
  maxPortfolioExposure: number;
  maxRiskPerTradePercent: number;
  maxPortfolioRiskPercent: number;
  maxPositionsPerAsset: number;
  requireHedgingReview: boolean;
  blockOnConflicts: boolean;
  allowLive: boolean;
}

export interface TradeExecutionMetrics {
  totalSignals: number;
  totalOrders: number;
  filled: number;
  rejected: number;
  cancelled: number;
  failed: number;
  sent: number;
  successRate: number;
  averageConfidence: number;
  byStatus: Record<ExecutionStatus, number>;
  byDirection: Record<TradeDirection, number>;
  byMode: Record<ExecutionMode, number>;
}
