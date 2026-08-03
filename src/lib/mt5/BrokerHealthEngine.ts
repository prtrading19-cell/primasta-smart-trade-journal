import type { Mt5HealthRecord, Mt5Heartbeat, Mt5LatencyStats } from "./types";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

export class BrokerHealthEngine {
  private record: Mt5HealthRecord = {
    brokerId: "mt5",
    status: "unknown",
    heartbeat: null,
    latency: { lastMs: null, averageMs: null, minMs: null, maxMs: null, samples: 0 },
    lastCommunicationAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    disconnections: 0,
    reconnections: 0,
    timeouts: 0,
    brokerErrors: 0,
    totalErrors: 0,
    lastErrorMessage: null,
  };

  private latencyWindow: number[] = [];
  private heartbeatSeq = 0;

  recordCommunication(latencyMs: number | null, ok: boolean, error?: string | null): void {
    const now = new Date().toISOString();
    this.record.lastCommunicationAt = now;
    this.heartbeatSeq += 1;
    const heartbeat: Mt5Heartbeat = {
      sequence: this.heartbeatSeq,
      at: now,
      latencyMs,
      ok,
    };
    this.record.heartbeat = heartbeat;

    if (latencyMs != null && latencyMs >= 0) {
      this.latencyWindow.push(latencyMs);
      if (this.latencyWindow.length > 200) this.latencyWindow.shift();
    }

    if (ok) {
      this.record.lastSuccessAt = now;
      this.record.status = "healthy";
      this.record.lastErrorMessage = null;
      if (this.latencyWindow.length > 0) {
        this.record.latency = this.computeLatency();
      }
    } else {
      this.record.lastErrorAt = now;
      this.record.totalErrors += 1;
      this.record.lastErrorMessage = error ?? "Unknown communication error";
      if (error && /timeout|timed out/i.test(error)) this.record.timeouts += 1;
      this.record.status = this.record.totalErrors >= 5 ? "down" : "degraded";
    }
  }

  recordSuccess(latencyMs: number | null): void {
    this.recordCommunication(latencyMs, true);
  }

  recordError(latencyMs: number | null, error: string): void {
    this.recordCommunication(latencyMs, false, error);
  }

  recordBrokerError(error: string): void {
    this.record.lastErrorAt = new Date().toISOString();
    this.record.brokerErrors += 1;
    this.record.totalErrors += 1;
    this.record.lastErrorMessage = error;
    this.record.status = "degraded";
  }

  recordDisconnection(): void {
    this.record.disconnections += 1;
  }

  recordReconnection(): void {
    this.record.reconnections += 1;
  }

  setStatus(status: Mt5HealthRecord["status"]): void {
    this.record.status = status;
  }

  private computeLatency(): Mt5LatencyStats {
    const sum = this.latencyWindow.reduce((a, b) => a + b, 0);
    return {
      lastMs: this.latencyWindow[this.latencyWindow.length - 1],
      averageMs: Math.round(sum / this.latencyWindow.length),
      minMs: Math.min(...this.latencyWindow),
      maxMs: Math.max(...this.latencyWindow),
      samples: this.latencyWindow.length,
    };
  }

  getRecord(): Mt5HealthRecord {
    return {
      ...this.record,
      heartbeat: this.record.heartbeat ? { ...this.record.heartbeat } : null,
      latency: { ...this.record.latency },
    };
  }

  reset(): void {
    this.record = {
      brokerId: "mt5",
      status: "unknown",
      heartbeat: null,
      latency: { lastMs: null, averageMs: null, minMs: null, maxMs: null, samples: 0 },
      lastCommunicationAt: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      disconnections: 0,
      reconnections: 0,
      timeouts: 0,
      brokerErrors: 0,
      totalErrors: 0,
      lastErrorMessage: null,
    };
    this.latencyWindow = [];
  }
}

export function getBrokerHealthEngine(): BrokerHealthEngine {
  return getSharedSingleton("Mt5BrokerHealthEngine", () => new BrokerHealthEngine());
}
