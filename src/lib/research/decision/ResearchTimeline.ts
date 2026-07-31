import type { TimelineEntry } from "./types";

export class ResearchTimeline {
  private entries: TimelineEntry[] = [];
  private maxEntries = 1000;

  add(engine: string, result: string, confidence: number, durationMs: number): TimelineEntry {
    const entry: TimelineEntry = {
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

  getAll(): TimelineEntry[] {
    return [...this.entries];
  }

  getByEngine(engine: string): TimelineEntry[] {
    return this.entries.filter((e) => e.engine === engine);
  }

  getRecent(count = 20): TimelineEntry[] {
    return this.entries.slice(-count);
  }

  clear(): void {
    this.entries = [];
  }

  get size(): number {
    return this.entries.length;
  }
}
