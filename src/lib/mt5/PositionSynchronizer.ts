import type {
  Mt5Deal,
  Mt5Order,
  Mt5Position,
  Mt5PositionSynchronizerState,
  Mt5SyncStatus,
} from "./types";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

const HISTORY_LIMIT = 300;

export class PositionSynchronizer {
  private positions: Mt5Position[] = [];
  private pendingOrders: Mt5Order[] = [];
  private closedOrders: Mt5Order[] = [];
  private deals: Mt5Deal[] = [];
  private lastSyncAt: string | null = null;
  private lastSyncStatus: Mt5SyncStatus = "never";
  private error: string | null = null;
  private syncCount = 0;

  recordSuccess(input: {
    positions: Mt5Position[];
    pendingOrders: Mt5Order[];
    closedOrders: Mt5Order[];
    deals: Mt5Deal[];
  }): void {
    this.positions = input.positions.map((p) => ({ ...p }));
    this.pendingOrders = input.pendingOrders.map((o) => ({ ...o }));
    this.closedOrders = [...input.closedOrders.map((o) => ({ ...o })), ...this.closedOrders]
      .slice(0, HISTORY_LIMIT);
    this.deals = [...input.deals.map((d) => ({ ...d })), ...this.deals].slice(0, HISTORY_LIMIT);
    this.lastSyncAt = new Date().toISOString();
    this.lastSyncStatus = "success";
    this.error = null;
    this.syncCount += 1;
  }

  recordFailure(error: string): void {
    this.lastSyncStatus = "failed";
    this.error = error;
  }

  recordUnavailable(error: string): void {
    this.lastSyncStatus = "unavailable";
    this.error = error;
  }

  getState(): Mt5PositionSynchronizerState {
    const magicNumbers = Array.from(
      new Set([...this.positions, ...this.pendingOrders].map((p) => p.magic))
    ).sort((a, b) => a - b);

    return {
      positions: this.positions.map((p) => ({ ...p })),
      pendingOrders: this.pendingOrders.map((o) => ({ ...o })),
      closedOrders: this.closedOrders.map((o) => ({ ...o })),
      deals: this.deals.map((d) => ({ ...d })),
      lastSyncAt: this.lastSyncAt,
      lastSyncStatus: this.lastSyncStatus,
      error: this.error,
      syncCount: this.syncCount,
      openCount: this.positions.length,
      pendingCount: this.pendingOrders.length,
      magicNumbers,
    };
  }

  reset(): void {
    this.positions = [];
    this.pendingOrders = [];
    this.closedOrders = [];
    this.deals = [];
    this.lastSyncAt = null;
    this.lastSyncStatus = "never";
    this.error = null;
    this.syncCount = 0;
  }
}

export function getPositionSynchronizer(): PositionSynchronizer {
  return getSharedSingleton("Mt5PositionSynchronizer", () => new PositionSynchronizer());
}
