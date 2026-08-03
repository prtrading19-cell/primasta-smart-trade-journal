"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { calculatePositionSize, validateRisk, validateTradeSignal, buildOrder } from "@/lib/trading";
import type { Order, PositionSizingResult, RiskValidationResult, TradeSignal, ValidationResult } from "@/lib/trading";
import type { TradingOverview, ExecuteResponse } from "./types";
import { ExecutionMetricsPanel } from "./ExecutionMetricsPanel";
import { TradeSignalCard } from "./TradeSignalCard";
import { OrderPreview } from "./OrderPreview";
import { RiskValidationPanel } from "./RiskValidationPanel";
import { PositionSizingPanel } from "./PositionSizingPanel";
import { BrokerStatusPanel } from "./BrokerStatusPanel";
import { TradeQueuePanel } from "./TradeQueuePanel";
import { ExecutionTimelinePanel } from "./ExecutionTimelinePanel";
import { ExecutionHistoryPanel } from "./ExecutionHistoryPanel";
import { formatTime } from "@/components/institutional/primitives";

export function TradeExecutionDashboard({ pollIntervalMs = 30000 }: { pollIntervalMs?: number }) {
  const [data, setData] = useState<TradingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TradeSignal | null>(null);
  const [executing, setExecuting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/trading/overview");
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const json = (await res.json()) as TradingOverview;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trade execution data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    timer.current = setInterval(load, pollIntervalMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [pollIntervalMs]);

  const preview = useMemo(() => {
    if (!selected || !data?.portfolio) return null;
    const portfolio = data.portfolio;
    const validation = validateTradeSignal({
      signal: selected,
      portfolio,
      existingPositions: portfolio.positions,
    });
    const risk = validateRisk({ signal: selected, portfolio });
    const sizing = calculatePositionSize({ signal: selected, portfolio });
    const order: Order = buildOrder({ signal: selected, sizing });
    return { validation, risk, sizing, order };
  }, [selected, data?.portfolio]);

  const handlePreview = (signal: TradeSignal) => {
    setSelected(signal);
    setNotice(null);
  };

  const handleExecute = async (signal: TradeSignal) => {
    setExecuting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/trading/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signalId: signal.id,
          mode: "paper",
        }),
      });
      const json = (await res.json()) as ExecuteResponse;
      if (!res.ok || !json.ok) {
        setNotice(json.error ?? "Execution failed.");
      } else {
        setNotice(
          json.rejectedReasons?.length
            ? `Blocked: ${json.rejectedReasons[0]}`
            : `${signal.symbol} executed${json.record?.status ? ` (${json.record.status})` : ""}.`
        );
      }
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Execution failed.");
    } finally {
      setExecuting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border-subtle bg-surface-panel/50" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-loss/20 bg-loss/5 p-5">
        <AlertCircle className="h-5 w-5 shrink-0 text-loss" />
        <div>
          <p className="text-sm font-bold text-text-primary">Trade Execution unavailable</p>
          <p className="text-xs text-text-muted">{error}</p>
        </div>
        <button onClick={load} className="ml-auto flex items-center gap-1.5 rounded-lg bg-surface-panel px-3 py-1.5 text-xs font-bold text-text-primary hover:bg-surface-panel/70">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-profit opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-profit" />
          </span>
          Paper execution layer · updated {formatTime(data.generatedAt)}
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg bg-surface-panel px-2.5 py-1 text-[10px] font-bold text-text-muted transition-colors hover:text-text-primary">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
          <p className="text-xs font-bold text-gold">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-[10px] text-text-muted">Dismiss</button>
        </div>
      )}

      <ExecutionMetricsPanel metrics={data.metrics} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">Live Trade Signals</h3>
            <span className="text-[10px] text-text-muted">{data.signals.length} signals</span>
          </div>
          {data.signals.length === 0 ? (
            <p className="rounded-xl border border-border-subtle bg-surface-card p-5 text-xs text-text-muted">
              No trade signals generated yet. Portfolio intelligence must be available to produce signals.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.signals.map((s) => (
                <TradeSignalCard
                  key={s.id}
                  signal={s}
                  onPreview={handlePreview}
                  onExecute={handleExecute}
                  executing={executing && selected?.id === s.id}
                />
              ))}
            </div>
          )}

          <BrokerStatusPanel brokers={data.brokers} health={data.brokerHealth} />
        </div>

        <div className="space-y-4">
          <OrderPreview order={preview?.order ?? null} validation={preview?.validation ?? null} />
          <div className="grid gap-4 lg:grid-cols-2">
            <RiskValidationPanel result={preview?.risk ?? null} />
            <PositionSizingPanel result={preview?.sizing ?? null} />
          </div>
          <TradeQueuePanel records={data.executions} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExecutionTimelinePanel timeline={data.timeline} />
        <ExecutionHistoryPanel history={data.history} />
      </div>
    </div>
  );
}
