"use client";

import { useState } from "react";
import { Layers, Network, Plus, Scale, Shuffle } from "lucide-react";
import { PanelShell, ToneBadge } from "@/components/trading/primitives";
import type { Mt5ExecutionGroupMode, Mt5GroupActionResult } from "@/lib/mt5";

const input =
  "w-full rounded-lg border border-border-subtle bg-surface-panel/60 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-gold/50";
const label = "block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1";

function useGroupSubmit(mode: Mt5ExecutionGroupMode, onSubmitted: () => void) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Mt5GroupActionResult | null>(null);

  const submit = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/mt5/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, ...payload }),
      });
      const json = (await res.json()) as Mt5GroupActionResult;
      setResult(json);
      if (json.ok) onSubmitted();
    } catch (e) {
      setResult({ ok: false, group: null, error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setBusy(false);
    }
  };

  return { busy, result, submit, dismiss: () => setResult(null) };
}

function GroupResult({ result, onDone }: { result: Mt5GroupActionResult; onDone: () => void }) {
  if (!result) return null;
  const legs = result.group?.legs.length ?? 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2">
        <span className="text-xs font-bold text-gold">
          {result.ok ? `Group ${result.group?.mode ?? ""} created` : `Group ${result.group?.mode ?? ""} failed`}
        </span>
        {result.ok && <ToneBadge text="pending approval" tone="warning" />}
      </div>
      {result.ok && (
        <p className="text-[11px] text-text-muted">
          {result.group?.id} · {legs} leg{legs === 1 ? "" : "s"} ·{" "}
          {result.group?.mode === "scale-out" ? "attach to position when approved" : "approve to transmit"}
        </p>
      )}
      {!result.ok && <p className="text-[11px] text-loss">{result.error}</p>}
      <button onClick={onDone} className="rounded-lg bg-surface-panel px-3 py-1.5 text-[10px] font-bold text-text-muted hover:text-text-primary">
        Dismiss
      </button>
    </div>
  );
}

function ResultBox({ busy, result, dismiss }: { busy: boolean; result: Mt5GroupActionResult | null; dismiss: () => void }) {
  return (
    <>
      {busy && <p className="mt-2 text-[10px] text-text-muted">Submitting…</p>}
      {result && (
        <div className="mt-3">
          <GroupResult result={result} onDone={dismiss} />
        </div>
      )}
    </>
  );
}

function FormShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-panel/30 p-4">
      <p className="mb-3 text-xs font-bold text-text-primary">{title}</p>
      {children}
    </div>
  );
}

