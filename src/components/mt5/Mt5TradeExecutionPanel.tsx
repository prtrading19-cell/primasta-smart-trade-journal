"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RefreshCw, Send, ShieldAlert, Zap } from "lucide-react";
import type {
  Mt5FillPolicy,
  Mt5OrderType,
  Mt5SafetyCheck,
  Mt5Symbol,
  Mt5SymbolSpec,
  Mt5Tick,
  Mt5TimePolicy,
} from "@/lib/mt5/types";
import { PanelShell, StatusBadge } from "@/components/trading/primitives";
import { cn } from "@/lib/format";

const ORDER_TYPES: { value: Mt5OrderType; label: string; pending: boolean }[] = [
  { value: "buy", label: "Market Buy", pending: false },
  { value: "sell", label: "Market Sell", pending: false },
  { value: "buy-limit", label: "Buy Limit", pending: true },
  { value: "sell-limit", label: "Sell Limit", pending: true },
  { value: "buy-stop", label: "Buy Stop", pending: true },
  { value: "sell-stop", label: "Sell Stop", pending: true },
  { value: "buy-stop-limit", label: "Buy Stop Limit", pending: true },
  { value: "sell-stop-limit", label: "Sell Stop Limit", pending: true },
];

const VOLUME_PRESETS = [0.01, 0.05, 0.1, 0.25, 0.5, 1];

const FILL_POLICIES: (Mt5FillPolicy | "")[] = ["", "fok", "ioc", "return"];
const TIME_POLICIES: (Mt5TimePolicy | "")[] = ["", "gtc", "day", "specified", "specified-day"];

