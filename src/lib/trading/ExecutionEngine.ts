import type { PortfolioIntelligenceResult } from "@/lib/research/portfolio";
import { TradeValidationEngine } from "./TradeValidationEngine";
import { RiskValidationEngine } from "./RiskValidationEngine";
import { PositionSizingEngine } from "./PositionSizingEngine";
import { OrderBuilder } from "./OrderBuilder";
import { BrokerManager } from "./BrokerManager";
import { ExecutionRepository } from "./ExecutionRepository";
import { ExecutionHistory } from "./ExecutionHistory";
import { ExecutionTimeline } from "./ExecutionTimeline";
import type {
  ExecutionRecord,
  ExecutionStatus,
  Order,
  OrderType,
  TradeSignal,
  TradeValidationConfig,
} from "./types";

export interface ExecutionEngineOptions {
  repository: ExecutionRepository;
  history: ExecutionHistory;
  timeline: ExecutionTimeline;
  brokers: BrokerManager;
  portfolioProvider?: () => PortfolioIntelligenceResult | null;
  marketOpenProvider?: () => boolean;
  validationConfig?: Partial<TradeValidationConfig>;
}

export interface ExecutionEngineResult {
  record: ExecutionRecord | null;
  order: Order | null;
  rejectedReasons: string[];
  error: string | null;
}

let executionCounter = 0;

export class ExecutionEngine {
  private repository: ExecutionRepository;
  private history: ExecutionHistory;
  private timeline: ExecutionTimeline;
  private brokers: BrokerManager;
  private portfolioProvider?: () => PortfolioIntelligenceResult | null;
  private marketOpenProvider?: () => boolean;
  private validationConfig?: Partial<TradeValidationConfig>;

  private validator = new TradeValidationEngine();
  private riskValidator = new RiskValidationEngine();
  private sizer = new PositionSizingEngine();
  private orderBuilder = new OrderBuilder();

  constructor(options: ExecutionEngineOptions) {
    this.repository = options.repository;
    this.history = options.history;
    this.timeline = options.timeline;
    this.brokers = options.brokers;
    this.portfolioProvider = options.portfolioProvider;
    this.marketOpenProvider = options.marketOpenProvider;
    this.validationConfig = options.validationConfig;
  }

