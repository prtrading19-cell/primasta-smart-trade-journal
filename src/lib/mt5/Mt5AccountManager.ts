import type {
  Mt5AccountConnectionStatus,
  Mt5AccountInput,
  Mt5AccountManagerSession,
  Mt5AutoConnectResult,
  Mt5BrokerInfo,
  Mt5ConnectOptions,
  Mt5SavedAccount,
  Mt5TerminalInfo,
  Mt5TestConnectionResult,
} from "./accountTypes";
import { getMt5Config } from "./config";
import { getMt5Gateway } from "./Mt5Gateway";
import { getMt5BrokerManager } from "./Mt5BrokerManager";
import { getMt5Logger } from "./Mt5Logger";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

const DEFAULT_GATEWAY_URL = "http://127.0.0.1:8765";

interface GatewayEnvelope {
  ok: boolean;
  data: Record<string, unknown> | null;
  error: string | null;
  message: string | null;
}

/**
 * Server-side MT5 Account Connection Manager (Phase 25A).
 *
 * Talks to the Python gateway over loopback HTTP for saved-account CRUD,
 * connection testing and rich connection status. Live connect / switch /
 * disconnect are routed through the shared gateway transport so the rest of
 * the MT5 stack (status engine, synchronizers, execution) stays consistent,
 * then a full refresh mirrors terminal state into the broker manager.
 *
 * SECURITY: passwords are only ever forwarded to the loopback gateway on
 * connect/test. They are never logged, stored on the Next.js side, or
 * returned to the client. Saved accounts persist encrypted inside the gateway.
 */
export class Mt5AccountManager {
  private readonly baseUrl: string;
  private readonly gateway = getMt5Gateway();
  private readonly broker = getMt5BrokerManager();
  private readonly logger = getMt5Logger();
  private session: Mt5AccountManagerSession = {
    accountId: null,
    login: null,
    server: null,
    brokerName: null,
    connected: false,
    connectedAt: null,
    lastHeartbeatAt: null,
    lastSyncAt: null,
  };

  constructor() {
    const cfg = getMt5Config();
    this.baseUrl = (cfg.gatewayUrl ?? DEFAULT_GATEWAY_URL).replace(/\/+$/, "");
  }

  getSession(): Mt5AccountManagerSession {
    return { ...this.session };
  }

  isGatewayAvailable(): boolean {
    return this.gateway.getTransportSummary().available;
  }

  /* ── Saved accounts ── */

  async listAccounts(): Promise<Mt5SavedAccount[]> {
    const res = await this.request("GET", "/accounts");
    if (!res.ok) return [];
    return ((res.data as { accounts?: Mt5SavedAccount[] }).accounts ?? []).sort((a, b) => {
      if (Boolean(a.isDefault) !== Boolean(b.isDefault)) return a.isDefault ? -1 : 1;
      if (Boolean(a.favorite) !== Boolean(b.favorite)) return a.favorite ? -1 : 1;
      return (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? "");
    });
  }

  async saveAccount(input: Mt5AccountInput): Promise<{ account: Mt5SavedAccount | null; error: string | null }> {
    const res = await this.request("POST", "/save-account", {
      name: input.name ?? null,
      broker: input.broker ?? null,
      login: input.login ?? null,
      password: input.password ?? null,
      investor_password: input.investorPassword ?? null,
      server: input.server ?? null,
      terminal_path: input.terminalPath ?? null,
      trade_mode: input.tradeMode ?? null,
      demo: input.demo ?? null,
      favorite: input.favorite ?? null,
      is_default: input.isDefault ?? null,
      auto_connect: input.autoConnect ?? null,
      read_only: input.readOnly ?? null,
      remember: input.remember ?? null,
      magic: input.magic ?? null,
      deviation: input.deviation ?? null,
    });
    if (!res.ok) return { account: null, error: res.error ?? res.message ?? "Save account failed" };
    const account = ((res.data as { account?: Mt5SavedAccount }).account ?? null);
    this.logger.log(
      "account-sync",
      `MT5 account saved`,
      account ? `${account.name} (${account.login})` : "Account saved",
      { accountId: account?.id ?? null }
    );
    return { account, error: null };
  }

  async patchAccount(id: string, input: Mt5AccountInput): Promise<{ account: Mt5SavedAccount | null; error: string | null }> {
    const res = await this.request("PATCH", `/account/${encodeURIComponent(id)}`, {
      name: input.name,
      broker: input.broker,
      server: input.server,
      terminal_path: input.terminalPath,
      trade_mode: input.tradeMode,
      demo: input.demo,
      favorite: input.favorite,
      is_default: input.isDefault,
      auto_connect: input.autoConnect,
      read_only: input.readOnly,
      remember: input.remember,
      password: input.password ?? null,
      investor_password: input.investorPassword ?? null,
    });
    if (!res.ok) return { account: null, error: res.error ?? res.message ?? "Update failed" };
    return { account: ((res.data as { account?: Mt5SavedAccount }).account ?? null), error: null };
  }

