import type { ExecutionHistoryEntry } from "./types";

export class ExecutionHistory {
  private entries: ExecutionHistoryEntry[] = [];
  private maxEntries = 1000;

  add(entry: ExecutionHistoryEntry): ExecutionHistoryEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getAll(): ExecutionHistoryEntry[] {
    return [...this.entries];
  }

  getRecent(count = 100): ExecutionHistoryEntry[] {
    return this.entries.slice(-count);
  }

  getByAsset(assetId: string): ExecutionHistoryEntry[] {
    return this.entries.filter((e) => e.assetId === assetId);
  }

  getByStatus(status: string): ExecutionHistoryEntry[] {
    return this.entries.filter((e) => e.status === status);
  }

  clear(): void {
    this.entries = [];
  }

  get size(): number {
    return this.entries.length;
  }
}