function Field({ labelText, value, onChange, placeholder }: {
  labelText: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={label}>{labelText}</label>
      <input className={input} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function DirectionToggle({ value, onChange }: { value: "buy" | "sell"; onChange: (v: "buy" | "sell") => void }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-border-subtle">
      {(["buy", "sell"] as const).map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            value === d ? (d === "buy" ? "bg-profit/15 text-profit" : "bg-loss/15 text-loss") : "bg-surface-panel/40 text-text-muted"
          }`}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

export function Mt5AdvancedOrdersPanel({ onChanged }: { onChanged: () => void }) {
  return (
    <PanelShell eyebrow="Institutional Strategies" title="Advanced Orders" icon={Layers}>
      <div className="space-y-4">
        <p className="text-[11px] leading-5 text-text-muted">
          One approval decides every leg. Each leg is re-validated against the live gateway immediately before
          transmission. OCO siblings are reconciled on each sync cycle.
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <BracketForm onSubmitted={onChanged} />
          <OcoForm onSubmitted={onChanged} />
          <ScaleInForm onSubmitted={onChanged} />
          <ScaleOutForm onSubmitted={onChanged} />
          <BasketForm onSubmitted={onChanged} />
        </div>
      </div>
    </PanelShell>
  );
}

function BracketForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { busy, result, submit, dismiss } = useGroupSubmit("bracket", onSubmitted);
  const [symbol, setSymbol] = useState("EURUSD");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [volume, setVolume] = useState("0.10");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  return (
    <FormShell title="Bracket — entry + SL + TP">
      <div className="space-y-2.5">
        <Field labelText="Symbol" value={symbol} onChange={setSymbol} />
        <DirectionToggle value={direction} onChange={setDirection} />
        <div className="grid grid-cols-2 gap-2">
          <Field labelText="Lots" value={volume} onChange={setVolume} />
          <Field labelText="Entry (optional)" value={entry} onChange={setEntry} placeholder="live price" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field labelText="Stop loss" value={sl} onChange={setSl} />
          <Field labelText="Take profit" value={tp} onChange={setTp} />
        </div>
        <button
          onClick={() =>
            submit({
              bracket: {
                symbol,
                legs: [
                  {
                    kind: "entry",
                    type: direction === "buy" ? "buy" : "sell",
                    volume: Number(volume) || 0,
                    price: entry ? Number(entry) : null,
                    sl: sl ? Number(sl) : null,
                    tp: tp ? Number(tp) : null,
                  },
                ],
              },
            })
          }
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-gold via-gold-dim to-gold px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black"
        >
          <Shuffle className="h-3.5 w-3.5" /> Create bracket
        </button>
        <ResultBox busy={busy} result={result} dismiss={dismiss} />
      </div>
    </FormShell>
  );
}

function OcoForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { busy, result, submit, dismiss } = useGroupSubmit("oco", onSubmitted);
  const [symbol, setSymbol] = useState("EURUSD");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [volume, setVolume] = useState("0.10");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  return (
    <FormShell title="OCO — one cancels other">
      <div className="space-y-2.5">
        <Field labelText="Symbol" value={symbol} onChange={setSymbol} />
        <DirectionToggle value={direction} onChange={setDirection} />
        <div className="grid grid-cols-2 gap-2">
          <Field labelText="Lots" value={volume} onChange={setVolume} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field labelText="Trigger 1 price" value={p1} onChange={setP1} />
          <Field labelText="Trigger 2 price" value={p2} onChange={setP2} />
        </div>
        <button
          onClick={() =>
            submit({
              oco: {
                symbol,
                direction,
                volume: Number(volume) || 0,
                first: { price: Number(p1), orderType: direction === "buy" ? "buy-stop" : "sell-stop" },
                second: { price: Number(p2), orderType: direction === "buy" ? "buy-limit" : "sell-limit" },
              },
            })
          }
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-gold via-gold-dim to-gold px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black"
        >
          <Network className="h-3.5 w-3.5" /> Create OCO
        </button>
        <ResultBox busy={busy} result={result} dismiss={dismiss} />
      </div>
    </FormShell>
  );
}

function ScaleInForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { busy, result, submit, dismiss } = useGroupSubmit("scale-in", onSubmitted);
  const [symbol, setSymbol] = useState("EURUSD");
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [tranches, setTranches] = useState("2");
  const [volume, setVolume] = useState("0.10");
  const [step, setStep] = useState("20");
  return (
    <FormShell title="Scale-in — layered entries">
      <div className="space-y-2.5">
        <Field labelText="Symbol" value={symbol} onChange={setSymbol} />
        <DirectionToggle value={direction} onChange={setDirection} />
        <div className="grid grid-cols-2 gap-2">
          <Field labelText="Tranches" value={tranches} onChange={setTranches} />
          <Field labelText="Lots per tranche" value={volume} onChange={setVolume} />
        </div>
        <Field labelText="Step (points)" value={step} onChange={setStep} placeholder="20" />
        <button
          onClick={() => {
            const n = Math.max(1, Math.min(10, Number(tranches) || 1));
            const stepPts = Number(step) || 0;
            submit({
              scaleIn: {
                symbol,
                direction,
                tranches: Array.from({ length: n }, (_, i) => ({
                  index: i,
                  volume: Number(volume) || 0,
                  distanceFromEntryPoints: stepPts * (i + 1),
                })),
              },
            });
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-gold via-gold-dim to-gold px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black"
        >
          <Plus className="h-3.5 w-3.5" /> Create scale-in
        </button>
        <ResultBox busy={busy} result={result} dismiss={dismiss} />
      </div>
    </FormShell>
  );
}

function ScaleOutForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { busy, result, submit, dismiss } = useGroupSubmit("scale-out", onSubmitted);
  const [ticket, setTicket] = useState("");
  const [levels, setLevels] = useState("0.25,0.5");
  return (
    <FormShell title="Scale-out — staged exits">
      <div className="space-y-2.5">
        <Field labelText="Position ticket" value={ticket} onChange={setTicket} placeholder="position ticket" />
        <Field labelText="Levels (fractions)" value={levels} onChange={setLevels} placeholder="0.25,0.5" />
        <p className="text-[10px] text-text-muted">Each level closes a fraction of the position via the gateway.</p>
        <button
          onClick={() =>
            submit({
              scaleOut: {
                ticket: Number(ticket),
                levels: levels.split(",").map((v) => Number(v.trim())).filter((v) => v > 0 && v <= 1),
              },
            })
          }
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-gold via-gold-dim to-gold px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black"
        >
          <Scale className="h-3.5 w-3.5" /> Register scale-out
        </button>
        <ResultBox busy={busy} result={result} dismiss={dismiss} />
      </div>
    </FormShell>
  );
}

function BasketForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { busy, result, submit, dismiss } = useGroupSubmit("basket", onSubmitted);
  const [legs, setLegs] = useState("EURUSD|buy|0.10\nGBPUSD|buy|0.10");
  return (
    <FormShell title="Basket — multi-symbol">
      <div className="space-y-2.5">
        <div>
          <label className={label}>Legs (symbol|side|lots per line)</label>
          <textarea
            className="w-full rounded-lg border border-border-subtle bg-surface-panel/60 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-gold/50"
            rows={3}
            value={legs}
            onChange={(e) => setLegs(e.target.value)}
          />
        </div>
        <button
          onClick={() =>
            submit({
              basket: {
                legs: legs
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const [symbol, side, vol] = line.split("|");
                    return { symbol: symbol?.trim() ?? "", direction: side?.trim() === "sell" ? "sell" : "buy", volume: Number(vol) || 0 };
                  })
                  .filter((l) => l.symbol),
              },
            })
          }
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-gold via-gold-dim to-gold px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black"
        >
          <Layers className="h-3.5 w-3.5" /> Create basket
        </button>
        <ResultBox busy={busy} result={result} dismiss={dismiss} />
      </div>
    </FormShell>
  );
}