function num(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function roundTo(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {label}
        {hint && <span className="font-normal normal-case tracking-normal text-text-muted/60">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-border-subtle bg-surface-panel/60 px-3 py-2 text-xs font-bold text-text-primary outline-none transition-colors focus:border-gold/60";

export function Mt5TradeExecutionPanel({
  connected,
  onExecuted,
}: {
  connected: boolean;
  onExecuted: () => void;
}) {
  const [symbols, setSymbols] = useState<Mt5Symbol[]>([]);
  const [symbol, setSymbol] = useState("");
  const [spec, setSpec] = useState<Mt5SymbolSpec | null>(null);
  const [tick, setTick] = useState<Mt5Tick | null>(null);
  const [orderType, setOrderType] = useState<Mt5OrderType>("buy");
  const [volume, setVolume] = useState("0.10");
  const [price, setPrice] = useState("");
  const [stopLimit, setStopLimit] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [slPips, setSlPips] = useState("");
  const [tpPips, setTpPips] = useState("");
  const [fillPolicy, setFillPolicy] = useState<Mt5FillPolicy | "">("");
  const [timePolicy, setTimePolicy] = useState<Mt5TimePolicy | "">("");
  const [expiration, setExpiration] = useState("");
  const [magic, setMagic] = useState("190624");
  const [deviation, setDeviation] = useState("20");
  const [comment, setComment] = useState("PRIMASTA");
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    checks?: Mt5SafetyCheck[];
    blocked?: string[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPending = ORDER_TYPES.find((t) => t.value === orderType)?.pending ?? false;
  const isStopLimit = orderType === "buy-stop-limit" || orderType === "sell-stop-limit";
  const isBuy = orderType === "buy" || orderType === "buy-limit" || orderType === "buy-stop" || orderType === "buy-stop-limit";

  const loadSymbols = async () => {
    try {
      const res = await fetch("/api/mt5/symbols", { cache: "no-store" });
      const json = (await res.json()) as { ok?: boolean; symbols?: Mt5Symbol[] };
      setSymbols(json.symbols ?? []);
    } catch {
      setSymbols([]);
    }
  };

  useEffect(() => {
    if (!connected) return;
    void loadSymbols();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/mt5/symbol/${encodeURIComponent(symbol)}`, { cache: "no-store" });
        const json = (await res.json()) as { ok?: boolean; symbol?: Mt5SymbolSpec; tick?: Mt5Tick };
        if (cancelled) return;
        setSpec(json.symbol ?? null);
        setTick(json.tick ?? null);
      } catch {
        if (!cancelled) {
          setSpec(null);
          setTick(null);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  const entryPrice = (): number | null => {
    if (isPending && num(price) != null) return num(price);
    if (tick) return isBuy ? tick.ask : tick.bid;
    return null;
  };

  const applySlPips = (raw: string) => {
    setSlPips(raw);
    const pips = num(raw);
    const entry = entryPrice();
    if (pips == null || entry == null || !spec) return;
    const dist = pips * spec.point;
    setSl(String(roundTo(isBuy ? entry - dist : entry + dist, spec.digits)));
  };

  const applyTpPips = (raw: string) => {
    setTpPips(raw);
    const pips = num(raw);
    const entry = entryPrice();
    if (pips == null || entry == null || !spec) return;
    const dist = pips * spec.point;
    setTp(String(roundTo(isBuy ? entry + dist : entry - dist, spec.digits)));
  };

  const request = () => ({
    symbol,
    type: orderType,
    volume: num(volume) ?? 0,
    price: num(price),
    sl: num(sl),
    tp: num(tp),
    stopLimit: num(stopLimit),
    fillPolicy: fillPolicy || undefined,
    timePolicy: timePolicy || undefined,
    expiration: timePolicy === "specified" || timePolicy === "specified-day" ? expiration || null : undefined,
    magic: num(magic),
    deviation: num(deviation) ?? 20,
    comment,
    riskPercent: null,
    source: "manual",
  });

  const refreshPreview = async () => {
    if (!connected || !symbol || !(num(volume) ?? 0)) return;
    setPreviewBusy(true);
    setPreviewError(null);
    try {
      const res = await fetch("/api/mt5/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request()),
      });
      const json = (await res.json()) as { ok?: boolean; preview?: Record<string, unknown> | null; error?: string | null };
      if (json.ok && json.preview) {
        setPreview(json.preview);
      } else {
        setPreview(null);
        setPreviewError(json.error ?? "Preview unavailable");
      }
    } catch (e) {
      setPreview(null);
      setPreviewError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setPreviewBusy(false);
    }
  };

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void refreshPreview(), 700);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, orderType, volume, price, sl, tp, stopLimit, fillPolicy, timePolicy, connected]);

  const execute = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/mt5/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request()),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        proposal?: { safety?: { checks?: Mt5SafetyCheck[]; blockedReasons?: string[] } };
      };
      setResult({
        ok: json.ok === true,
        message: json.ok ? (json.message ?? "Proposal created") : (json.error ?? "Order rejected"),
        checks: json.proposal?.safety?.checks,
        blocked: json.proposal?.safety?.blockedReasons,
      });
      if (json.ok) onExecuted();
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "Execution failed" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelShell
      eyebrow="Institutional Order Ticket"
      title="Trade Execution"
      icon={Zap}
      badge={
        <StatusBadge
          status={connected ? "ready" : "offline"}
        />
      }
    >
      <div className="space-y-4">
        {!connected && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-xs text-warning">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            MT5 terminal is not connected. Orders cannot be created until the gateway is connected and synchronized.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Symbol" hint={symbols.length ? `${symbols.length} tradeable` : "from symbols_get"}>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              disabled={!connected || symbols.length === 0}
              className={cn(inputCls, "disabled:opacity-50")}
            >
              <option value="">{symbols.length === 0 ? "No symbols loaded" : "Select symbol…"}</option>
              {symbols.map((s) => (
                <option key={s.symbol} value={s.symbol}>{s.symbol}</option>
              ))}
            </select>
          </Field>

          <Field label="Order Type">
            <select value={orderType} onChange={(e) => setOrderType(e.target.value as Mt5OrderType)} className={inputCls}>
              {ORDER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-muted">Volume</span>
          <div className="flex flex-wrap items-center gap-2">
            {VOLUME_PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setVolume(String(v))}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors",
                  num(volume) === v
                    ? "border-gold/50 bg-gold/10 text-gold"
                    : "border-border-subtle bg-surface-panel/40 text-text-muted hover:text-text-primary"
                )}
              >
                {v}
              </button>
            ))}
            <input
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              inputMode="decimal"
              className={cn(inputCls, "w-24")}
            />
          </div>
          {spec && num(volume) != null && (
            <p className="mt-1 text-[10px] text-text-muted">
              min {spec.volumeMin} · max {spec.volumeMax} · step {spec.volumeStep}
            </p>
          )}
        </div>

        {isPending && (
          <Field label="Entry Price" hint={spec ? `${spec.digits} digits` : undefined}>
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className={inputCls} />
          </Field>
        )}

        {isStopLimit && (
          <Field label="Stop Limit (activation) Price" hint="trigger for the stop-limit pair">
            <input value={stopLimit} onChange={(e) => setStopLimit(e.target.value)} inputMode="decimal" className={inputCls} />
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Stop Loss" hint={spec ? `${spec.stopsLevelPoints}pt stop level` : undefined}>
            <input value={sl} onChange={(e) => setSl(e.target.value)} inputMode="decimal" className={inputCls} />
          </Field>
          <Field label="Take Profit">
            <input value={tp} onChange={(e) => setTp(e.target.value)} inputMode="decimal" className={inputCls} />
          </Field>
          <Field label="SL (pips from entry)" hint="sets the SL price">
            <input value={slPips} onChange={(e) => applySlPips(e.target.value)} inputMode="decimal" className={inputCls} />
          </Field>
          <Field label="TP (pips from entry)" hint="sets the TP price">
            <input value={tpPips} onChange={(e) => applyTpPips(e.target.value)} inputMode="decimal" className={inputCls} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Filling Policy">
            <select value={fillPolicy} onChange={(e) => setFillPolicy(e.target.value as Mt5FillPolicy | "")} className={inputCls}>
              <option value="">Broker default</option>
              {FILL_POLICIES.filter(Boolean).map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
          </Field>
          <Field label="Time in Force">
            <select value={timePolicy} onChange={(e) => setTimePolicy(e.target.value as Mt5TimePolicy | "")} className={inputCls}>
              <option value="">Broker default</option>
              {TIME_POLICIES.filter(Boolean).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>

        {(timePolicy === "specified" || timePolicy === "specified-day") && (
          <Field label="Expiration (ISO-8601 or unix)">
            <input value={expiration} onChange={(e) => setExpiration(e.target.value)} placeholder="2026-08-05T16:00:00Z" className={inputCls} />
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Magic">
            <input value={magic} onChange={(e) => setMagic(e.target.value)} inputMode="numeric" className={inputCls} />
          </Field>
          <Field label="Deviation (pts)">
            <input value={deviation} onChange={(e) => setDeviation(e.target.value)} inputMode="numeric" className={inputCls} />
          </Field>
        </div>

        <Field label="Comment">
          <input value={comment} onChange={(e) => setComment(e.target.value)} className={inputCls} />
        </Field>

        {tick && (
          <p className="text-[10px] text-text-muted">
            Live {symbol}: bid {tick.bid} · ask {tick.ask} · spread {tick.spread.toFixed(5)} · {tick.marketLive ? "market live" : "market stale/closed"}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void refreshPreview()}
            disabled={!connected || !symbol || previewBusy}
            className="flex items-center gap-1.5 rounded-lg bg-surface-panel px-4 py-2 text-[11px] font-bold text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", previewBusy && "animate-spin")} /> Refresh Preview
          </button>
          <button
            onClick={() => void execute()}
            disabled={busy || !connected || !symbol || !(num(volume) ?? 0)}
            className="ml-auto flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold to-gold-dim px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Play className="h-4 w-4" /> {busy ? "Submitting…" : "Execute Order"}
          </button>
        </div>

        {result && (
          <div className={cn("rounded-lg border px-3 py-2.5 text-xs", result.ok ? "border-profit/20 bg-profit/5" : "border-loss/20 bg-loss/5")}>
            <p className={cn("font-bold", result.ok ? "text-profit" : "text-loss")}>{result.message}</p>
            {result.blocked && result.blocked.length > 0 && (
              <ul className="mt-1.5 list-disc pl-4 text-[11px] leading-5 text-warning">
                {result.blocked.map((b) => <li key={b}>{b}</li>)}
              </ul>
            )}
            {result.checks && result.checks.length > 0 && (
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                {result.checks.map((c) => (
                  <div key={c.id} className="flex items-start gap-1.5 rounded bg-surface-panel/40 px-2 py-1">
                    <span className={cn("mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full", c.passed ? "bg-profit" : c.severity === "blocking" ? "bg-loss" : "bg-warning")} />
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-bold text-text-primary">{c.label}</p>
                      <p className="truncate text-[9px] text-text-muted">{c.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {preview && (
          <PreviewInline preview={preview} error={previewError} busy={previewBusy} />
        )}
      </div>
    </PanelShell>
  );
}

function PreviewInline({
  preview,
  error,
  busy,
}: {
  preview: Record<string, unknown> | null;
  error: string | null;
  busy: boolean;
}) {
  const p = preview as {
    requiredMargin?: number;
    pipValue?: number;
    spreadCost?: number;
    dollarRisk?: number;
    riskPercent?: number;
    reward?: number;
    rrRatio?: number;
    freeMarginAfterEntry?: number;
    balanceAfterLoss?: number;
  } | null;

  const money = (v: number | undefined | null): string => {
    if (v == null || !Number.isFinite(v)) return "—";
    return `${v > 0 ? "+" : ""}${v.toFixed(2)}`;
  };

  if (busy && !preview) return <p className="text-[10px] text-text-muted">Recalculating preview…</p>;
  if (error) return <p className="text-[11px] text-loss">{error}</p>;
  if (!p) return null;

  const items: [string, string, string][] = [
    ["Required Margin", money(p.requiredMargin), "text-warning"],
    ["Free Margin After", money(p.freeMarginAfterEntry), p.freeMarginAfterEntry != null && p.freeMarginAfterEntry < 0 ? "text-loss" : "text-text-primary"],
    ["Pip Value", money(p.pipValue), "text-text-primary"],
    ["Spread Cost", money(p.spreadCost), "text-text-primary"],
    ["Risk (SL)", money(-(p.dollarRisk ?? 0)), "text-loss"],
    ["Reward (TP)", money(p.reward), "text-profit"],
    ["R:R", p.rrRatio != null && p.rrRatio > 0 ? `1 : ${p.rrRatio.toFixed(2)}` : "—", "text-text-primary"],
    ["Risk %", p.riskPercent != null ? `${p.riskPercent.toFixed(2)}%` : "—", p.riskPercent != null && p.riskPercent > 2 ? "text-loss" : "text-text-primary"],
    ["Balance After Loss", money(p.balanceAfterLoss), p.balanceAfterLoss != null && p.balanceAfterLoss < 0 ? "text-loss" : "text-text-primary"],
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(([label, value, tone]) => (
        <div key={label} className="rounded-lg border border-border-subtle bg-surface-panel/40 px-2.5 py-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
          <p className={cn("mt-0.5 truncate text-xs font-black", tone)}>{value}</p>
        </div>
      ))}
    </div>
  );
}
