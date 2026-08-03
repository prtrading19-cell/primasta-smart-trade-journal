import type { PortfolioTimelineEntry } from "./types";

export class PortfolioTimeline {
  private entries: PortfolioTimelineEntry[] = [];
  private maxEntries = 500;

  add(engine: string, result: string, confidence: number, durationMs: number): PortfolioTimelineEntry {
    const entry: PortfolioTimelineEntry = {
      timestamp: new Date().toISOString(),
      engine,
      result,
      confidence,
      durationMs,
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getAll(): PortfolioTimelineEntry[] {
    return [...this.entries];
  }

  getByEngine(engine: string): PortfolioTimelineEntry[] {
    return this.entries.filter((e) => e.engine === engine);
  }

  getRecent(count = 30): PortfolioTimelineEntry[] {
    return this.entries.slice(-count);
  }

  clear(): void {
    this.entries = [];
  }

  get size(): number {
    return this.entries.length;
  }
}
