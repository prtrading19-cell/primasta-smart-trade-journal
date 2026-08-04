export type {
  Mt5AccountInfo,
  Mt5AccountSnapshot,
  Mt5AccountSynchronizerState,
  Mt5BrokerStatus,
  Mt5CloseRequest,
  Mt5ConnectionState,
  Mt5ConnectionStatus,
  Mt5Deal,
  Mt5DealDirection,
  Mt5DealType,
  Mt5ExecutionConfirmation,
  Mt5ExecutionOutcome,
  Mt5GatewayResponse,
  Mt5HealthRecord,
  Mt5HealthStatus,
  Mt5Heartbeat,
  Mt5LatencyStats,
  Mt5LogCategory,
  Mt5LogEntry,
  Mt5ModifyRequest,
  Mt5Order,
  Mt5OrderState,
  Mt5OrderType,
  Mt5PlaceRequest,
  Mt5Position,
  Mt5PositionSynchronizerState,
  Mt5PositionType,
  Mt5ProposalSource,
  Mt5ProposalStatus,
  Mt5RawResult,
  Mt5RedactedConfig,
  Mt5SafetyCheck,
  Mt5SafetyConfig,
  Mt5SafetyResult,
  Mt5SyncStatus,
  Mt5TradeProposal,
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
export { Mt5BrokerManager, getMt5BrokerManager } from "./Mt5BrokerManager";
export type { Mt5SubmitResult, Mt5ApproveResult, Mt5Overview } from "./Mt5BrokerManager";
export { Mt5AccountManager, getMt5AccountManager } from "./Mt5AccountManager";

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
