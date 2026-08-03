import type { PortfolioHistoryEntry } from "./types";

export class PortfolioHistory {
  private entries: PortfolioHistoryEntry[] = [];
  private maxEntries = 200;

  add(entry: PortfolioHistoryEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
  }

  getAll(): PortfolioHistoryEntry[] {
    return [...this.entries];
  }

  getRecent(count = 30): PortfolioHistoryEntry[] {
    return this.entries.slice(-count).reverse();
  }

  getLatest(): PortfolioHistoryEntry | undefined {
    return this.entries[this.entries.length - 1];
  }

  clear(): void {
    this.entries = [];
  }

  get size(): number {
    return this.entries.length;
  }
}
