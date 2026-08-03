import type {
  BrokerAccount,
  BrokerHealth,
  BrokerOrderModify,
  BrokerOrderRequest,
  BrokerOrderResponse,
  BrokerPosition,
} from "./types";

export class PaperBrokerAdapter {
  readonly id = "paper";
  readonly name = "Paper Broker";
  readonly mode: "paper" | "simulation" = "paper";

  private connected = false;
  private positions: BrokerPosition[] = [];
  private account: BrokerAccount = {
    id: "paper-account",
    name: "Paper Account",
    balance: 100000,
    equity: 100000,
    marginUsed: 0,
    currency: "USD",
    mode: "paper",
  };

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async placeOrder(request: BrokerOrderRequest): Promise<BrokerOrderResponse> {
    if (!this.connected) await this.connect();
    const brokerOrderId = `paper-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const fillPrice = request.entry ?? 100;
    if (request.direction !== "flat") {
      this.positions.push({
        id: brokerOrderId,
        symbol: request.symbol,
        direction: request.direction,
        lotSize: request.lotSize,
        entryPrice: fillPrice,
        openTime: new Date().toISOString(),
        unrealizedPnl: 0,
      });
    }
    return {
      brokerOrderId,
      status: "filled",
      fillPrice,
      message: "Simulated paper fill",
    };
  }

  async modifyOrder(brokerOrderId: string, changes: BrokerOrderModify): Promise<BrokerOrderResponse> {
    const pos = this.positions.find((p) => p.id === brokerOrderId);
    if (!pos) {
      return { brokerOrderId, status: "failed", message: "Position not found" };
    }
    if (changes.lotSize != null) pos.lotSize = changes.lotSize;
    return { brokerOrderId, status: "filled", message: "Modified in paper mode" };
  }

  async closeOrder(brokerOrderId: string): Promise<BrokerOrderResponse> {
    this.positions = this.positions.filter((p) => p.id !== brokerOrderId);
    return { brokerOrderId, status: "filled", message: "Closed in paper mode" };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    return [...this.positions];
  }

  async getAccount(): Promise<BrokerAccount> {
    return { ...this.account };
  }

  async health(): Promise<BrokerHealth> {
    return {
      status: "healthy",
      latencyMs: 8,
      lastChecked: new Date().toISOString(),
      error: null,
    };
  }

  get isConnected(): boolean {
    return this.connected;
  }
}
