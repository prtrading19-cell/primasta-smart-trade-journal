import type {
  BrokerAccount,
  BrokerAdapter,
  BrokerHealth,
  BrokerOrderModify,
  BrokerOrderRequest,
  BrokerOrderResponse,
  BrokerPosition,
  ExecutionMode,
} from "./types";
import { BrokerRegistry } from "./BrokerRegistry";

export interface BrokerConnectionState {
  brokerId: string;
  connected: boolean;
  connectedAt: string | null;
}

export class BrokerManager {
  private registry: BrokerRegistry;
  private connections = new Map<string, BrokerConnectionState>();
  private activeBrokerId: string | null = null;

  constructor(registry?: BrokerRegistry) {
    this.registry = registry ?? new BrokerRegistry();
  }

  getRegistry(): BrokerRegistry {
    return this.registry;
  }

  register(adapter: BrokerAdapter): void {
    this.registry.register(adapter);
  }

  async connect(brokerId: string): Promise<boolean> {
    const adapter = this.registry.get(brokerId);
    if (!adapter) return false;
    try {
      await adapter.connect();
      this.connections.set(brokerId, {
        brokerId,
        connected: true,
        connectedAt: new Date().toISOString(),
      });
      if (!this.activeBrokerId) this.activeBrokerId = brokerId;
      return true;
    } catch {
      this.connections.set(brokerId, { brokerId, connected: false, connectedAt: null });
      return false;
    }
  }

  async disconnect(brokerId: string): Promise<void> {
    const adapter = this.registry.get(brokerId);
    if (adapter) await adapter.disconnect();
    this.connections.set(brokerId, { brokerId, connected: false, connectedAt: null });
    if (this.activeBrokerId === brokerId) this.activeBrokerId = null;
  }

  setActive(brokerId: string): boolean {
    if (!this.registry.has(brokerId)) return false;
    this.activeBrokerId = brokerId;
    return true;
  }

  getActive(): BrokerAdapter | null {
    return this.activeBrokerId ? this.registry.get(this.activeBrokerId) : null;
  }

  async placeOrder(request: BrokerOrderRequest): Promise<BrokerOrderResponse> {
    const adapter = this.resolveBroker(request.mode);
    return adapter.placeOrder(request);
  }

  async modifyOrder(brokerOrderId: string, changes: BrokerOrderModify): Promise<BrokerOrderResponse> {
    const adapter = this.resolveBroker("paper");
    return adapter.modifyOrder(brokerOrderId, changes);
  }

  async closeOrder(brokerOrderId: string): Promise<BrokerOrderResponse> {
    const adapter = this.resolveBroker("paper");
    return adapter.closeOrder(brokerOrderId);
  }

  async getPositions(): Promise<BrokerPosition[]> {
    const adapter = this.resolveBroker("paper");
    return adapter.getPositions();
  }

  async getAccount(): Promise<BrokerAccount> {
    const adapter = this.resolveBroker("paper");
    return adapter.getAccount();
  }

  async health(brokerId?: string): Promise<BrokerHealth> {
    const adapter = brokerId ? this.registry.get(brokerId) : this.resolveBroker("paper");
    if (!adapter) {
      return {
        status: "down",
        latencyMs: -1,
        lastChecked: new Date().toISOString(),
        error: "Broker not registered",
      };
    }
    return adapter.health();
  }

  async healthAll(): Promise<Record<string, BrokerHealth>> {
    const out: Record<string, BrokerHealth> = {};
    for (const adapter of this.registry.list()) {
      out[adapter.id] = await adapter.health();
    }
    return out;
  }

  connectionState(brokerId: string): BrokerConnectionState {
    return (
      this.connections.get(brokerId) ?? {
        brokerId,
        connected: false,
        connectedAt: null,
      }
    );
  }

  connectionStates(): BrokerConnectionState[] {
    return this.registry
      .list()
      .map((b) => this.connectionState(b.id));
  }

  private resolveBroker(mode: ExecutionMode): BrokerAdapter {
    const preferred = this.getActive();
    if (preferred && preferred.mode === mode) return preferred;
    const byMode = this.registry.getByMode(mode);
    const target = byMode[0] ?? this.registry.getByMode("paper")[0];
    if (target) return target;
    throw new Error("No broker registered for mode: " + mode);
  }
}
