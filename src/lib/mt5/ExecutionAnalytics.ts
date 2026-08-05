import type {
  Mt5ExecutionAnalytics,
  Mt5ExecutionConfirmation,
  Mt5ExecutionEvent,
  Mt5ExecutionSymbolStat,
  Mt5Deal,
  Mt5Order,
  Mt5Position,
} from "./types";
import { getExecutionConfirmationEngine } from "./ExecutionConfirmation";
import { getExecutionEventStore } from "./Mt5ExecutionEventStore";
import { getPositionSynchronizer } from "./PositionSynchronizer";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

export interface Mt5AnalyticsInput {
  confirmations?: Mt5ExecutionConfirmation[];
  events?: Mt5ExecutionEvent[];
  positions?: Mt5Position[];
  closedOrders?: Mt5Order[];
  deals?: Mt5Deal[];
}

function toMs(value: string): number | null {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function pnlOf(order: Mt5Order): number {
  return (order.profit ?? 0) + (order.swap ?? 0);
}

function rrOf(confirmation: Mt5ExecutionConfirmation): number | null {
  const entry = confirmation.fillPrice ?? confirmation.requestedPrice;
  if (entry == null || confirmation.sl == null || confirmation.tp == null) return null;
  const risk = Math.abs(entry - confirmation.sl);
  const reward = Math.abs(confirmation.tp - entry);
  if (risk <= 0) return null;
  return reward / risk;
}

/**
 * Execution analytics (feature G) computed exclusively from live, recorded
 * data — broker confirmations (latency, slippage, spread), the immutable
 * execution event trail, synchronized positions and closed order history.
 * No estimates, no simulated figures.
 */
export function computeExecutionAnalytics(input: Mt5AnalyticsInput = {}): Mt5ExecutionAnalytics {
  const confirmations = input.confirmations ?? getExecutionConfirmationEngine().getRecent(500);
  const events = input.events ?? getExecutionEventStore().list(500);
  const positions = input.positions ?? getPositionSynchronizer().getState().positions;
  const closedOrders = input.closedOrders ?? getPositionSynchronizer().getState().closedOrders;
  const deals = input.deals ?? getPositionSynchronizer().getState().deals;

  const latencies = confirmations.map((c) => c.latencyMs).filter((v): v is number => v != null);
  const slippages = confirmations.map((c) => c.slippage).filter((v): v is number => v != null);
  const spreads = confirmations.map((c) => c.spread).filter((v): v is number => v != null);
  const rrs = confirmations.map(rrOf).filter((v): v is number => v != null);

  const eventLatencies = events.map((e) => e.latencyMs).filter((v): v is number => v != null);

  const wins: number[] = [];
  const losses: number[] = [];
  let netPnl = 0;
  let totalCommission = 0;
  let totalSwap = 0;

  const settled = closedOrders.filter((o) => o.state === "filled" || o.state === "cancelled");
  for (const order of settled) {
    const pnl = pnlOf(order);
    netPnl += pnl;
    if (pnl > 0) wins.push(pnl);
    else if (pnl < 0) losses.push(pnl);
  }

  for (const deal of deals) {
    if (deal.direction !== "out") continue;
    totalCommission += deal.commission ?? 0;
    totalSwap += deal.swap ?? 0;
  }

  const closedTrades = wins.length + losses.length;
  const grossProfit = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));

  const holdingTimes: number[] = [];
  for (const order of settled) {
    if (!order.openTime || !order.closeTime) continue;
    const open = toMs(order.openTime);
    const close = toMs(order.closeTime);
    if (open != null && close != null && close >= open) holdingTimes.push(close - open);
  }

  const bySymbol = new Map<string, { trades: number; wins: number; losses: number; netPnl: number }>();
  for (const order of settled) {
    const pnl = pnlOf(order);
    const entry = bySymbol.get(order.symbol) ?? { trades: 0, wins: 0, losses: 0, netPnl: 0 };
    entry.trades += 1;
    entry.netPnl += pnl;
    if (pnl > 0) entry.wins += 1;
    else if (pnl < 0) entry.losses += 1;
    bySymbol.set(order.symbol, entry);
  }
  const stats: Mt5ExecutionSymbolStat[] = [...bySymbol.entries()]
    .map(([symbol, s]) => ({
      symbol,
      trades: s.trades,
      wins: s.wins,
      losses: s.losses,
      winRate: s.trades > 0 ? s.wins / s.trades : null,
      netPnl: s.netPnl,
    }))
    .sort((x, y) => y.netPnl - x.netPnl);

  return {
    totalTrades: confirmations.length + settled.length,
    closedTrades,
    openTrades: positions.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closedTrades > 0 ? wins.length / closedTrades : null,
    averageRR: mean(rrs),
    expectancy: closedTrades > 0 ? netPnl / closedTrades : null,
    averageHoldingTimeMs: mean(holdingTimes),
    averageProfit: mean(wins),
    averageLoss: mean(losses),
    totalProfit: grossProfit,
    totalLoss: -grossLoss,
    netPnl,
    totalCommission,
    totalSwap,
    averageLatencyMs: mean([...latencies, ...eventLatencies]),
    averageSlippage: mean(slippages),
    averageSpread: mean(spreads),
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
    stats,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Cached view of the last computed analytics snapshot. Recompute happens on
 * demand (dashboard refresh after actions) — never on a timer.
 */
export class ExecutionAnalyticsStore {
  private latest: Mt5ExecutionAnalytics | null = null;

  get(): Mt5ExecutionAnalytics | null {
    return this.latest ? { ...this.latest } : null;
  }

  recompute(): Mt5ExecutionAnalytics {
    this.latest = computeExecutionAnalytics();
    return this.get() as Mt5ExecutionAnalytics;
  }

  clear(): void {
    this.latest = null;
  }
}

export function getExecutionAnalyticsStore(): ExecutionAnalyticsStore {
  return getSharedSingleton("Mt5ExecutionAnalyticsStore", () => new ExecutionAnalyticsStore());
}
