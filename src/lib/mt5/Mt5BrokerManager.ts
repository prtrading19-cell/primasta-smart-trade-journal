import type {
  Mt5AccountSynchronizerState,
  Mt5BrokerStatus,
  Mt5ConnectionState,
  Mt5ExecutionConfirmation,
  Mt5HealthRecord,
  Mt5LogEntry,
  Mt5PlaceRequest,
  Mt5PositionSynchronizerState,
  Mt5ProposalSource,
  Mt5RedactedConfig,
  Mt5TradeProposal,
} from "./types";
import { getMt5Config, redactMt5Config, MT5_BROKER_ID, MT5_BROKER_NAME, type Mt5Config } from "./config";
import { getMt5Gateway } from "./Mt5Gateway";
import { getBrokerStatusEngine } from "./BrokerStatusEngine";
import { getAccountSynchronizer } from "./AccountSynchronizer";
import { getPositionSynchronizer } from "./PositionSynchronizer";
import { getBrokerHealthEngine } from "./BrokerHealthEngine";
import { getExecutionConfirmationEngine } from "./ExecutionConfirmation";
import { getSafetyEngine, SafetyEngine } from "./SafetyEngine";
import { getManualApprovalLayer } from "./ManualApprovalLayer";
import { getMt5Logger } from "./Mt5Logger";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

export interface Mt5SubmitResult {
  created: boolean;
  proposal: Mt5TradeProposal | null;
  error: string | null;
}

export interface Mt5ApproveResult {
  ok: boolean;
  proposal: Mt5TradeProposal | null;
  confirmation: Mt5ExecutionConfirmation | null;
  error: string | null;
}

export interface Mt5Overview {
  generatedAt: string;
  status: Mt5BrokerStatus;
  config: Mt5RedactedConfig;
  connection: Mt5ConnectionState;
  health: Mt5HealthRecord;
  account: Mt5AccountSynchronizerState;
  positions: Mt5PositionSynchronizerState;
  proposals: Mt5TradeProposal[];
  confirmations: Mt5ExecutionConfirmation[];
  logs: Mt5LogEntry[];
  dailyTrades: number;
}

export class Mt5BrokerManager {
  private config: Mt5Config;
  private gateway = getMt5Gateway();
  private status = getBrokerStatusEngine();
  private accountSync = getAccountSynchronizer();
  private positionSync = getPositionSynchronizer();
  private health = getBrokerHealthEngine();
  private confirmations = getExecutionConfirmationEngine();
  private safety: SafetyEngine;
  private approvals = getManualApprovalLayer();
  private logger = getMt5Logger();

  constructor(config?: Mt5Config) {
    this.config = config ?? getMt5Config();
    this.safety = getSafetyEngine(this.config.safety);
  }

  reloadConfig(): void {
    this.config = getMt5Config();
    this.safety.setSafetyConfig(this.config.safety);
  }

  getGateway() {
    return this.gateway;
  }

  getSafetyEngine(): SafetyEngine {
    return this.safety;
  }

  /* ── Connection lifecycle ── */

