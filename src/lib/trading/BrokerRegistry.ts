import type { BrokerAdapter, BrokerType, ExecutionMode } from "./types";
import type { PaperBrokerAdapter } from "./PaperBrokerAdapter";

export interface BrokerRegistration {
  adapter: BrokerAdapter;
  registeredAt: string;
}

export class BrokerRegistry {
  private brokers = new Map<string, BrokerRegistration>();

  register(adapter: BrokerAdapter): void {
    this.brokers.set(adapter.id, { adapter, registeredAt: new Date().toISOString() });
  }

  get(id: string): BrokerAdapter | null {
    return this.brokers.get(id)?.adapter ?? null;
  }

  list(): BrokerAdapter[] {
    return [...this.brokers.values()].map((r) => r.adapter);
  }

  getByMode(mode: ExecutionMode): BrokerAdapter[] {
    return this.list().filter((b) => b.mode === mode);
  }

  getDefault(mode: ExecutionMode): BrokerAdapter | null {
    return this.getByMode(mode)[0] ?? null;
  }

  unregister(id: string): boolean {
    return this.brokers.delete(id);
  }

  has(id: string): boolean {
    return this.brokers.has(id);
  }

  get size(): number {
    return this.brokers.size;
  }

  registerPaper(paper: PaperBrokerAdapter): BrokerAdapter {
    this.register(paper);
    return paper;
  }

  supportsType(type: BrokerType): boolean {
    return [...this.brokers.values()].some((r) => r.adapter.name.toLowerCase().includes(type));
  }
}
