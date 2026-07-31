import type { RefreshQueueItem, RefreshPriority } from "./types";

const PRIORITY_ORDER: Record<RefreshPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export class RefreshQueue {
  private items: RefreshQueueItem[] = [];
  private maxConcurrency: number;

  constructor(maxConcurrency = 6) {
    this.maxConcurrency = maxConcurrency;
  }

  enqueue(type: "provider" | "asset", targetId: string, priority: RefreshPriority = "normal"): RefreshQueueItem {
    const existing = this.items.find(
      (i) => i.type === type && i.targetId === targetId && i.completedAt === null
    );
    if (existing) return existing;

    const item: RefreshQueueItem = {
      id: `${type}-${targetId}-${Date.now()}`,
      type,
      targetId,
      priority,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      error: null,
    };
    this.items.push(item);
    this.items.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    return item;
  }

  dequeue(): RefreshQueueItem | null {
    const activeCount = this.items.filter((i) => i.startedAt && !i.completedAt).length;
    if (activeCount >= this.maxConcurrency) return null;

    const next = this.items.find((i) => !i.startedAt);
    if (!next) return null;

    next.startedAt = Date.now();
    return next;
  }

  complete(id: string, error?: string): void {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    item.completedAt = Date.now();
    item.error = error ?? null;
  }

  remove(id: string): void {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx >= 0) this.items.splice(idx, 1);
  }

  clear(): void {
    this.items = [];
  }

  get size(): number {
    return this.items.length;
  }

  get pending(): number {
    return this.items.filter((i) => !i.startedAt).length;
  }

  get active(): number {
    return this.items.filter((i) => i.startedAt && !i.completedAt).length;
  }

  get all(): RefreshQueueItem[] {
    return [...this.items];
  }

  hasPending(targetId: string): boolean {
    return this.items.some((i) => i.targetId === targetId && !i.completedAt);
  }

  getByTarget(targetId: string): RefreshQueueItem | undefined {
    return this.items.find((i) => i.targetId === targetId && !i.completedAt);
  }
}
