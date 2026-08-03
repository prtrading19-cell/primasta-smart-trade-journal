import type { TradeSignal } from "./types";
import type { Order, OrderType, TradeDirection } from "./types";
import type { PositionSizingResult } from "./types";

export interface OrderBuildInput {
  signal: TradeSignal;
  sizing: PositionSizingResult;
  orderType?: OrderType;
  entryPrice?: number;
  stop?: number;
  takeProfit?: number;
  mode?: "paper" | "simulation" | "live";
  notes?: string[];
}

const DEFAULT_PRICES: Record<string, number> = {
  XAUUSD: 2400,
  US100: 21000,
  US500: 6000,
  BTCUSD: 105000,
  EURUSD: 1.08,
  GBPUSD: 1.27,
  XAGUSD: 29,
  WTIUSD: 78,
};

let orderCounter = 0;

export class OrderBuilder {
  build(input: OrderBuildInput): Order {
    const { signal, sizing } = input;
    const now = new Date().toISOString();
    const price = input.entryPrice ?? DEFAULT_PRICES[signal.symbol] ?? 100;
    const stopDistance = sizing.stopDistance * (signal.symbol === "XAUUSD" ? 1 : 10);
    const direction = input.signal.direction;
    const stop = input.stop ?? this.defaultStop(price, stopDistance, direction);
    const takeProfit = input.takeProfit ?? this.defaultTakeProfit(price, stop, direction);

    orderCounter += 1;
    const id = `ord-${now}-${orderCounter}-${signal.assetId}`;

    const order: Order = {
      id,
      signalId: signal.id,
      symbol: signal.symbol,
      assetId: signal.assetId,
      assetName: signal.assetName,
      direction,
      orderType: input.orderType ?? "MARKET",
      entry: price,
      stop,
      takeProfit,
      lotSize: sizing.lots,
      riskAmount: sizing.riskAmount,
      riskPercent: sizing.riskPercent,
      rewardRatio: this.rewardRatio(price, stop, takeProfit),
      mode: input.mode ?? "paper",
      status: "DRAFT",
      notes: input.notes ?? sizing.notes ?? [],
      metadata: {
        signalType: signal.type,
        source: signal.source,
        confidence: signal.confidence,
        strength: signal.strength,
      },
      createdAt: now,
      updatedAt: now,
    };
    return order;
  }

  private defaultStop(price: number, distance: number, direction: TradeDirection): number {
    const offset = direction === "sell" ? distance : -distance;
    return Math.round((price + offset) * 100) / 100;
  }

  private defaultTakeProfit(price: number, stop: number, direction: TradeDirection): number {
    const risk = Math.abs(price - stop);
    const target = direction === "sell" ? price - risk * 2 : price + risk * 2;
    return Math.round(target * 100) / 100;
  }

  private rewardRatio(entry: number, stop: number, takeProfit: number): number {
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(takeProfit - entry);
    return risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;
  }
}

export function buildOrder(input: OrderBuildInput): Order {
  return new OrderBuilder().build(input);
}