  async execute(
    signal: TradeSignal,
    options?: {
      orderType?: OrderType;
      entryPrice?: number;
      stop?: number;
      takeProfit?: number;
      mode?: "paper" | "simulation" | "live";
      force?: boolean;
    }
  ): Promise<ExecutionEngineResult> {
    const now = new Date().toISOString();
    const portfolio = this.portfolioProvider?.() ?? null;
    const marketOpen = this.marketOpenProvider?.();
    const mode = options?.mode ?? "paper";

    this.timeline.add("signal.received", `${signal.assetName} ${signal.type}`, signal.id);

    const validation = this.validator.validate({
      signal,
      portfolio,
      existingPositions: portfolio?.positions ?? [],
      config: this.validationConfig,
      marketOpen,
    });

    const rejectedReasons = [...validation.rejectedReasons];

    if (rejectedReasons.length > 0 && !options?.force) {
      const record = this.newRecord(signal, now, "rejected", null, validation, mode);
      record.events.push({
        type: "validation.rejected",
        status: "rejected",
        timestamp: now,
        detail: rejectedReasons.join("; "),
      });
      this.repository.save(record);
      this.history.add(this.toHistoryEntry(signal, record));
      this.timeline.add("validation.rejected", `${signal.assetName}: ${rejectedReasons[0]}`, signal.id);
      return { record, order: null, rejectedReasons, error: null };
    }

    this.timeline.add("validation.passed", `${signal.assetName} passed validation`, signal.id);

    const sizing = this.sizer.calculate({ signal, portfolio, config: this.validationConfig });

    const riskValidation = this.riskValidator.validate({
      signal,
      portfolio,
      positionSize: sizing.riskPercent,
    });
    rejectedReasons.push(...riskValidation.blockedReasons);

    if (rejectedReasons.length > 0 && !options?.force) {
      const record = this.newRecord(signal, now, "rejected", null, validation, mode);
      record.events.push({
        type: "risk.rejected",
        status: "rejected",
        timestamp: now,
        detail: rejectedReasons.join("; "),
      });
      this.repository.save(record);
      this.history.add(this.toHistoryEntry(signal, record));
      this.timeline.add("risk.rejected", `${signal.assetName}: ${rejectedReasons[0]}`, signal.id);
      return { record, order: null, rejectedReasons, error: null };
    }

    const order = this.orderBuilder.build({
      signal,
      sizing,
      orderType: options?.orderType,
      entryPrice: options?.entryPrice,
      stop: options?.stop,
      takeProfit: options?.takeProfit,
      mode,
      notes: sizing.notes,
    });

    const record = this.newRecord(signal, now, "built", order, validation, mode);
    record.order = order;
    record.events.push({
      type: "order.built",
      status: "built",
      timestamp: now,
      detail: `${order.direction} ${order.lotSize} ${order.symbol} @ ${order.entry}`,
    });
    this.repository.save(record);
    this.timeline.add("order.built", `${order.symbol} ${order.lotSize} lots built`, signal.id, order.id);

    if (mode === "live") {
      this.timeline.add(
        "live.blocked",
        "Live execution is disabled in this build; configure allowLive to enable",
        signal.id,
        order.id
      );
      record.status = "cancelled";
      record.events.push({
        type: "live.blocked",
        status: "cancelled",
        timestamp: new Date().toISOString(),
        detail: "Live trading disabled",
      });
      this.repository.save(record);
      this.history.add(this.toHistoryEntry(signal, record));
      return { record, order, rejectedReasons, error: null };
    }

    this.timeline.add("order.sending", `Sending ${order.symbol} to ${mode} broker`, signal.id, order.id);
    record.status = "sent";
    this.repository.save(record);

    try {
      const response = await this.brokers.placeOrder({
        orderId: order.id,
        symbol: order.symbol,
        direction: order.direction,
        orderType: order.orderType,
        lotSize: order.lotSize,
        entry: order.entry,
        stop: order.stop,
        takeProfit: order.takeProfit,
        mode,
      });

      if (response.status === "filled") {
        record.status = "filled";
        record.brokerOrderId = response.brokerOrderId;
        record.events.push({
          type: "order.filled",
          status: "filled",
          timestamp: new Date().toISOString(),
          detail: `Filled at ${response.fillPrice ?? order.entry} (${response.brokerOrderId})`,
        });
        this.timeline.add(
          "order.filled",
          `${order.symbol} filled at ${response.fillPrice ?? order.entry}`,
          signal.id,
          order.id
        );
      } else {
        record.status = "failed";
        record.events.push({
          type: "order.failed",
          status: "failed",
          timestamp: new Date().toISOString(),
          detail: response.message ?? "Broker rejected order",
        });
        this.timeline.add("order.failed", `${order.symbol} rejected: ${response.message}`, signal.id, order.id);
      }
    } catch (err) {
      record.status = "failed";
      const msg = err instanceof Error ? err.message : "Unknown execution error";
      record.events.push({
        type: "order.failed",
        status: "failed",
        timestamp: new Date().toISOString(),
        detail: msg,
      });
      this.timeline.add("order.failed", msg, signal.id, order.id);
    }

    this.repository.save(record);
    this.history.add(this.toHistoryEntry(signal, record));
    return { record, order, rejectedReasons, error: null };
  }

  private newRecord(
    signal: TradeSignal,
    now: string,
    status: ExecutionStatus,
    order: Order | null,
    validation: ReturnType<TradeValidationEngine["validate"]>,
    mode: ExecutionRecord["mode"] = "paper"
  ): ExecutionRecord {
    executionCounter += 1;
    return {
      id: `rec-${now}-${executionCounter}-${signal.assetId}`,
      signalId: signal.id,
      orderId: order?.id ?? `ord-${now}-${executionCounter}-${signal.assetId}`,
      assetId: signal.assetId,
      assetName: signal.assetName,
      symbol: signal.symbol,
      direction: signal.direction,
      signalType: signal.type,
      mode,
      brokerId: mode === "live" ? "live-disabled" : mode === "simulation" ? "simulation" : "paper",
      brokerOrderId: null,
      status,
      validation,
      order,
      events: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  private toHistoryEntry(
    signal: TradeSignal,
    record: ExecutionRecord
  ): {
    id: string;
    timestamp: string;
    assetId: string;
    assetName: string;
    symbol: string;
    direction: TradeSignal["direction"];
    signalType: TradeSignal["type"];
    status: ExecutionStatus;
    mode: ExecutionRecord["mode"];
    brokerId: string;
    confidence: number;
    lotSize: number | null;
    summary: string;
  } {
    const lotSize = record.order?.lotSize ?? null;
    return {
      id: record.id,
      timestamp: record.updatedAt,
      assetId: record.assetId,
      assetName: record.assetName,
      symbol: record.symbol,
      direction: record.direction,
      signalType: record.signalType,
      status: record.status,
      mode: record.mode,
      brokerId: record.brokerId,
      confidence: signal.confidence,
      lotSize,
      summary:
        record.status === "filled"
          ? `${record.symbol} ${lotSize ?? ""} lots filled`
          : record.status === "rejected"
            ? `${record.symbol} rejected`
            : `${record.symbol} ${record.status}`,
    };
  }
}
