import type { Mt5ConnectionState, Mt5Heartbeat, Mt5LatencyStats } from "./types";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

export class BrokerStatusEngine {
  private state: Mt5ConnectionState = {
    status: "disconnected",
    connected: false,
    connectedAt: null,
    disconnectedAt: null,
    reconnectAttempts: 0,
    server: null,
    login: null,
    brokerName: null,
    terminalVersion: null,
    terminalBuild: null,
    terminalPath: null,
    lastHeartbeatAt: null,
    lastSyncAt: null,
    error: null,
  };

  private heartbeat: Mt5Heartbeat | null = null;
  private latencyWindow: number[] = [];

  setConnecting(): void {
    this.state.status = "connecting";
    this.state.error = null;
  }

  setConnected(info: {
    server?: string | null;
    login?: number | null;
    brokerName?: string | null;
    terminalVersion?: string | null;
    terminalBuild?: number | null;
    terminalPath?: string | null;
  }): void {
    this.state.status = "connected";
    this.state.connected = true;
    this.state.connectedAt = this.state.connectedAt ?? new Date().toISOString();
    this.state.disconnectedAt = null;
    this.state.server = info.server ?? this.state.server;
    this.state.login = info.login ?? this.state.login;
    this.state.brokerName = info.brokerName ?? this.state.brokerName;
    this.state.terminalVersion = info.terminalVersion ?? this.state.terminalVersion;
    this.state.terminalBuild = info.terminalBuild ?? this.state.terminalBuild;
    this.state.terminalPath = info.terminalPath ?? this.state.terminalPath;
    this.state.error = null;
  }

  setReconnecting(): void {
    this.state.status = "reconnecting";
    this.state.reconnectAttempts += 1;
  }

  setDisconnected(error?: string | null): void {
    const wasConnected = this.state.connected;
    this.state.status = "disconnected";
    this.state.connected = false;
    this.state.disconnectedAt = new Date().toISOString();
    this.state.error = error ?? null;
    if (wasConnected) {
      this.state.connectedAt = null;
      this.state.reconnectAttempts = 0;
    }
  }

  setSyncAt(at: string): void {
    this.state.lastSyncAt = at;
  }

  recordHeartbeat(latencyMs: number | null, ok: boolean): void {
    this.heartbeat = {
      sequence: (this.heartbeat?.sequence ?? 0) + 1,
      at: new Date().toISOString(),
      latencyMs,
      ok,
    };
    this.state.lastHeartbeatAt = this.heartbeat.at;
    if (latencyMs != null && latencyMs >= 0) {
      this.latencyWindow.push(latencyMs);
      if (this.latencyWindow.length > 200) this.latencyWindow.shift();
    }
  }

  setServer(server: string | null): void {
    this.state.server = server;
  }

  setLogin(login: number | null): void {
    this.state.login = login;
  }

  setError(error: string): void {
    this.state.error = error;
  }

  getState(): Mt5ConnectionState {
    return { ...this.state };
  }

  getHeartbeat(): Mt5Heartbeat | null {
    return this.heartbeat ? { ...this.heartbeat } : null;
  }

  getLatency(): Mt5LatencyStats {
    if (this.latencyWindow.length === 0) {
      return { lastMs: null, averageMs: null, minMs: null, maxMs: null, samples: 0 };
    }
    const sum = this.latencyWindow.reduce((a, b) => a + b, 0);
    return {
      lastMs: this.latencyWindow[this.latencyWindow.length - 1],
      averageMs: Math.round(sum / this.latencyWindow.length),
      minMs: Math.min(...this.latencyWindow),
      maxMs: Math.max(...this.latencyWindow),
      samples: this.latencyWindow.length,
    };
  }
}

export function getBrokerStatusEngine(): BrokerStatusEngine {
  return getSharedSingleton("Mt5BrokerStatusEngine", () => new BrokerStatusEngine());
}
