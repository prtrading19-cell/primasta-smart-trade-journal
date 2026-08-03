import type { Mt5AccountSynchronizerState, Mt5AccountInfo, Mt5SyncStatus } from "./types";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

const HISTORY_LIMIT = 120;

export class AccountSynchronizer {
  private latest: Mt5AccountInfo | null = null;
  private history: Mt5AccountInfo[] = [];
  private lastSyncAt: string | null = null;
  private lastSyncStatus: Mt5SyncStatus = "never";
  private error: string | null = null;
  private floatingPnl: number | null = null;
  private closedPnl: number | null = null;
  private syncCount = 0;

  setSyncing(): void {
    this.lastSyncStatus = this.lastSyncAt == null ? "unavailable" : this.lastSyncStatus;
  }

  recordSuccess(account: Mt5AccountInfo, closedPnl?: number | null): void {
    this.latest = { ...account, updatedAt: new Date().toISOString() };
    this.history.push(this.latest);
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
    this.lastSyncAt = new Date().toISOString();
    this.lastSyncStatus = "success";
    this.error = null;
    this.floatingPnl = account.profit;
    this.closedPnl = closedPnl ?? null;
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

  getState(): Mt5AccountSynchronizerState {
    return {
      latest: this.latest ? { ...this.latest } : null,
      history: this.history.map((h) => ({ ...h })),
      lastSyncAt: this.lastSyncAt,
      lastSyncStatus: this.lastSyncStatus,
      error: this.error,
      floatingPnl: this.floatingPnl,
      closedPnl: this.closedPnl,
      syncCount: this.syncCount,
    };
  }

  reset(): void {
    this.latest = null;
    this.history = [];
    this.lastSyncAt = null;
    this.lastSyncStatus = "never";
    this.error = null;
    this.floatingPnl = null;
    this.closedPnl = null;
    this.syncCount = 0;
  }
}

export function getAccountSynchronizer(): AccountSynchronizer {
  return getSharedSingleton("Mt5AccountSynchronizer", () => new AccountSynchronizer());
}