  async deleteAccount(id: string): Promise<{ deleted: boolean; error: string | null }> {
    const res = await this.request("DELETE", `/account/${encodeURIComponent(id)}`);
    if (!res.ok) return { deleted: false, error: res.error ?? res.message ?? "Delete failed" };
    if (this.session.accountId === id) {
      this.session = { ...this.session, accountId: null, login: null, server: null, connected: false, connectedAt: null };
    }
    this.logger.log("disconnection", "MT5 account deleted", `Saved account ${id} removed`, { accountId: id });
    return { deleted: true, error: null };
  }

  async exportAccounts(): Promise<Record<string, unknown> | null> {
    const res = await this.request("GET", "/account-export");
    return res.ok ? (res.data ?? null) : null;
  }

  async importAccounts(payload: Record<string, unknown>): Promise<{ imported: number; error: string | null }> {
    const res = await this.request("POST", "/account-import", payload);
    if (!res.ok) return { imported: 0, error: res.error ?? res.message ?? "Import failed" };
    return { imported: (res.data as { imported?: number }).imported ?? 0, error: null };
  }

  /* ── Connection lifecycle ── */

  async connect(options: Mt5ConnectOptions): Promise<{ ok: boolean; message: string; status: Mt5AccountConnectionStatus | null }> {
    if (!this.isGatewayAvailable()) {
      this.logger.log("connection", "Connect blocked — no live MT5 gateway", "Account manager requires the Python gateway");
      return { ok: false, message: "No live MT5 gateway configured. Start the Python gateway service first.", status: null };
    }
    this.logger.log(
      "connection",
      "Connect requested",
      options.accountId ? `Saved account ${options.accountId}` : `Login ${options.login ?? "—"}`
    );
    const outcome = await this.gateway.connectWith(options);
    if (!outcome.ok) {
      this.logger.log("connection", "MT5 connect failed", outcome.error ?? outcome.message, { login: options.login ?? null, accountId: options.accountId ?? null });
      return { ok: false, message: outcome.error ?? outcome.message ?? "Connect failed", status: null };
    }
    this.logger.log("connection", "MT5 terminal connected", outcome.message ?? "Connected", {
      login: options.login ?? null,
      accountId: options.accountId ?? null,
    });
    await this.afterConnected(options.accountId ?? this.gateway.getActiveAccountId() ?? null);
    return { ok: true, message: outcome.message ?? "MT5 terminal connected", status: await this.connectionStatus() };
  }

  async disconnect(): Promise<{ ok: boolean; message: string }> {
    await this.broker.disconnect();
    this.logger.log("disconnection", "MT5 gateway disconnected", "Account manager disconnect requested");
    this.session = { ...this.session, connected: false, connectedAt: null };
    return { ok: true, message: "MT5 terminal disconnected" };
  }

  async switchAccount(accountId: string): Promise<{ ok: boolean; message: string; status: Mt5AccountConnectionStatus | null }> {
    if (!this.isGatewayAvailable()) {
      return { ok: false, message: "No live MT5 gateway configured. Start the Python gateway service first.", status: null };
    }
    this.logger.log("connection", "Switch requested", `Saved account ${accountId}`);
    const outcome = await this.gateway.connectWith({ accountId });
    if (!outcome.ok) {
      this.logger.log("connection", "Account switch failed", outcome.error ?? outcome.message, { accountId });
      return { ok: false, message: outcome.error ?? outcome.message ?? "Switch failed", status: null };
    }
    this.logger.log("connection", "Account switch succeeded", outcome.message ?? "Connected", { accountId });
    await this.afterConnected(accountId);
    return { ok: true, message: outcome.message ?? "Account connected", status: await this.connectionStatus() };
  }

  async autoConnect(autoOnly = true): Promise<Mt5AutoConnectResult> {
    if (!this.isGatewayAvailable()) {
      return { ok: false, connected: false, activeAccountId: null, login: null, server: null, restored: false, message: "No live MT5 gateway configured", error: "No live MT5 gateway configured" };
    }
    const res = await this.request("POST", "/auto-connect", { auto_only: autoOnly });
    if (!res.ok || !(res.data as { connected?: boolean })?.connected) {
      const error = res.error ?? res.message ?? "Auto-connect failed";
      this.logger.log("reconnect", "Auto-connect failed", error);
      return { ok: false, connected: false, activeAccountId: null, login: null, server: null, restored: false, message: error, error };
    }
    const data = res.data as { connected?: boolean; activeAccountId?: string | null; login?: number | null; server?: string | null; restored?: boolean };
    this.logger.log("reconnect", "Auto-connected", data.restored ? "Session restored" : `Login ${data.login ?? "—"}`);
    await this.afterConnected(data.activeAccountId ?? null);
    return {
      ok: true,
      connected: true,
      activeAccountId: data.activeAccountId ?? null,
      login: data.login ?? null,
      server: data.server ?? null,
      restored: data.restored ?? false,
      message: data.restored ? "MT5 session already active" : "Auto-connected to saved MT5 account",
      error: null,
    };
  }

