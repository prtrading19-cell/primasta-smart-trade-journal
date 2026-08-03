import type { Mt5LogCategory, Mt5LogEntry } from "./types";
import { getSharedSingleton } from "@/lib/research/infrastructure/singleton";

let logCounter = 0;

export class Mt5Logger {
  private logs: Mt5LogEntry[] = [];
  private maxLogs = 2000;

  static getInstance(): Mt5Logger {
    return getSharedSingleton("Mt5Logger", () => new Mt5Logger());
  }

  log(
    category: Mt5LogCategory,
    message: string,
    detail?: string | null,
    meta?: Record<string, unknown> | null
  ): void {
    logCounter += 1;
    this.logs.push({
      id: `mt5-log-${Date.now()}-${logCounter}`,
      at: new Date().toISOString(),
      category,
      message,
      detail: detail ?? null,
      meta: meta ?? null,
    });
    if (this.logs.length > this.maxLogs) {
      this.logs.splice(0, this.logs.length - this.maxLogs);
    }
  }

  getRecent(count = 50): Mt5LogEntry[] {
    return this.logs.slice(-count).reverse();
  }

  getByCategory(category: Mt5LogCategory, count = 30): Mt5LogEntry[] {
    return this.logs
      .filter((l) => l.category === category)
      .slice(-count)
      .reverse();
  }

  getStats(): {
    total: number;
    errors: number;
    byCategory: Record<Mt5LogCategory, number>;
  } {
    const byCategory = Object.fromEntries(
      (["connection", "disconnection", "reconnect", "error", "order", "fill", "position-sync", "account-sync", "latency", "health", "approval", "safety", "gateway"] as Mt5LogCategory[]).map(
        (c) => [c, 0]
      )
    ) as Record<Mt5LogCategory, number>;

    for (const l of this.logs) {
      byCategory[l.category] = (byCategory[l.category] ?? 0) + 1;
    }

    return {
      total: this.logs.length,
      errors: this.logs.filter((l) => l.category === "error").length,
      byCategory,
    };
  }

  clear(): void {
    this.logs = [];
  }
}

export function getMt5Logger(): Mt5Logger {
  return Mt5Logger.getInstance();
}
