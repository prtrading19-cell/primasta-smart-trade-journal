import type { PortfolioIntelligenceResult } from "@/lib/research/portfolio";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";
import { ExecutionHistory } from "./ExecutionHistory";
import { ExecutionTimeline } from "./ExecutionTimeline";
import { ExecutionRepository } from "./ExecutionRepository";
import { BrokerRegistry } from "./BrokerRegistry";
import { BrokerManager } from "./BrokerManager";
import { PaperBrokerAdapter } from "./PaperBrokerAdapter";
import { ExecutionEngine, type ExecutionEngineResult } from "./ExecutionEngine";
import { TradeSignalEngine, type TradeSignalInput } from "./TradeSignalEngine";
import { TradeValidationEngine, type TradeValidationInput } from "./TradeValidationEngine";
import { RiskValidationEngine, type RiskValidationInput, type RiskValidationResult } from "./RiskValidationEngine";
import { PositionSizingEngine, type PositionSizingInput } from "./PositionSizingEngine";
import { OrderBuilder, type OrderBuildInput } from "./OrderBuilder";
import type {
  BrokerAdapter,
  ExecutionHistoryEntry,
  ExecutionRecord,
  ExecutionTimelineEntry,
  Order,
  TradeExecutionMetrics,
  TradeSignal,
  ValidationResult,
} from "./types";

export const globalExecutionHistory = getSharedSingleton("globalExecutionHistory", () => new ExecutionHistory());
export const globalExecutionTimeline = getSharedSingleton("globalExecutionTimeline", () => new ExecutionTimeline());
export const globalBrokerRegistry = getSharedSingleton("globalBrokerRegistry", () => new BrokerRegistry());
export const globalBrokerManager = getSharedSingleton(
  "globalBrokerManager",
  () => new BrokerManager(globalBrokerRegistry)
);
export const globalExecutionRepository = getSharedSingleton(
  "globalExecutionRepository",
  () => new ExecutionRepository(globalExecutionHistory, globalExecutionTimeline)
);

export function ensurePaperBroker(): BrokerAdapter {
  const registry = globalBrokerRegistry;
  if (!registry.has("paper")) {
    registry.registerPaper(new PaperBrokerAdapter());
  }
  return registry.get("paper") as BrokerAdapter;
}

export class TradeExecutionService {
  private history = globalExecutionHistory;
  private timeline = globalExecutionTimeline;
  private repository = globalExecutionRepository;
  private brokers = globalBrokerManager;
  private signalEngine = new TradeSignalEngine();
  private validator = new TradeValidationEngine();
  private riskValidator = new RiskValidationEngine();
  private sizer = new PositionSizingEngine();
  private orderBuilder = new OrderBuilder();

  private latestPortfolio: PortfolioIntelligenceResult | null = null;

  private engine: ExecutionEngine = new ExecutionEngine({
    repository: this.repository,
    history: this.history,
    timeline: this.timeline,
    brokers: this.brokers,
    portfolioProvider: () => this.latestPortfolio,
    marketOpenProvider: () => {
      const day = new Date().getDay();
      return day !== 0 && day !== 6;
    },
  });

  getEngine(): ExecutionEngine {
    return this.engine;
  }

  updatePortfolio(portfolio: PortfolioIntelligenceResult | null): void {
    this.latestPortfolio = portfolio;
  }

  getPortfolio(): PortfolioIntelligenceResult | null {
    return this.latestPortfolio;
  }

  generateSignals(input: TradeSignalInput = {}): TradeSignal[] {
    return this.signalEngine.generate(input);
  }

  validate(signal: TradeSignal, input: Partial<TradeValidationInput> = {}): ValidationResult {
    return this.validator.validate({ signal, portfolio: this.latestPortfolio, ...input });
  }

  validateRisk(signal: TradeSignal, input: Partial<RiskValidationInput> = {}): RiskValidationResult {
    return this.riskValidator.validate({ signal, portfolio: this.latestPortfolio, ...input });
  }

  size(signal: TradeSignal, input: Partial<PositionSizingInput> = {}): ReturnType<PositionSizingEngine["calculate"]> {
    return this.sizer.calculate({ signal, portfolio: this.latestPortfolio, ...input });
  }

  buildOrder(signal: TradeSignal, input: Partial<OrderBuildInput> = {}): Order {
    const sizing = input.sizing ?? this.size(signal);
    return this.orderBuilder.build({ signal, sizing, ...input });
  }