  async connect(): Promise<{ ok: boolean; message: string; status: Mt5ConnectionState }> {
    this.status.setConnecting();
    this.logger.log("connection", "Connect requested", "MT5 connect initiated by operator");

    const transport = this.gateway.getTransportSummary();
    if (!transport.available) {
      this.status.setDisconnected("No live MT5 gateway configured");
      this.health.recordError(null, "No live MT5 gateway configured");
      this.logger.log(
        "connection",
        "Connect blocked — no live MT5 gateway",
        `Transport '${transport.transportId}' is not available. Configure a secure MT5 bridge/python/windows/docker service to enable live connectivity.`,
        { transport }
      );
      return {
        ok: false,
        message: "MT5 gateway is not configured. A secure bridge/Python/Windows/Docker gateway service must be connected first.",
        status: this.status.getState(),
      };
    }

    try {
      const ok = await this.gateway.connect();
      if (ok) {
        const cfg = this.config;
        this.status.setConnected({
          server: cfg.server,
          login: cfg.login,
          brokerName: cfg.brokerName,
          terminalVersion: cfg.terminalPath ? undefined : undefined,
        });
        this.status.setServer(cfg.server);
        this.status.setLogin(cfg.login);
        this.health.recordSuccess(null);
        this.logger.log("connection", "MT5 gateway connected", `Transport '${transport.transportId}'`, { server: cfg.server });
        await this.refresh();
      } else {
        this.status.setDisconnected("Gateway connect failed");
        this.health.recordError(null, "Gateway connect failed");
        this.logger.log("connection", "MT5 gateway connect failed", "Gateway returned failure", { transport });
      }
      return {
        ok,
        message: ok ? "MT5 gateway connected" : "MT5 gateway connect failed",
        status: this.status.getState(),
      };
    } catch (err) {
      this.status.setDisconnected(err instanceof Error ? err.message : "Unknown connect error");
      this.health.recordError(null, err instanceof Error ? err.message : "Unknown connect error");
      this.logger.log("error", "MT5 connect error", err instanceof Error ? err.message : String(err));
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Unknown connect error",
        status: this.status.getState(),
      };
    }
  }

  async disconnect(): Promise<{ ok: boolean; message: string; status: Mt5ConnectionState }> {
    try {
      await this.gateway.disconnect();
    } catch {
      /* best effort */
    }
    this.status.setDisconnected(null);
    this.health.recordDisconnection();
    this.health.setStatus("unknown");
    this.logger.log("disconnection", "MT5 gateway disconnected", "Operator requested disconnect");
    return { ok: true, message: "MT5 gateway disconnected", status: this.status.getState() };
  }

  async reconnect(): Promise<{ ok: boolean; message: string; status: Mt5ConnectionState }> {
    this.status.setReconnecting();
    this.health.recordReconnection();
    this.logger.log("reconnect", "Reconnect requested", "MT5 reconnect initiated by operator");
    await this.disconnect();
    return this.connect();
  }

  isConnected(): boolean {
    return this.gateway.isConnected();
  }

  /* ── Heartbeat & health ── */

  async heartbeat(): Promise<Mt5HealthRecord> {
    const latency = await this.gateway.ping();
    const ok = this.gateway.isConnected() && latency >= 0;
    this.health.recordCommunication(latency >= 0 ? latency : null, ok, ok ? null : "Gateway not connected");
    this.status.recordHeartbeat(latency >= 0 ? latency : null, ok);
    if (ok) {
      this.status.setConnected({});
    } else if (this.gateway.getTransportSummary().available && this.status.getState().connected) {
      /* Configured transport is unreachable — surface the outage and keep
       * the auto-reconnect loop active. Proposals/history are never lost. */
      this.status.setDisconnected("Gateway offline");
      this.health.recordDisconnection();
      this.logger.log(
        "reconnect",
        "Gateway offline — auto-reconnect active",
        "Heartbeat failed; reconnect is scheduled by the gateway transport",
        { latencyMs: latency, ok }
      );
    }
    this.logger.log("latency", "Heartbeat", ok ? `Latency ${latency}ms` : "No gateway response", { latencyMs: latency, ok });
    return this.health.getRecord();
  }

  getHealth(): Mt5HealthRecord {
    return this.health.getRecord();
  }

  /* ── Synchronization ── */

  async refresh(): Promise<{
    account: ReturnType<ReturnType<typeof getAccountSynchronizer>["getState"]>;
    positions: ReturnType<ReturnType<typeof getPositionSynchronizer>["getState"]>;
    connected: boolean;
  }> {
    if (!this.gateway.isConnected()) {
      this.accountSync.recordUnavailable("MT5 gateway not connected");
      this.positionSync.recordUnavailable("MT5 gateway not connected");
      this.logger.log("account-sync", "Account sync unavailable", "MT5 gateway not connected");
      this.logger.log("position-sync", "Position sync unavailable", "MT5 gateway not connected");
      return { account: this.accountSync.getState(), positions: this.positionSync.getState(), connected: false };
    }

    const now = new Date().toISOString();
    this.status.setSyncAt(now);

    /* Account */
    const accountRes = await this.gateway.getAccountInfo();
    if (accountRes.ok && accountRes.data) {
      this.accountSync.recordSuccess(accountRes.data);
      this.status.setConnected({
        login: accountRes.data.login,
        server: accountRes.data.server,
        brokerName: accountRes.data.brokerName || this.config.brokerName,
        terminalVersion: accountRes.data.terminalVersion || undefined,
        terminalBuild: accountRes.data.terminalBuild || undefined,
        terminalPath: accountRes.data.terminalPath || undefined,
      });
      this.safety.recordEquity(accountRes.data.equity);
      this.health.recordSuccess(null);
      this.logger.log("account-sync", "Account synchronized", `Login ${accountRes.data.login} on ${accountRes.data.server}`, {
        balance: accountRes.data.balance,
        equity: accountRes.data.equity,
        marginFree: accountRes.data.marginFree,
      });
    } else {
      this.accountSync.recordFailure(accountRes.error ?? "Account sync failed");
      this.health.recordError(null, accountRes.error ?? "Account sync failed");
      this.logger.log("error", "Account sync failed", accountRes.error);
    }

    /* Positions / orders / history / deals */
    const [posRes, ordRes, histRes, dealRes] = await Promise.all([
      this.gateway.getPositions(),
      this.gateway.getOrders(),
      this.gateway.getHistoryOrders(),
      this.gateway.getDeals(),
    ]);

    const positions = posRes.ok ? posRes.data ?? [] : [];
    const pendingOrders = ordRes.ok ? (ordRes.data ?? []).filter((o) => o.state === "pending") : [];
    const closedOrders = histRes.ok ? histRes.data ?? [] : [];
    const deals = dealRes.ok ? dealRes.data ?? [] : [];

    if (posRes.ok || ordRes.ok) {
      this.positionSync.recordSuccess({ positions, pendingOrders, closedOrders, deals });
      const closedPnl = deals.reduce((sum, d) => sum + d.profit + d.swap + d.commission, 0);
      const latest = this.accountSync.getState().latest;
      if (latest) {
        this.accountSync.recordSuccess(latest, closedPnl);
      }
      this.logger.log("position-sync", "Positions synchronized", `${positions.length} open, ${pendingOrders.length} pending, ${deals.length} deals`);
    } else {
      this.positionSync.recordFailure(posRes.error ?? "Position sync failed");
      this.health.recordError(null, posRes.error ?? "Position sync failed");
      this.logger.log("error", "Position sync failed", posRes.error);
    }

    return { account: this.accountSync.getState(), positions: this.positionSync.getState(), connected: true };
  }

  /* ── Order lifecycle (manual approval) ── */

  async submitOrder(
    input: {
      request: Partial<Mt5PlaceRequest>;
      signalId?: string | null;
      source?: Mt5ProposalSource;
    }
  ): Promise<Mt5SubmitResult> {
    this.approvals.cancelExpired();
    const cfg = this.config;
    const request: Mt5PlaceRequest = {
      requestId: input.request.requestId ?? `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceSignalId: input.signalId ?? null,
      symbol: input.request.symbol ?? "XAUUSD",
      type: input.request.type ?? "buy",
      volume: input.request.volume ?? 0.01,
      price: input.request.price ?? null,
      sl: input.request.sl ?? null,
      tp: input.request.tp ?? null,
      magic: input.request.magic ?? cfg.magic,
      deviation: input.request.deviation ?? cfg.defaultDeviation,
      comment: input.request.comment ?? "PRIMASTA",
      riskPercent: input.request.riskPercent ?? null,
      source: input.source ?? "research",
    };

    if (request.volume <= 0) {
      return { created: false, proposal: null, error: "Volume must be greater than zero" };
    }

    const account = this.accountSync.getState();
    const existingPositionsVolume = this.positionSync
      .getState()
      .positions.reduce((sum, p) => sum + p.volume, 0);
    const pendingVolume = this.approvals
      .pending()
      .filter((p) => p.request.symbol === request.symbol)
      .reduce((sum, p) => sum + p.request.volume, 0);

    const safetyResult = this.safety.validate(request, {
      account,
      existingPositionsVolume,
      pendingProposalVolume: pendingVolume,
    });

    const proposal = this.approvals.create({
      request,
      signalId: input.signalId ?? null,
      source: input.source ?? "research",
      safety: safetyResult,
    });

    this.logger.log(
      "order",
      `Trade proposal ${proposal.id} created`,
      `${request.type} ${request.volume} ${request.symbol} — requires manual approval`,
      { proposalId: proposal.id, symbol: request.symbol, volume: request.volume, type: request.type }
    );
    this.logger.log(
      "safety",
      "Safety validation",
      safetyResult.passed ? "Passed" : `Blocked: ${safetyResult.blockedReasons.join("; ")}`,
      { proposalId: proposal.id, passed: safetyResult.passed, blockedReasons: safetyResult.blockedReasons }
    );

    return { created: true, proposal, error: null };
  }

  async approveProposal(
    proposalId: string,
    note?: string | null
  ): Promise<Mt5ApproveResult> {
    const proposal = this.approvals.get(proposalId);
    if (!proposal) {
      return { ok: false, proposal: null, confirmation: null, error: "Proposal not found" };
    }

    if (proposal.status !== "pending") {
      return {
        ok: false,
        proposal,
        confirmation: null,
        error: `Proposal is already ${proposal.status}`,
      };
    }

    const decided = this.approvals.decide(proposalId, "approve", note);
    const approvedProposal = decided.proposal ?? proposal;

    this.logger.log(
      "approval",
      `Proposal ${proposalId} approved by operator`,
      note ?? "Manual approval granted",
      { proposalId }
    );

    /* Fail-safe: re-run safety before any transmission */
    const account = this.accountSync.getState();
    const safetyResult = this.safety.validate(approvedProposal.request, { account });

    if (!safetyResult.passed) {
      const confirmation = this.confirmations.record({
        requestId: approvedProposal.request.requestId,
        proposalId,
        ticket: null,
        fillPrice: null,
        brokerMessage: `Safety blocked transmission: ${safetyResult.blockedReasons.join("; ")}`,
        status: "rejected",
        requestedPrice: approvedProposal.request.price,
        symbol: approvedProposal.request.symbol,
        volume: approvedProposal.request.volume,
        orderType: approvedProposal.request.type,
        sl: approvedProposal.request.sl,
        tp: approvedProposal.request.tp,
        rejectionReason: safetyResult.blockedReasons.join("; "),
      });
      this.approvals.addConfirmation(proposalId, confirmation);
      this.logger.log("safety", `Transmission blocked for ${proposalId}`, safetyResult.blockedReasons.join("; "), { proposalId });
      return { ok: true, proposal: this.approvals.get(proposalId), confirmation, error: null };
    }

    if (!this.gateway.isConnected()) {
      const confirmation = this.confirmations.record({
        requestId: approvedProposal.request.requestId,
        proposalId,
        ticket: null,
        fillPrice: null,
        brokerMessage: "MT5 gateway not connected — order prepared but NOT transmitted",
        status: "unavailable",
        requestedPrice: approvedProposal.request.price,
        symbol: approvedProposal.request.symbol,
        volume: approvedProposal.request.volume,
        orderType: approvedProposal.request.type,
        sl: approvedProposal.request.sl,
        tp: approvedProposal.request.tp,
        rejectionReason: "MT5 gateway not connected",
      });
      this.approvals.addConfirmation(proposalId, confirmation);
      this.logger.log("order", `Order ${proposalId} NOT transmitted`, "MT5 gateway not connected", { proposalId });
      return { ok: true, proposal: this.approvals.get(proposalId), confirmation, error: null };
    }

    /* Live gateway available → transmit */
    try {
      const result = await this.gateway.placeOrder(approvedProposal.request);
      const transmitted = result.data?.ticket != null;
      const status = transmitted
        ? result.data?.error == null
          ? "submitted"
          : "failed"
        : "rejected";

      const confirmation = this.confirmations.record({
        requestId: approvedProposal.request.requestId,
        proposalId,
        ticket: result.data?.ticket ?? null,
        fillPrice: result.data?.price ?? null,
        brokerMessage: result.data?.message ?? result.error ?? "Order transmitted",
        status,
        requestedPrice: approvedProposal.request.price,
        symbol: approvedProposal.request.symbol,
        volume: approvedProposal.request.volume,
        orderType: approvedProposal.request.type,
        sl: approvedProposal.request.sl,
        tp: approvedProposal.request.tp,
        rejectionReason: result.error,
      });
      this.approvals.addConfirmation(proposalId, confirmation);

      if (transmitted) {
        this.safety.recordExecutedTrade(null);
        this.health.recordSuccess(result.data?.price != null ? 0 : null);
        this.logger.log(
          "fill",
          `Order ${confirmation.ticket} ${confirmation.status}`,
          `${approvedProposal.request.type} ${approvedProposal.request.volume} ${approvedProposal.request.symbol} @ ${result.data?.price ?? "—"}`,
          { ticket: confirmation.ticket, status }
        );
        await this.refresh();
      } else {
        this.health.recordBrokerError(result.error ?? "Order rejected by broker");
        this.logger.log("order", `Order rejected for ${proposalId}`, result.error ?? "Broker rejected order", { proposalId });
      }

      return { ok: true, proposal: this.approvals.get(proposalId), confirmation, error: null };
    } catch (err) {
      const confirmation = this.confirmations.record({
        requestId: approvedProposal.request.requestId,
        proposalId,
        ticket: null,
        fillPrice: null,
        brokerMessage: err instanceof Error ? err.message : "Unknown transmission error",
        status: "failed",
        requestedPrice: approvedProposal.request.price,
        symbol: approvedProposal.request.symbol,
        volume: approvedProposal.request.volume,
        orderType: approvedProposal.request.type,
        sl: approvedProposal.request.sl,
        tp: approvedProposal.request.tp,
        rejectionReason: err instanceof Error ? err.message : "Unknown transmission error",
      });
      this.approvals.addConfirmation(proposalId, confirmation);
      this.health.recordError(null, err instanceof Error ? err.message : "Unknown transmission error");
      this.logger.log("error", `Transmission failed for ${proposalId}`, err instanceof Error ? err.message : String(err));
      return { ok: false, proposal: this.approvals.get(proposalId), confirmation, error: err instanceof Error ? err.message : String(err) };
    }
  }

  rejectProposal(proposalId: string, note?: string | null): Mt5ApproveResult {
    const proposal = this.approvals.get(proposalId);
    if (!proposal) return { ok: false, proposal: null, confirmation: null, error: "Proposal not found" };
    const decided = this.approvals.decide(proposalId, "reject", note);
    this.logger.log("approval", `Proposal ${proposalId} rejected`, note ?? "Manual rejection", { proposalId });
    return { ok: true, proposal: this.approvals.get(proposalId), confirmation: null, error: null };
  }

  cancelExpiredProposals(): number {
    return this.approvals.cancelExpired();
  }

  /* ── Read views ── */

  getProposals(status: "pending" | "all" = "pending"): Mt5TradeProposal[] {
    this.approvals.cancelExpired();
    return this.approvals.list(status === "pending" ? "pending" : "all");
  }

  getConfirmations(): Mt5ExecutionConfirmation[] {
    return this.confirmations.getRecent(50);
  }

  getStatus(): Mt5BrokerStatus {
    const cfg = this.config;
    const state = this.status.getState();
    const transport = this.gateway.getTransportSummary();
    return {
      brokerId: MT5_BROKER_ID,
      brokerName: cfg.brokerName || MT5_BROKER_NAME,
      status: state.status,
      connected: state.connected,
      server: state.server ?? cfg.server,
      login: state.login ?? cfg.login,
      accountNumber: state.login != null ? String(state.login) : null,
      terminalVersion: state.terminalVersion,
      terminalBuild: state.terminalBuild,
      latency: this.status.getLatency(),
      lastHeartbeatAt: state.lastHeartbeatAt,
      lastSyncAt: state.lastSyncAt,
      health: this.health.getRecord().status,
      gateway: transport,
      safety: {
        killSwitch: this.safety.getKillSwitch(),
        lastResult: null,
      },
      enabled: cfg.enabled,
      hasCredentials: cfg.login != null && (cfg.password != null || cfg.investorPassword != null),
    };
  }

  getOverview(): Mt5Overview {
    this.approvals.cancelExpired();
    const proposals = this.approvals.list("all").slice(0, 20);
    return {
      generatedAt: new Date().toISOString(),
      status: this.getStatus(),
      config: redactMt5Config(this.config),
      connection: this.status.getState(),
      health: this.health.getRecord(),
      account: this.accountSync.getState(),
      positions: this.positionSync.getState(),
      proposals,
      confirmations: this.confirmations.getRecent(30),
      logs: this.logger.getRecent(40),
      dailyTrades: this.safety.getDailyTrades(),
    };
  }
}

export function getMt5BrokerManager(): Mt5BrokerManager {
  const manager = getSharedSingleton("Mt5BrokerManager", () => new Mt5BrokerManager());
  return manager;
}
