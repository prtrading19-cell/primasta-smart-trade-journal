import type { DecisionHistoryEntry } from "./types";

export class DecisionHistory {
  private entries: DecisionHistoryEntry[] = [];
  private maxEntries = 500;

  add(entry: DecisionHistoryEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }

  getAll(): DecisionHistoryEntry[] {
    return [...this.entries];
  }

  getByAsset(asset: string): DecisionHistoryEntry[] {
    return this.entries
      .filter((e) => e.asset === asset)
      .slice(-50)
      .reverse();
  }

  getLatest(asset?: string): DecisionHistoryEntry | undefined {
    if (asset) {
      return this.getByAsset(asset)[0];
    }
    return this.entries[this.entries.length - 1];
  }

  getRecent(count = 20): DecisionHistoryEntry[] {
    return this.entries.slice(-count).reverse();
  }

  clear(): void {
    this.entries = [];
  }

  get size(): number {
    return this.entries.length;
  }
}
