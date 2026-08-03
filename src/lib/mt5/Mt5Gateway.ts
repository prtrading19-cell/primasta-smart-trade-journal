import type {
  Mt5AccountInfo,
  Mt5CloseRequest,
  Mt5Deal,
  Mt5GatewayResponse,
  Mt5ModifyRequest,
  Mt5Order,
  Mt5PlaceRequest,
  Mt5Position,
  Mt5RawResult,
} from "./types";
import { getMt5Config } from "./config";
import { Mt5PythonGatewayTransport } from "./PythonGatewayTransport";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

/**
 * A transport is the concrete link between the gateway and a live
 * MetaTrader 5 terminal. It may later be backed by:
 *   - a local MT5 bridge (terminal plugin / DLL)
 *   - a Python MetaTrader5 service
 *   - a Windows service
 *   - a Docker container
 * The gateway is decoupled from the adapter: adapters talk to the gateway,
 * and the gateway talks to a swappable transport.
 */
export interface Mt5GatewayTransport {
  readonly id: string;
  readonly label: string;
  readonly available: boolean;
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  isConnected(): boolean;
  accountInfo(): Promise<Mt5AccountInfo | null>;
  positions(): Promise<Mt5Position[]>;
  orders(): Promise<Mt5Order[]>;
  historyOrders(): Promise<Mt5Order[]>;
  deals(): Promise<Mt5Deal[]>;
  placeOrder(request: Mt5PlaceRequest): Promise<Mt5RawResult>;
  modifyOrder(request: Mt5ModifyRequest): Promise<Mt5RawResult>;
  closePosition(request: Mt5CloseRequest): Promise<Mt5RawResult>;
  cancelOrder(ticket: number): Promise<Mt5RawResult>;
  ping(): Promise<number>;
}

export class Mt5UnavailableTransport implements Mt5GatewayTransport {
  readonly id = "unavailable";
  readonly label = "No MT5 gateway configured";
  readonly available = false;

  async connect(): Promise<boolean> {
    return false;
  }

  async disconnect(): Promise<boolean> {
    return true;
  }

  isConnected(): boolean {
    return false;
  }

  async accountInfo(): Promise<Mt5AccountInfo | null> {
    return null;
  }

  async positions(): Promise<Mt5Position[]> {
    return [];
  }

  async orders(): Promise<Mt5Order[]> {
    return [];
  }

  async historyOrders(): Promise<Mt5Order[]> {
    return [];
  }

  async deals(): Promise<Mt5Deal[]> {
    return [];
  }

  async placeOrder(): Promise<Mt5RawResult> {
    return { ticket: null, price: null, message: "Unavailable", error: "MT5 gateway is not connected" };
  }

  async modifyOrder(): Promise<Mt5RawResult> {
    return { ticket: null, price: null, message: "Unavailable", error: "MT5 gateway is not connected" };
  }

  async closePosition(): Promise<Mt5RawResult> {
    return { ticket: null, price: null, message: "Unavailable", error: "MT5 gateway is not connected" };
  }

  async cancelOrder(): Promise<Mt5RawResult> {
    return { ticket: null, price: null, message: "Unavailable", error: "MT5 gateway is not connected" };
  }

  async ping(): Promise<number> {
    return -1;
  }
}

export class Mt5Gateway {
  private transport: Mt5GatewayTransport;

  constructor(transport: Mt5GatewayTransport = new Mt5UnavailableTransport()) {
    this.transport = transport;
  }

  registerTransport(transport: Mt5GatewayTransport): void {
    this.transport = transport;
  }

  getTransport(): Mt5GatewayTransport {
    return this.transport;
  }

  getTransportSummary(): { transportId: string; label: string; available: boolean } {
    return {
      transportId: this.transport.id,
      label: this.transport.label,
      available: this.transport.available,
    };
  }

  async connect(): Promise<boolean> {
    if (!this.transport.available) return false;
    try {
      return await this.transport.connect();
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      await this.transport.disconnect();
    } catch {
      /* best effort */
    }
    return true;
  }

  isConnected(): boolean {
    return this.transport.isConnected();
  }

  private unavailable<T>(method: string): Mt5GatewayResponse<T> {
    return {
      ok: false,
      available: false,
      data: null,
      error: `MT5 gateway is not connected (${method})`,
      at: new Date().toISOString(),
    };
  }

  async getAccountInfo(): Promise<Mt5GatewayResponse<Mt5AccountInfo>> {
    if (!this.isConnected()) return this.unavailable("accountInfo");
    try {
      const data = await this.transport.accountInfo();
      if (!data) {
        return { ok: false, available: true, data: null, error: "MT5 gateway returned no account info", at: new Date().toISOString() };
      }
      return { ok: true, available: true, data, error: null, at: new Date().toISOString() };
    } catch (err) {
      return {
        ok: false,
        available: true,
        data: null,
        error: err instanceof Error ? err.message : "Unknown gateway error",
        at: new Date().toISOString(),
      };
    }
  }

