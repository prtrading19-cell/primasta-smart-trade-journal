import type {
  BrokerAccount,
  BrokerHealth,
  BrokerOrderModify,
  BrokerOrderRequest,
  BrokerOrderResponse,
  BrokerPosition,
} from "@/lib/trading";
import type {
  Mt5AccountInfo,
  Mt5CloseRequest,
  Mt5Deal,
  Mt5GatewayResponse,
  Mt5ModifyRequest,
  Mt5Order,
  Mt5OrderType,
  Mt5PlaceRequest,
  Mt5Position,
  Mt5RawResult,
} from "./types";
import { MT5_BROKER_ID, MT5_BROKER_NAME } from "./config";
import { getMt5BrokerManager, type Mt5BrokerManager } from "./Mt5BrokerManager";
import { getMt5Logger } from "./Mt5Logger";

export interface Mt5Subscription {
  id: string;
  kind: "ticks" | "orders" | "positions" | "account";
  unsubscribe(): void;
}

export interface Mt5History {
  closedOrders: Mt5Order[];
  deals: Mt5Deal[];
}

export class Mt5Adapter {
  readonly id: string = MT5_BROKER_ID;
  readonly name: string = MT5_BROKER_NAME;
  readonly mode: "live" = "live";

  private manager: Mt5BrokerManager;

  constructor(manager?: Mt5BrokerManager) {
    this.manager = manager ?? getMt5BrokerManager();
  }

  getManager(): Mt5BrokerManager {
    return this.manager;
  }

  /* ── Connection ── */

  async connect(): Promise<void> {
    await this.manager.connect();
  }

  async disconnect(): Promise<void> {
    await this.manager.disconnect();
  }

  isConnected(): boolean {
    return this.manager.isConnected();
  }

  /* ── Account ── */

  async getAccountInfo(): Promise<Mt5GatewayResponse<Mt5AccountInfo>> {
    return this.manager.getGateway().getAccountInfo();
  }

  async getAccount(): Promise<BrokerAccount> {
    const state = this.manager.getOverview().account;
    const account = state.latest;
    if (!account) {
      return {
        id: `${MT5_BROKER_ID}-unavailable`,
        name: `${MT5_BROKER_NAME} (Unavailable)`,
        balance: 0,
        equity: 0,
        marginUsed: 0,
        currency: "USD",
        mode: "live",
      };
    }
    return {
      id: `${MT5_BROKER_ID}-${account.login ?? "account"}`,
      name: account.name || MT5_BROKER_NAME,
      balance: account.balance,
      equity: account.equity,
      marginUsed: account.margin,
      currency: account.currency,
      mode: "live",
    };
  }

  /* ── Positions & Orders & History ── */

  async getPositions(): Promise<BrokerPosition[]> {
    const state = this.manager.getOverview().positions;
    return state.positions.map((p) => ({
      id: String(p.ticket),
      symbol: p.symbol,
      direction: p.type === "buy" ? "buy" : "sell",
      lotSize: p.volume,
      entryPrice: p.priceOpen,
      openTime: p.openTime,
      unrealizedPnl: p.profit + p.swap,
    }));
  }

  async getMt5Positions(): Promise<Mt5Position[]> {
    return this.manager.getOverview().positions.positions;
  }

  async getMt5Orders(): Promise<Mt5Order[]> {
    const state = this.manager.getOverview().positions;
    return [...state.pendingOrders, ...state.closedOrders];
  }

  async getOrders(): Promise<Mt5Order[]> {
    const state = this.manager.getOverview().positions;
    return [...state.pendingOrders];
  }

  async getHistory(): Promise<Mt5History> {
    const state = this.manager.getOverview().positions;
    return {
      closedOrders: state.closedOrders,
      deals: state.deals,
    };
  }

  /* ── Order lifecycle ── */

  async placeOrder(request: BrokerOrderRequest): Promise<BrokerOrderResponse> {
    const type = mapOrderType(request.direction, request.orderType);
    const submit = await this.manager.submitOrder({
      request: {
        symbol: request.symbol,
        type,
        volume: request.lotSize,
        price: request.entry ?? null,
        sl: request.stop ?? null,
        tp: request.takeProfit ?? null,
      },
      signalId: null,
      source: "research",
    });

    if (!submit.created || !submit.proposal) {
      return {
        brokerOrderId: `${MT5_BROKER_ID}-error`,
        status: "failed",
        message: submit.error ?? "MT5 order submission failed",
      };
    }

    return {
      brokerOrderId: submit.proposal.id,
      status: "rejected",
      message: `MT5 order pending manual approval (${submit.proposal.id}) — not transmitted`,
    };
  }

