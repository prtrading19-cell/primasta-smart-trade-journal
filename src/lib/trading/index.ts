export * from "./types";
export { TRADING_CONFIG } from "./config";

export { TradeSignalEngine, generateTradeSignals } from "./TradeSignalEngine";
export type { TradeSignalInput } from "./TradeSignalEngine";

export { TradeValidationEngine, validateTradeSignal, collectWarnings } from "./TradeValidationEngine";
export type { TradeValidationInput } from "./TradeValidationEngine";

export { RiskValidationEngine, validateRisk } from "./RiskValidationEngine";
export type { RiskValidationInput, RiskValidationItem, RiskValidationResult } from "./RiskValidationEngine";

export { PositionSizingEngine, calculatePositionSize } from "./PositionSizingEngine";
export type { PositionSizingInput } from "./PositionSizingEngine";

export { OrderBuilder, buildOrder } from "./OrderBuilder";
export type { OrderBuildInput } from "./OrderBuilder";

export { ExecutionEngine } from "./ExecutionEngine";
export type { ExecutionEngineOptions, ExecutionEngineResult } from "./ExecutionEngine";

export { ExecutionHistory } from "./ExecutionHistory";
export { ExecutionTimeline } from "./ExecutionTimeline";
export { ExecutionRepository } from "./ExecutionRepository";
export { BrokerRegistry } from "./BrokerRegistry";
export { BrokerManager } from "./BrokerManager";
export type { BrokerConnectionState } from "./BrokerManager";
export { PaperBrokerAdapter } from "./PaperBrokerAdapter";

export {
  TradeExecutionService,
  tradeExecutionService,
  getTradeExecutionService,
  ensurePaperBroker,
  globalExecutionHistory,
  globalExecutionTimeline,
  globalExecutionRepository,
  globalBrokerRegistry,
  globalBrokerManager,
} from "./TradeExecutionService";