  private async afterConnected(accountId: string | null): Promise<void> {
    this.session = {
      ...this.session,
      accountId,
      connected: true,
      connectedAt: this.session.connectedAt ?? new Date().toISOString(),
      lastHeartbeatAt: new Date().toISOString(),
    };
    await this.broker.refresh();
    const state = this.broker.getStatus();
    this.session = {
      ...this.session,
      login: state.login,
      server: state.server,
      brokerName: state.brokerName,
      lastSyncAt: state.lastSyncAt,
    };
  }

  /* ── Test connection ── */

  async testConnection(options: Mt5ConnectOptions): Promise<Mt5TestConnectionResult> {
    if (!this.isGatewayAvailable()) {
      return { ok: false, broker: null, server: null, latencyMs: null, build: null, company: null, terminalVersion: null, login: null, error: "No live MT5 gateway configured" };
    }
    this.logger.log("connection", "Test connection requested", options.accountId ? `Saved account ${options.accountId}` : `Login ${options.login ?? "—"}`);
    const res = await this.request("POST", "/test-connection", {
      account_id: options.accountId ?? null,
      login: options.login ?? null,
      password: options.password ?? null,
      investor_password: options.investorPassword ?? null,
      server: options.server ?? null,
      terminal_path: options.terminalPath ?? null,
      magic: options.magic ?? null,
      deviation: options.deviation ?? null,
    });
    if (!res.ok) {
      const error = res.error ?? res.message ?? "Test connection failed";
      this.logger.log("connection", "Test connection failed", error, { login: options.login ?? null, accountId: options.accountId ?? null });
      return { ok: false, broker: null, server: null, latencyMs: null, build: null, company: null, terminalVersion: null, login: null, error };
    }
    const data = (res.data ?? {}) as Partial<Mt5TestConnectionResult> & { connected?: boolean; build?: number | null };
    const ok = data.connected === true;
    this.logger.log("connection", ok ? "Test connection succeeded" : "Test connection failed", ok ? undefined : (data.error ?? "No credentials on server"), {
      login: data.login ?? null,
      server: data.server ?? null,
    });
    return {
      ok,
      broker: data.broker ?? null,
      server: data.server ?? null,
      latencyMs: data.latencyMs ?? null,
      build: data.build ?? null,
      company: data.company ?? null,
      terminalVersion: data.terminalVersion ?? null,
      login: data.login ?? null,
      error: ok ? null : (data.error ?? "Authorization failed"),
    };
  }

  /* ── Status ── */

  async connectionStatus(): Promise<Mt5AccountConnectionStatus | null> {
    const res = await this.request("GET", "/connection-status");
    if (!res.ok) return null;
    const status = (res.data ?? {}) as Partial<Mt5AccountConnectionStatus>;
    if (status.activeAccountId != null) {
      this.session = { ...this.session, accountId: status.activeAccountId, connected: status.connected === true };
    }
    if (status.lastSyncAt != null) this.session.lastSyncAt = status.lastSyncAt;
    return status as Mt5AccountConnectionStatus;
  }

  async terminalInfo(): Promise<Mt5TerminalInfo | null> {
    const res = await this.request("GET", "/terminal-info");
    return res.ok ? ((res.data ?? null) as Mt5TerminalInfo | null) : null;
  }

  async brokerInfo(): Promise<Mt5BrokerInfo | null> {
    const res = await this.request("GET", "/broker-info");
    return res.ok ? ((res.data ?? null) as Mt5BrokerInfo | null) : null;
  }

  async heartbeat(): Promise<number> {
    const latency = await this.gateway.ping();
    if (latency >= 0) {
      this.session = { ...this.session, lastHeartbeatAt: new Date().toISOString(), connected: true };
    }
    return latency;
  }

  /* ── Transport ── */

  private async request(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: Record<string, unknown>, timeoutMs = 20000): Promise<GatewayEnvelope> {
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
        return { ok: false, data: null, error: `Gateway HTTP ${res.status}`, message: `Gateway HTTP ${res.status}` };
      }
      return (await res.json()) as GatewayEnvelope;
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
}

export function getMt5AccountManager(): Mt5AccountManager {
  return getSharedSingleton("Mt5AccountManager", () => new Mt5AccountManager());
}