  async submitMt5Order(request: Partial<Mt5PlaceRequest> & { symbol: string }): Promise<Mt5RawResult> {
    const submit = await this.manager.submitOrder({ request });
    if (!submit.created || !submit.proposal) {
      return {
        ticket: null,
        price: null,
        message: "Submission failed",
        error: submit.error ?? "Unknown submission error",
      };
    }
    return {
      ticket: null,
      price: null,
      message: `Trade proposal ${submit.proposal.id} created — pending manual approval`,
      error: null,
    };
  }

  async modifyOrder(brokerOrderId: string, changes: BrokerOrderModify): Promise<BrokerOrderResponse> {
    const ticket = Number(brokerOrderId);
    if (!Number.isFinite(ticket)) {
      return { brokerOrderId, status: "failed", message: "Invalid MT5 ticket" };
    }
    if (!this.isConnected()) {
      return { brokerOrderId, status: "rejected", message: "MT5 gateway not connected — order modification not sent" };
    }
    const req: Mt5ModifyRequest = {
      ticket,
      sl: changes.stop ?? null,
      tp: changes.takeProfit ?? null,
    };
    const result = await this.manager.getGateway().modifyOrder(req);
    if (result.ok && result.data && result.data.ticket != null) {
      return { brokerOrderId: String(result.data.ticket), status: "filled", message: result.data.message };
    }
    return { brokerOrderId, status: "rejected", message: result.error ?? "MT5 modification rejected" };
  }

  async closePosition(ticket: number, volume?: number): Promise<Mt5RawResult> {
    const req: Mt5CloseRequest = { ticket, volume };
    if (!this.isConnected()) {
      return { ticket: null, price: null, message: "Unavailable", error: "MT5 gateway is not connected" };
    }
    const result = await this.manager.getGateway().closePosition(req);
    return result.data ?? { ticket: null, price: null, message: result.error ?? "Close failed", error: result.error };
  }

  async closeOrder(brokerOrderId: string): Promise<BrokerOrderResponse> {
    const ticket = Number(brokerOrderId);
    if (!Number.isFinite(ticket)) {
      return { brokerOrderId, status: "failed", message: "Invalid MT5 ticket" };
    }
    const result = await this.closePosition(ticket);
    if (result.ticket != null) {
      return { brokerOrderId: String(result.ticket), status: "filled", message: result.message };
    }
    return { brokerOrderId, status: "rejected", message: result.error ?? "MT5 close rejected" };
  }

  async cancelOrder(ticket: number): Promise<Mt5RawResult> {
    if (!this.isConnected()) {
      return { ticket: null, price: null, message: "Unavailable", error: "MT5 gateway is not connected" };
    }
    const result = await this.manager.getGateway().cancelOrder(ticket);
    return result.data ?? { ticket: null, price: null, message: result.error ?? "Cancel failed", error: result.error };
  }

  /* ── Subscriptions (wired once a live gateway stream exists) ── */

  subscribeTicks(symbol: string, callback: (tick: unknown) => void): Mt5Subscription {
    return this.subscribe("ticks", { symbol, callback });
  }

  subscribeOrders(callback: (orders: Mt5Order[]) => void): Mt5Subscription {
    return this.subscribe("orders", { callback });
  }

  subscribePositions(callback: (positions: Mt5Position[]) => void): Mt5Subscription {
    return this.subscribe("positions", { callback });
  }

  subscribeAccount(callback: (account: Mt5AccountInfo | null) => void): Mt5Subscription {
    return this.subscribe("account", { callback });
  }

  private subscribe(
    kind: Mt5Subscription["kind"],
    spec: Record<string, unknown>
  ): Mt5Subscription {
    const id = `mt5-sub-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    getMt5Logger().log(
      "gateway",
      `Subscription requested: ${kind}`,
      "Stream subscription registered — delivery requires a connected MT5 gateway",
      { subscriptionId: id, kind }
    );
    return {
      id,
      kind,
      unsubscribe: () => {
        getMt5Logger().log("gateway", `Subscription cancelled: ${kind}`, undefined, { subscriptionId: id });
      },
    };
  }

  /* ── Health ── */

  async health(): Promise<BrokerHealth> {
    const record = this.manager.getHealth();
    const status: BrokerHealth["status"] =
      record.status === "healthy" ? "healthy" : record.status === "degraded" ? "degraded" : "down";
    return {
      status,
      latencyMs: record.latency.lastMs ?? -1,
      lastChecked: new Date().toISOString(),
      error: record.lastErrorMessage,
    };
  }
}

function mapOrderType(
  direction: BrokerOrderRequest["direction"],
  orderType?: BrokerOrderRequest["orderType"]
): Mt5OrderType {
  if (orderType === "LIMIT") return direction === "sell" ? "sell-limit" : "buy-limit";
  if (orderType === "STOP") return direction === "sell" ? "sell-stop" : "buy-stop";
  return direction === "sell" ? "sell" : "buy";
}
