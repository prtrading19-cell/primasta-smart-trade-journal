import type { ExecutionTimelineEntry } from "./types";

export class ExecutionTimeline {
  private entries: ExecutionTimelineEntry[] = [];
  private maxEntries = 500;

  add(
    type: string,
    detail: string,
    signalId?: string,
    orderId?: string
  ): ExecutionTimelineEntry {
    const entry: ExecutionTimelineEntry = {
      timestamp: new Date().toISOString(),
      type,
      detail,
      signalId,
      orderId,
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getAll(): ExecutionTimelineEntry[] {
    return [...this.entries];
  }

  getRecent(count = 50): ExecutionTimelineEntry[] {
    return this.entries.slice(-count);
  }

  getBySignal(signalId: string): ExecutionTimelineEntry[] {
    return this.entries.filter((e) => e.signalId === signalId);
  }

  getByOrder(orderId: string): ExecutionTimelineEntry[] {
    return this.entries.filter((e) => e.orderId === orderId);
  }

  clear(): void {
    this.entries = [];
  }

  get size(): number {
    return this.entries.length;
  }
}
