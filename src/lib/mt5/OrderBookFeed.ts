import type {
  Mt5DepthOfMarket,
  Mt5Level2Entry,
  Mt5LiquidityHeatmapCell,
  Mt5OrderBookSnapshot,
} from "./types";
import { getMt5Logger } from "./Mt5Logger";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

/**
 * Order book preparation (feature I).
 *
 * Placeholder interfaces only — no fake market data is ever produced. The
 * institutional workstation is structured so that a live Depth of Market,
 * Level II and liquidity heatmap feed can be attached later without touching
 * the execution engine. Until then the NoopOrderBookFeed reports the
 * "not connected" state for every symbol.
 */
export interface Mt5OrderBookFeed {
  readonly id: string;
  readonly available: boolean;
  getDepth(symbol: string): Promise<Mt5DepthOfMarket | null>;
  getLevel2(symbol: string): Promise<Mt5Level2Entry[]>;
  getHeatmap(symbols: string[]): Promise<Mt5LiquidityHeatmapCell[]>;
  snapshot(symbols: string[]): Promise<Mt5OrderBookSnapshot>;
}

export class NoopOrderBookFeed implements Mt5OrderBookFeed {
  readonly id = "noop";
  readonly available = false;

  async getDepth(symbol: string): Promise<Mt5DepthOfMarket | null> {
    return {
      symbol,
      available: false,
      connected: false,
      bids: [],
      asks: [],
      updatedAt: null,
    };
  }

  async getLevel2(): Promise<Mt5Level2Entry[]> {
    return [];
  }

  async getHeatmap(): Promise<Mt5LiquidityHeatmapCell[]> {
    return [];
  }

  async snapshot(symbols: string[]): Promise<Mt5OrderBookSnapshot> {
    getMt5Logger().log(
      "gateway",
      "Order book snapshot requested",
      "No live DOM feed configured — returning empty placeholder state (no fake data)",
      { symbols }
    );
    return {
      symbol: symbols.join("+") || "—",
      connected: false,
      depth: null,
      level2: [],
      heatmap: [],
      error: "No live Depth of Market feed configured",
      updatedAt: new Date().toISOString(),
    };
  }
}

let feed: Mt5OrderBookFeed | null = null;

export function registerOrderBookFeed(next: Mt5OrderBookFeed): void {
  feed = next;
}

export function getOrderBookFeed(): Mt5OrderBookFeed {
  if (!feed) {
    feed = getSharedSingleton("Mt5NoopOrderBookFeed", () => new NoopOrderBookFeed());
  }
  return feed;
}
