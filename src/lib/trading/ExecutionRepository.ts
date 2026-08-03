import type {
  BrokerAccount,
  BrokerHealth,
  BrokerPosition,
  ExecutionEvent,
  ExecutionRecord,
  ExecutionStatus,
} from "./types";
import { ExecutionHistory } from "./ExecutionHistory";
import { ExecutionTimeline } from "./ExecutionTimeline";

export class ExecutionRepository {
  private records = new Map<string, ExecutionRecord>();
  private maxRecords = 500;

  constructor(
    private history: ExecutionHistory,
    private timeline: ExecutionTimeline
  ) {}

  save(record: ExecutionRecord): void {
    this.records.set(record.id, record);
    if (this.records.size > this.maxRecords) {
      const oldestKey = this.records.keys().next().value;
      if (oldestKey) this.records.delete(oldestKey);
    }
  }

  get(id: string): ExecutionRecord | null {
    return this.records.get(id) ?? null;
  }

  all(): ExecutionRecord[] {
    return [...this.records.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  getByStatus(status: ExecutionStatus): ExecutionRecord[] {
    return this.all().filter((r) => r.status === status);
  }

  getByAsset(assetId: string): ExecutionRecord[] {
    return this.all().filter((r) => r.assetId === assetId);
  }

  getBySignal(signalId: string): ExecutionRecord[] {
    return this.all().filter((r) => r.signalId === signalId);
  }

  updateStatus(id: string, status: ExecutionStatus, detail: string): ExecutionRecord | null {
    const record = this.records.get(id);
    if (!record) return null;
    record.status = status;
    record.updatedAt = new Date().toISOString();
    record.events.push(this.event(status, detail));
    this.save(record);
    return record;
  }

  appendEvent(id: string, type: string, detail: string): ExecutionRecord | null {
    const record = this.records.get(id);
    if (!record) return null;
    record.events.push(this.event(type, detail));
    record.updatedAt = new Date().toISOString();
    this.save(record);
    return record;
  }

  private event(type: string, detail: string): ExecutionEvent {
    return {
      type,
      status: type as ExecutionStatus,
      timestamp: new Date().toISOString(),
      detail,
    };
  }

  count(): number {
    return this.records.size;
  }

  clear(): void {
    this.records.clear();
  }

  get accountBalanceFallback(): number {
    return 100000;
  }
}

export type { BrokerAccount, BrokerHealth, BrokerPosition };