  async execute(
    signal: TradeSignal,
    options?: {
      portfolio?: PortfolioIntelligenceResult | null;
      orderType?: Order["orderType"];
      entryPrice?: number;
      stop?: number;
      takeProfit?: number;
      mode?: "paper" | "simulation" | "live";
      force?: boolean;
    }
  ): Promise<ExecutionEngineResult> {
    if (options?.portfolio !== undefined) this.updatePortfolio(options.portfolio);
    return this.engine.execute(signal, {
      orderType: options?.orderType,
      entryPrice: options?.entryPrice,
      stop: options?.stop,
      takeProfit: options?.takeProfit,
      mode: options?.mode,
      force: options?.force,
    });
  }

  records(): ExecutionRecord[] {
    return this.repository.all();
  }

  getRecord(id: string): ExecutionRecord | null {
    return this.repository.get(id);
  }

  historyEntries(limit = 100): ExecutionHistoryEntry[] {
    return this.history.getRecent(limit).reverse();
  }

  timelineEntries(limit = 50): ExecutionTimelineEntry[] {
    return this.timeline.getRecent(limit).reverse();
  }

  brokersList(): BrokerAdapter[] {
    ensurePaperBroker();
    return this.brokers.getRegistry().list();
  }

  brokerSummary(): {
    id: string;
    name: string;
    mode: ExecutionRecord["mode"];
    connected: boolean;
    connectedAt: string | null;
  }[] {
    ensurePaperBroker();
    return this.brokers.connectionStates().map((c) => {
      const adapter = this.brokers.getRegistry().get(c.brokerId);
      return {
        id: c.brokerId,
        name: adapter?.name ?? c.brokerId,
        mode: (adapter?.mode ?? "paper") as ExecutionRecord["mode"],
        connected: c.connected,
        connectedAt: c.connectedAt,
      };
    });
  }

  async brokerHealth(): Promise<Record<string, Awaited<ReturnType<BrokerAdapter["health"]>>>> {
    ensurePaperBroker();
    return this.brokers.healthAll();
  }

  async brokerPositions() {
    ensurePaperBroker();
    return this.brokers.getPositions();
  }

  async brokerAccount() {
    ensurePaperBroker();
    return this.brokers.getAccount();
  }

  metrics(): TradeExecutionMetrics {
    const records = this.repository.all();
    const statuses = ["pending", "validated", "rejected", "built", "sent", "filled", "cancelled", "failed"] as const;
    const directions = ["buy", "sell", "flat"] as const;
    const modes = ["paper", "simulation", "live"] as const;

    const byStatus = Object.fromEntries(statuses.map((s) => [s, 0])) as Record<ExecutionRecord["status"], number>;
    const byDirection = Object.fromEntries(directions.map((d) => [d, 0])) as Record<TradeSignal["direction"], number>;
    const byMode = Object.fromEntries(modes.map((m) => [m, 0])) as Record<ExecutionRecord["mode"], number>;

    let filled = 0;
    let rejected = 0;
    let cancelled = 0;
    let failed = 0;
    let sent = 0;
    let totalConfidence = 0;

    for (const r of records) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      byDirection[r.direction] = (byDirection[r.direction] ?? 0) + 1;
      byMode[r.mode] = (byMode[r.mode] ?? 0) + 1;
      if (r.status === "filled") filled++;
      if (r.status === "rejected") rejected++;
      if (r.status === "cancelled") cancelled++;
      if (r.status === "failed") failed++;
      if (r.status === "sent") sent++;
      const confidence =
        typeof r.order?.metadata?.confidence === "number" ? r.order.metadata.confidence : 0;
      totalConfidence += confidence;
    }

    const total = records.length;
    return {
      totalSignals: total,
      totalOrders: total,
      filled,
      rejected,
      cancelled,
      failed,
      sent,
      successRate: total > 0 ? Math.round((filled / total) * 1000) / 10 : 0,
      averageConfidence: total > 0 ? Math.round(totalConfidence / total) : 0,
      byStatus,
      byDirection,
      byMode,
    };
  }
}

export const tradeExecutionService = getSharedSingleton("tradeExecutionService", () => new TradeExecutionService());

export function getTradeExecutionService(): TradeExecutionService {
  ensurePaperBroker();
  return tradeExecutionService;
}

export type {
  ExecutionEngineResult,
  TradeSignalInput,
  TradeValidationInput,
  RiskValidationInput,
  PositionSizingInput,
  OrderBuildInput,
};
