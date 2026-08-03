"use client";

import { Gauge } from "lucide-react";
import type { TradeExecutionMetrics } from "@/lib/trading";
import { PanelShell, Metric } from "./primitives";

export function ExecutionMetricsPanel({ metrics }: { metrics: TradeExecutionMetrics | null }) {
  if (!metrics) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Metric label="Total Signals" value={String(metrics.totalSignals)} sub="processed by engine" />
      <Metric label="Filled" value={String(metrics.filled)} sub="paper executions" tone="profit" />
      <Metric label="Success Rate" value={`${metrics.successRate}%`} sub="filled / total" tone={metrics.successRate >= 50 ? "profit" : "warning"} />
      <Metric label="Blocked" value={String(metrics.rejected)} sub={`${metrics.failed} failed · ${metrics.cancelled} cancelled`} tone={metrics.rejected > 0 ? "loss" : "neutral"} />
    </div>
  );
}
