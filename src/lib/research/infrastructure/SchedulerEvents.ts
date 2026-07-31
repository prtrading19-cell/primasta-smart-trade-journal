import type { SchedulerEvent, SchedulerEventType, SchedulerEventHandler } from "./types";

export class SchedulerEvents {
  private handlers = new Map<SchedulerEventType, SchedulerEventHandler[]>();

  on(type: SchedulerEventType, handler: SchedulerEventHandler): void {
    const existing = this.handlers.get(type) ?? [];
    existing.push(handler);
    this.handlers.set(type, existing);
  }

  off(type: SchedulerEventType, handler: SchedulerEventHandler): void {
    const existing = this.handlers.get(type) ?? [];
    this.handlers.set(
      type,
      existing.filter((h) => h !== handler)
    );
  }

  emit(event: SchedulerEvent): void {
    const handlers = this.handlers.get(event.type) ?? [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch {
        // Silently ignore handler errors
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
