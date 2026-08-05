export type {
  Mt5AccountInfo,
  Mt5AccountSnapshot,
  Mt5AccountSynchronizerState,
  Mt5BrokerStatus,
  Mt5BulkCloseResult,
  Mt5CloseRequest,
  Mt5ConnectionState,
  Mt5ConnectionStatus,
  Mt5Deal,
  Mt5DealDirection,
  Mt5DealType,
  Mt5ExecutionConfirmation,
  Mt5ExecutionEvent,
  Mt5ExecutionOutcome,
  Mt5FillPolicy,
  Mt5GatewayResponse,
  Mt5HealthRecord,
  Mt5HealthStatus,
  Mt5Heartbeat,
  Mt5LatencyStats,
  Mt5LogCategory,
  Mt5LogEntry,
  Mt5ModifyRequest,
  Mt5Order,
  Mt5OrderPreview,
  Mt5OrderState,
  Mt5OrderType,
  Mt5PlaceRequest,
  Mt5Position,
  Mt5PositionActionResult,
  Mt5PositionSynchronizerState,
  Mt5PositionType,
  Mt5ProposalSource,
  Mt5ProposalStatus,
  Mt5RawResult,
  Mt5RedactedConfig,
  Mt5SafetyCheck,
  Mt5SafetyConfig,
  Mt5SafetyResult,
  Mt5Symbol,
  Mt5SymbolSpec,
  Mt5SyncStatus,
  Mt5Tick,
  Mt5TimePolicy,
  Mt5TradeProposal,
  Mt5ValidationCheck,
  Mt5ValidationResult,
  Mt5AccountDescriptor,
  Mt5BasketLeg,
  Mt5BasketRequest,
  Mt5BracketLeg,
  Mt5BracketRequest,
  Mt5DepthEntry,
  Mt5DepthOfMarket,
  Mt5ExecutionAnalytics,
  Mt5ExecutionGroup,
  Mt5ExecutionGroupLeg,
  Mt5ExecutionGroupLegStatus,
  Mt5ExecutionGroupMode,
  Mt5ExecutionGroupStatus,
  Mt5ExecutionStatEntry,
  Mt5ExecutionSymbolStat,
  Mt5Level2Entry,
  Mt5LiquidityHeatmapCell,
  Mt5OcoRequest,
  Mt5OrderBookSnapshot,
  Mt5ReplaySession,
  Mt5ReplayStep,
  Mt5ScaleInRequest,
  Mt5ScaleInTranche,
  Mt5ScaleOutRequest,
  Mt5VenueDescriptor,
  Mt5VenueId,
  Mt5VenueRoutingResult,
  Mt5VenueStatus,
} from "./types";
export type {
  Mt5AccountConnectionStatus,
  Mt5AccountInput,
  Mt5AccountManagerSession,
  Mt5AutoConnectResult,
  Mt5BrokerInfo,
  Mt5ConnectOptions,
  Mt5ConnectOutcome,
  Mt5SavedAccount,
  Mt5TerminalInfo,
  Mt5TestConnectionResult,
} from "./accountTypes";

export { getMt5Config, hasMt5Credentials, maskLogin, redactMt5Config, MT5_BROKER_ID, MT5_BROKER_NAME } from "./config";
export type { Mt5Config } from "./config";
export { getMt5Logger, Mt5Logger } from "./Mt5Logger";
export { Mt5Gateway, Mt5UnavailableTransport } from "./Mt5Gateway";
export { Mt5PythonGatewayTransport } from "./PythonGatewayTransport";
export type { Mt5GatewayTransport } from "./Mt5Gateway";
export { Mt5Adapter } from "./Mt5Adapter";
export type { Mt5Subscription, Mt5History } from "./Mt5Adapter";
export { BrokerStatusEngine, getBrokerStatusEngine } from "./BrokerStatusEngine";
export { AccountSynchronizer, getAccountSynchronizer } from "./AccountSynchronizer";
export { PositionSynchronizer, getPositionSynchronizer } from "./PositionSynchronizer";
export { BrokerHealthEngine, getBrokerHealthEngine } from "./BrokerHealthEngine";
export { ExecutionConfirmationEngine, getExecutionConfirmationEngine } from "./ExecutionConfirmation";
export { SafetyEngine, getSafetyEngine } from "./SafetyEngine";
export { ManualApprovalLayer, getManualApprovalLayer } from "./ManualApprovalLayer";
export { ExecutionEngine, getExecutionEngine, isBuyOrderType, isPendingOrderType, correlationGroupOf } from "./ExecutionEngine";
export type { Mt5PreviewOutcome } from "./ExecutionEngine";
export { Mt5ExecutionEventStore, getExecutionEventStore } from "./Mt5ExecutionEventStore";
export { PositionManager, getPositionManager } from "./PositionManager";
export type { Mt5PartialCloseFraction, Mt5CloseAllFilter } from "./PositionManager";
export { Mt5BrokerManager, getMt5BrokerManager } from "./Mt5BrokerManager";
export type { Mt5SubmitResult, Mt5ApproveResult, Mt5Overview } from "./Mt5BrokerManager";
export { Mt5AccountManager, getMt5AccountManager } from "./Mt5AccountManager";
export { ExecutionGroupStore, getExecutionGroupStore } from "./ExecutionGroupStore";
export {
  InstitutionalOrderEngine,
  getInstitutionalOrderEngine,
} from "./InstitutionalOrderEngine";
export type {
  Mt5GroupActionResult,
  Mt5GroupApproveResult,
  Mt5GroupLegTransmitResult,
  Mt5ScaleOutTriggerResult,
  Mt5ReconcileResult,
} from "./InstitutionalOrderEngine";
export {
  computeExecutionAnalytics,
  ExecutionAnalyticsStore,
  getExecutionAnalyticsStore,
} from "./ExecutionAnalytics";
export type { Mt5AnalyticsInput } from "./ExecutionAnalytics";
export { TradeReplay, getTradeReplay } from "./TradeReplay";
export { Mt5VenueRegistry, getMt5VenueRegistry } from "./ExecutionVenues";
export type { Mt5ExecutionVenue } from "./ExecutionVenues";
export {
  NoopOrderBookFeed,
  registerOrderBookFeed,
  getOrderBookFeed,
} from "./OrderBookFeed";
export type { Mt5OrderBookFeed } from "./OrderBookFeed";
export { SingleAccountRouter, getMt5AccountRouter } from "./AccountRouter";
export type { Mt5AccountRouter, Mt5AccountRoutingResult } from "./AccountRouter";

import { getTradeExecutionService, globalBrokerRegistry } from "@/lib/trading";
import { Mt5Adapter } from "./Mt5Adapter";

/**
 * Registers the MT5 adapter in the shared broker registry so the trading
 * execution layer can reach it through the existing Broker Manager.
 * Server-side only — never import this module from client components.
 */
export function ensureMt5Broker(): Mt5Adapter {
  getTradeExecutionService();
  const registry = globalBrokerRegistry;
  if (!registry.has("mt5")) {
    registry.register(new Mt5Adapter());
  }
  return registry.get("mt5") as Mt5Adapter;
}

export function isMt5BrokerRegistered(): boolean {
  return globalBrokerRegistry.has("mt5");
}
