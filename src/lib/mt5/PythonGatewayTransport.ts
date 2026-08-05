import type {
  Mt5AccountInfo,
  Mt5CloseRequest,
  Mt5Deal,
  Mt5ModifyRequest,
  Mt5Order,
  Mt5PlaceRequest,
  Mt5Position,
  Mt5RawResult,
  Mt5Symbol,
  Mt5SymbolSpec,
  Mt5Tick,
} from "./types";
import type { Mt5ConnectOptions, Mt5ConnectOutcome } from "./accountTypes";
import type { Mt5CalcMarginInput, Mt5CalcProfitInput, Mt5CalcResult, Mt5GatewayTransport } from "./Mt5Gateway";
import type { Mt5Config } from "./config";

/**
 * Default localhost address of the Python gateway service
 * (see mt5-gateway/app/main.py). Override with MT5_GATEWAY_URL.
 */
const DEFAULT_GATEWAY_URL = "http://127.0.0.1:8765";

const MAX_RECONNECT_ATTEMPTS = 12;
const RECONNECT_DELAY_MS = 4000;

interface Mt5GatewayEnvelope {
  ok: boolean;
  data: Record<string, unknown> | null;
  error: string | null;
  message: string | null;
}

/**
 * Talks to the local Python MT5 gateway (FastAPI + MetaTrader5 package)
 * over HTTP on the loopback interface. Credentials are read server-side from
 * env and sent to the gateway on connect; they never reach the browser.
 *
 * Connection monitoring: every `ping()` probes the gateway heartbeat and
 * updates the internal connected state. If the terminal drops, an automatic
 * reconnect (with bounded attempts) is scheduled so the next heartbeat can
 * restore the session without operator action.
 */
export class Mt5PythonGatewayTransport implements Mt5GatewayTransport {
  readonly id = "python";
  readonly label = "Python MT5 Gateway (FastAPI)";
  readonly available: boolean;

  private readonly baseUrl: string;
  private readonly config: Mt5Config;
  private connected = false;
  private lastError: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private activeAccountId: string | null = null;

  constructor(config: Mt5Config) {
    this.config = config;
    this.baseUrl = (config.gatewayUrl ?? DEFAULT_GATEWAY_URL).replace(/\/+$/, "");
    this.available = config.gatewayTransport === "python";
  }

  getLastError(): string | null {
    return this.lastError;
  }

  async connectWith(options: Mt5ConnectOptions): Promise<Mt5ConnectOutcome> {
    if (!this.available) {
      return { ok: false, message: "No live MT5 gateway configured", error: "No live MT5 gateway configured", data: null };
    }
    const res = await this.request(
      "POST",
      "/connect",
      {
        account_id: options.accountId ?? null,
        login: options.login ?? null,
        password: options.password ?? null,
        investor_password: options.investorPassword ?? null,
        server: options.server ?? null,
        terminal_path: options.terminalPath ?? null,
        remember: options.remember ?? null,
        name: options.name ?? null,
        read_only: options.readOnly ?? null,
        auto_connect: options.autoConnect ?? null,
        demo: options.demo ?? null,
        trade_mode: options.tradeMode ?? null,
        magic: options.magic ?? null,
        deviation: options.deviation ?? null,
      },
      45000
    );
    const data = (res.data ?? {}) as { connected?: boolean; activeAccountId?: string | null; login?: number | null; server?: string | null };
    const connected = res.ok && data.connected === true;
    this.connected = connected;
    if (connected) {
      this.activeAccountId = data.activeAccountId ?? options.accountId ?? null;
      this.lastError = null;
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
    } else {
      this.lastError = res.error ?? res.message ?? "MT5 connect failed";
    }
    return { ok: connected, message: res.message, error: res.error, data: res.data };
  }

  getActiveAccountId(): string | null {
    return this.activeAccountId;
  }

  async connect(): Promise<boolean> {
    if (!this.available) return false;
    const res = await this.request(
      "POST",
      "/connect",
      {
        login: this.config.login,
        password: this.config.password,
        investor_password: this.config.investorPassword,
        server: this.config.server,
        terminal_path: this.config.terminalPath,
        magic: this.config.magic,
        deviation: this.config.defaultDeviation,
      },
      30000
    );
    const connected = res.ok && (res.data as { connected?: boolean } | null)?.connected === true;
    this.connected = connected;
    if (connected) {
      this.activeAccountId = (res.data as { activeAccountId?: string | null } | null)?.activeAccountId ?? null;
      this.lastError = null;
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
    } else {
      this.lastError = res.error ?? res.message ?? "MT5 connect failed";
    }
    return connected;
  }