  async getPositions(): Promise<Mt5GatewayResponse<Mt5Position[]>> {
    if (!this.isConnected()) return this.unavailable("positions");
    try {
      return { ok: true, available: true, data: await this.transport.positions(), error: null, at: new Date().toISOString() };
    } catch (err) {
      return {
        ok: false,
        available: true,
        data: null,
        error: err instanceof Error ? err.message : "Unknown gateway error",
        at: new Date().toISOString(),
      };
    }
  }

  async getOrders(): Promise<Mt5GatewayResponse<Mt5Order[]>> {
    if (!this.isConnected()) return this.unavailable("orders");
    try {
      return { ok: true, available: true, data: await this.transport.orders(), error: null, at: new Date().toISOString() };
    } catch (err) {
      return {
        ok: false,
        available: true,
        data: null,
        error: err instanceof Error ? err.message : "Unknown gateway error",
        at: new Date().toISOString(),
      };
    }
  }

  async getHistoryOrders(): Promise<Mt5GatewayResponse<Mt5Order[]>> {
    if (!this.isConnected()) return this.unavailable("historyOrders");
    try {
      return { ok: true, available: true, data: await this.transport.historyOrders(), error: null, at: new Date().toISOString() };
    } catch (err) {
      return {
        ok: false,
        available: true,
        data: null,
        error: err instanceof Error ? err.message : "Unknown gateway error",
        at: new Date().toISOString(),
      };
    }
  }

  async getDeals(): Promise<Mt5GatewayResponse<Mt5Deal[]>> {
    if (!this.isConnected()) return this.unavailable("deals");
    try {
      return { ok: true, available: true, data: await this.transport.deals(), error: null, at: new Date().toISOString() };
    } catch (err) {
      return {
        ok: false,
        available: true,
        data: null,
        error: err instanceof Error ? err.message : "Unknown gateway error",
        at: new Date().toISOString(),
      };
    }
  }

  async placeOrder(request: Mt5PlaceRequest): Promise<Mt5GatewayResponse<Mt5RawResult>> {
    if (!this.isConnected()) return this.unavailable("placeOrder");
    try {
      const data = await this.transport.placeOrder(request);
      return { ok: data.error == null, available: true, data, error: data.error, at: new Date().toISOString() };
    } catch (err) {
      return {
        ok: false,
        available: true,
        data: null,
        error: err instanceof Error ? err.message : "Unknown gateway error",
        at: new Date().toISOString(),
      };
    }
  }

  async modifyOrder(request: Mt5ModifyRequest): Promise<Mt5GatewayResponse<Mt5RawResult>> {
    if (!this.isConnected()) return this.unavailable("modifyOrder");
    try {
      const data = await this.transport.modifyOrder(request);
      return { ok: data.error == null, available: true, data, error: data.error, at: new Date().toISOString() };
    } catch (err) {
      return {
        ok: false,
        available: true,
        data: null,
        error: err instanceof Error ? err.message : "Unknown gateway error",
        at: new Date().toISOString(),
      };
    }
  }

  async closePosition(request: Mt5CloseRequest): Promise<Mt5GatewayResponse<Mt5RawResult>> {
    if (!this.isConnected()) return this.unavailable("closePosition");
    try {
      const data = await this.transport.closePosition(request);
      return { ok: data.error == null, available: true, data, error: data.error, at: new Date().toISOString() };
    } catch (err) {
      return {
        ok: false,
        available: true,
        data: null,
        error: err instanceof Error ? err.message : "Unknown gateway error",
        at: new Date().toISOString(),
      };
    }
  }

  async cancelOrder(ticket: number): Promise<Mt5GatewayResponse<Mt5RawResult>> {
    if (!this.isConnected()) return this.unavailable("cancelOrder");
    try {
      const data = await this.transport.cancelOrder(ticket);
      return { ok: data.error == null, available: true, data, error: data.error, at: new Date().toISOString() };
    } catch (err) {
      return {
        ok: false,
        available: true,
        data: null,
        error: err instanceof Error ? err.message : "Unknown gateway error",
        at: new Date().toISOString(),
      };
    }
  }

  async ping(): Promise<number> {
    try {
      return await this.transport.ping();
    } catch {
      return -1;
    }
  }
}

export function getMt5Gateway(): Mt5Gateway {
  return getSharedSingleton("Mt5Gateway", () => {
    const gateway = new Mt5Gateway();
    const config = getMt5Config();
    if (config.gatewayTransport === "python") {
      // Secure Python MT5 gateway (FastAPI + MetaTrader5 package) running on
      // the loopback interface. See mt5-gateway/ for the service source.
      gateway.registerTransport(new Mt5PythonGatewayTransport(config));
    } else if (config.gatewayTransport !== "unavailable") {
      // Future secure transports (bridge / windows / docker) are registered
      // here. Until one is configured the unavailable transport remains
      // active and every gateway call returns "Unavailable".
      gateway.registerTransport(new Mt5UnavailableTransport());
    }
    return gateway;
  });
}