  async disconnect(): Promise<boolean> {
    this.connected = false;
    this.activeAccountId = null;
    this.clearReconnectTimer();
    await this.request("POST", "/disconnect", {});
    return true;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async accountInfo(): Promise<Mt5AccountInfo | null> {
    const res = await this.request("GET", "/account");
    if (!res.ok || !res.data) return null;
    return (res.data as { account?: Mt5AccountInfo }).account ?? null;
  }

  async positions(): Promise<Mt5Position[]> {
    const res = await this.request("GET", "/positions");
    if (!res.ok || !res.data) return [];
    return (res.data as { positions?: Mt5Position[] }).positions ?? [];
  }

  async orders(): Promise<Mt5Order[]> {
    const res = await this.request("GET", "/orders");
    if (!res.ok || !res.data) return [];
    return (res.data as { orders?: Mt5Order[] }).orders ?? [];
  }

  async historyOrders(): Promise<Mt5Order[]> {
    const res = await this.request("GET", "/history");
    if (!res.ok || !res.data) return [];
    return (res.data as { orders?: Mt5Order[] }).orders ?? [];
  }

  async deals(): Promise<Mt5Deal[]> {
    const res = await this.request("GET", "/history");
    if (!res.ok || !res.data) return [];
    return (res.data as { deals?: Mt5Deal[] }).deals ?? [];
  }

  async placeOrder(request: Mt5PlaceRequest): Promise<Mt5RawResult> {
    const res = await this.request(
      "POST",
      "/send-order",
      {
        request_id: request.requestId,
        symbol: request.symbol,
        type: request.type,
        volume: request.volume,
        price: request.price,
        sl: request.sl,
        tp: request.tp,
        stop_limit: request.stopLimit ?? null,
        fill_policy: request.fillPolicy ?? null,
        time_policy: request.timePolicy ?? null,
        expiration: request.expiration ?? null,
        magic: request.magic,
        deviation: request.deviation,
        comment: request.comment,
      },
      20000
    );
    return this.rawResult(res, "Order sent");
  }

  async modifyOrder(request: Mt5ModifyRequest): Promise<Mt5RawResult> {
    const res = await this.request(
      "POST",
      "/modify-order",
      { ticket: request.ticket, sl: request.sl, tp: request.tp, price: request.price ?? null },
      20000
    );
    return this.rawResult(res, "Order modified");
  }

  async closePosition(request: Mt5CloseRequest): Promise<Mt5RawResult> {
    const res = await this.request(
      "POST",
      "/close-order",
      { ticket: request.ticket, volume: request.volume },
      20000
    );
    return this.rawResult(res, "Position closed");
  }

  async cancelOrder(ticket: number): Promise<Mt5RawResult> {
    const res = await this.request("POST", "/cancel-order", { ticket }, 20000);
    return this.rawResult(res, "Order cancelled");
  }

  async getSymbols(): Promise<Mt5Symbol[]> {
    const res = await this.request("GET", "/symbols");
    if (!res.ok || !res.data) return [];
    return (res.data as { symbols?: Mt5Symbol[] }).symbols ?? [];
  }

  async getSymbolSpec(symbol: string): Promise<Mt5SymbolSpec | null> {
    const res = await this.request("GET", `/symbol/${encodeURIComponent(symbol)}`);
    if (!res.ok || !res.data) return null;
    return res.data as unknown as Mt5SymbolSpec;
  }

  async getTick(symbol: string): Promise<Mt5Tick | null> {
    const res = await this.request("GET", `/symbol/${encodeURIComponent(symbol)}/tick`);
    if (!res.ok || !res.data) return null;
    return res.data as unknown as Mt5Tick;
  }

  async calcMargin(input: Mt5CalcMarginInput): Promise<Mt5CalcResult> {
    const res = await this.request(
      "POST",
      "/calc-margin",
      { symbol: input.symbol, volume: input.volume, type: input.orderType, price: input.price ?? null },
      10000
    );
    const data = (res.data ?? {}) as { ok?: boolean; margin?: number; error?: string | null };
    return { ok: res.ok && data.ok !== false, value: data.margin ?? null, error: data.error ?? res.error };
  }

  async calcProfit(input: Mt5CalcProfitInput): Promise<Mt5CalcResult> {
    const res = await this.request(
      "POST",
      "/calc-profit",
      { symbol: input.symbol, volume: input.volume, type: input.orderType, open_price: input.openPrice, close_price: input.closePrice },
      10000
    );
    const data = (res.data ?? {}) as { ok?: boolean; profit?: number; error?: string | null };
    return { ok: res.ok && data.ok !== false, value: data.profit ?? null, error: data.error ?? res.error };
  }

  async ping(): Promise<number> {
    const started = Date.now();
    const res = await this.request("GET", "/heartbeat", undefined, 5000);
    if (!res.ok) {
      this.connected = false;
      this.lastError = res.error ?? res.message ?? "Gateway heartbeat failed";
      this.scheduleReconnect();
      return -1;
    }
    const heartbeat = (res.data ?? {}) as { connected?: boolean; activeAccountId?: string | null };
    this.connected = heartbeat.connected === true;
    if (this.connected && typeof heartbeat.activeAccountId === "string") {
      this.activeAccountId = heartbeat.activeAccountId;
    }
    const latency = Date.now() - started;
    if (this.connected) {
      this.lastError = null;
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
    } else {
      this.lastError = res.message ?? "MT5 terminal not connected";
      this.scheduleReconnect();
    }
    return this.connected ? latency : -1;
  }

  private rawResult(res: Mt5GatewayEnvelope, fallbackMessage: string): Mt5RawResult {
    if (!res.ok) {
      return {
        ticket: null,
        price: null,
        message: res.message ?? fallbackMessage,
        error: res.error,
      };
    }
    const data = (res.data ?? {}) as Partial<Mt5RawResult>;
    return {
      ticket: data.ticket ?? null,
      price: data.price ?? null,
      message: data.message ?? fallbackMessage,
      error: data.error ?? null,
    };
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>,
    timeoutMs = 10000
  ): Promise<Mt5GatewayEnvelope> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        return {
          ok: false,
          data: null,
          error: `Gateway HTTP ${res.status}`,
          message: `Gateway HTTP ${res.status}`,
        };
      }
      return (await res.json()) as Mt5GatewayEnvelope;
    } catch (err) {
      return {
        ok: false,
        data: null,
        error: err instanceof Error ? err.message : "Gateway request failed",
        message: "Gateway request failed",
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private scheduleReconnect(): void {
    if (!this.available || this.reconnectTimer) return;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.autoReconnect();
    }, RECONNECT_DELAY_MS);
  }

  private async autoReconnect(): Promise<void> {
    this.reconnectAttempts += 1;
    const ok = this.activeAccountId
      ? await this.connectWith({ accountId: this.activeAccountId })
      : await this.connect();
    if (!ok) this.scheduleReconnect();
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
