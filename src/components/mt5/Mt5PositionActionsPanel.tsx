"use client";

import { useState } from "react";
import { Crosshair, Layers, Trash2, Zap } from "lucide-react";
import type { Mt5Order, Mt5Position } from "@/lib/mt5/types";
import { PanelShell, ToneBadge } from "@/components/trading/primitives";
import { formatTime } from "@/components/institutional/primitives";
import { cn } from "@/lib/format";

type ManageResult = { error?: string | null; message?: string };

async function manage(body: unknown): Promise<string | null> {
  try {
    const res = await fetch("/api/mt5/position/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as ManageResult;
    return json.error ?? json.message ?? null;
  } catch (e) {
    return e instanceof Error ? e.message : "Action failed";
  }
}

async function manageOrder(body: unknown): Promise<string | null> {
  try {
    const res = await fetch("/api/mt5/order/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as ManageResult;
    return json.error ?? json.message ?? null;
  } catch (e) {
    return e instanceof Error ? e.message : "Action failed";
  }
}

export function Mt5PositionActionsPanel({
  positions,
  pendingOrders,
  onChanged,
}: {
  positions: Mt5Position[];
  pendingOrders: Mt5Order[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  const run = async (label: string, fn: () => Promise<string | null>) => {
    setBusy(label);
    setNotice(null);
    const err = await fn();
    if (err) setNotice({ text: err, ok: false });
    else setNotice({ text: `${label} complete`, ok: true });
    setBusy(null);
    onChanged();
  };

  return (
    <PanelShell
      eyebrow="Direct Position Control"
      title="Position Management"
      icon={Crosshair}
      badge={<span className="text-[10px] text-text-muted">{positions.length} open · {pendingOrders.length} pending</span>}
    >
      {notice && (
        <p className={cn("mb-3 rounded-lg border px-3 py-2 text-xs font-bold", notice.ok ? "border-profit/20 bg-profit/5 text-profit" : "border-loss/20 bg-loss/5 text-loss")}>
          {notice.text}
        </p>
      )}

      {positions.length === 0 && pendingOrders.length === 0 ? (
        <p className="text-xs text-text-muted">
          No open positions or pending orders to manage.
        </p>
      ) : (
        <div className="space-y-5">
          {positions.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <Layers className="h-3.5 w-3.5" /> Open Positions
              </p>
              <div className="space-y-2">
                {positions.map((p) => (
                  <PositionRow key={p.ticket} position={p} busy={busy} onAction={(label, fn) => void run(label, fn)} />
                ))}
              </div>
            </div>
          )}

          {pendingOrders.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Pending Orders</p>
              <div className="space-y-2">
                {pendingOrders.map((o) => (
                  <PendingRow key={o.ticket} order={o} busy={busy} onAction={(label, fn) => void run(label, fn)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PanelShell>
  );
}

function ActionBtn({ label, onClick, disabled, tone = "neutral" }: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "profit" | "loss";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40",
        tone === "profit" && "border-profit/30 bg-profit/10 text-profit hover:bg-profit/20",
        tone === "loss" && "border-loss/30 bg-loss/10 text-loss hover:bg-loss/20",
        tone === "neutral" && "border-border-subtle bg-surface-panel/40 text-text-muted hover:text-text-primary"
      )}
    >
      {label}
    </button>
  );
}

function PositionRow({ position, busy, onAction }: {
  position: Mt5Position;
  busy: string | null;
  onAction: (label: string, fn: () => Promise<string | null>) => void;
}) {
  const [slEdit, setSlEdit] = useState("");
  const [tpEdit, setTpEdit] = useState("");
  const [trailPts, setTrailPts] = useState("20");
  const [editing, setEditing] = useState(false);
  const isBusy = (l: string) => busy === l;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-panel/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-black uppercase", position.type === "buy" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss")}>
          {position.type}
        </span>
        <span className="text-sm font-black text-text-primary">{position.symbol}</span>
        <span className="text-xs text-text-secondary">{position.volume} lots</span>
        <span className="text-[10px] text-text-muted">#{position.ticket} · {formatTime(position.openTime)}</span>
        <span className={cn("ml-auto text-sm font-black", position.profit + position.swap > 0 ? "text-profit" : position.profit + position.swap < 0 ? "text-loss" : "text-text-secondary")}>
          {position.profit + position.swap > 0 ? "+" : ""}{(position.profit + position.swap).toFixed(2)}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-text-muted sm:grid-cols-4">
        <span>Open {position.priceOpen}</span>
        <span>Now {position.priceCurrent}</span>
        <span>SL {position.sl || "—"}</span>
        <span>TP {position.tp || "—"}</span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <ActionBtn label="Close" tone="loss" disabled={busy != null} onClick={() => onAction(`Close ${position.ticket}`, () => manage({ action: "close", ticket: position.ticket }))} />
        {[0.25, 0.5, 0.75].map((f) => (
          <ActionBtn
            key={f}
            label={`${Math.round(f * 100)}%`}
            disabled={busy != null}
            onClick={() => onAction(`Partial ${f * 100}% #${position.ticket}`, () => manage({ action: "partial", ticket: position.ticket, fraction: f }))}
          />
        ))}
        <ActionBtn label="Break Even" disabled={busy != null} onClick={() => onAction(`Break even #${position.ticket}`, () => manage({ action: "breakeven", ticket: position.ticket }))} />
        <ActionBtn label="Reverse" disabled={busy != null} onClick={() => onAction(`Reverse #${position.ticket}`, () => manage({ action: "reverse", ticket: position.ticket }))} />
        <ActionBtn label="Duplicate" disabled={busy != null} onClick={() => onAction(`Duplicate #${position.ticket}`, () => manage({ action: "duplicate", ticket: position.ticket }))} />
        <ActionBtn
          label="Trail"
          disabled={busy != null}
          onClick={() => onAction(`Trail #${position.ticket}`, () => manage({ action: "trail", ticket: position.ticket, distancePoints: Number(trailPts) || 20 }))}
        />
        <input
          value={trailPts}
          onChange={(e) => setTrailPts(e.target.value)}
          inputMode="numeric"
          title="trailing distance (points)"
          className="w-14 rounded-md border border-border-subtle bg-surface-panel/60 px-1.5 py-1 text-[10px] text-text-primary outline-none"
        />
        <ActionBtn label={editing ? "Cancel" : "SL/TP"} disabled={busy != null} onClick={() => setEditing((v) => !v)} />
      </div>

      {editing && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-surface-card/60 p-2">
          <input value={slEdit} onChange={(e) => setSlEdit(e.target.value)} placeholder={`SL (${position.sl || "current"})`} inputMode="decimal" className="w-28 rounded-md border border-border-subtle bg-surface-panel/60 px-2 py-1 text-[11px] text-text-primary outline-none" />
          <input value={tpEdit} onChange={(e) => setTpEdit(e.target.value)} placeholder={`TP (${position.tp || "current"})`} inputMode="decimal" className="w-28 rounded-md border border-border-subtle bg-surface-panel/60 px-2 py-1 text-[11px] text-text-primary outline-none" />
          <ActionBtn
            label="Apply"
            tone="profit"
            disabled={busy != null}
            onClick={() => {
              const sl = slEdit === "" ? null : Number(slEdit);
              const tp = tpEdit === "" ? null : Number(tpEdit);
              void onAction(`Modify #${position.ticket}`, () => manage({ action: "modify", ticket: position.ticket, sl, tp }));
            }}
          />
          {isBusy(`Modify #${position.ticket}`) && <span className="text-[10px] text-text-muted">…</span>}
        </div>
      )}
    </div>
  );
}

function PendingRow({ order, busy, onAction }: {
  order: Mt5Order;
  busy: string | null;
  onAction: (label: string, fn: () => Promise<string | null>) => void;
}) {
  const [priceEdit, setPriceEdit] = useState("");
  const [slEdit, setSlEdit] = useState("");
  const [tpEdit, setTpEdit] = useState("");
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-panel/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <ToneBadge text={order.type} tone="warning" />
        <span className="text-sm font-black text-text-primary">{order.symbol}</span>
        <span className="text-xs text-text-secondary">{order.volume} lots</span>
        <span className="text-[10px] text-text-muted">#{order.ticket} · {formatTime(order.openTime)}</span>
        <span className="ml-auto text-xs text-text-secondary">@ {order.priceOpen}</span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <ActionBtn
          label="Activate"
          tone="profit"
          disabled={busy != null}
          onClick={() => onAction(`Activate #${order.ticket}`, () => manageOrder({ action: "activate", ticket: order.ticket }))}
        />
        <ActionBtn
          label="Delete"
          tone="loss"
          disabled={busy != null}
          onClick={() => onAction(`Delete #${order.ticket}`, () => manageOrder({ action: "delete", ticket: order.ticket }))}
        />
        <ActionBtn label="Modify" disabled={busy != null} onClick={() => setEditing((v) => !v)} />
      </div>

      {editing && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-surface-card/60 p-2">
          <input value={priceEdit} onChange={(e) => setPriceEdit(e.target.value)} placeholder={`Price (${order.priceOpen})`} inputMode="decimal" className="w-24 rounded-md border border-border-subtle bg-surface-panel/60 px-2 py-1 text-[11px] text-text-primary outline-none" />
          <input value={slEdit} onChange={(e) => setSlEdit(e.target.value)} placeholder={`SL (${order.sl || "—"})`} inputMode="decimal" className="w-24 rounded-md border border-border-subtle bg-surface-panel/60 px-2 py-1 text-[11px] text-text-primary outline-none" />
          <input value={tpEdit} onChange={(e) => setTpEdit(e.target.value)} placeholder={`TP (${order.tp || "—"})`} inputMode="decimal" className="w-24 rounded-md border border-border-subtle bg-surface-panel/60 px-2 py-1 text-[11px] text-text-primary outline-none" />
          <ActionBtn
            label="Apply"
            tone="profit"
            disabled={busy != null}
            onClick={() =>
              void onAction(`Modify pending #${order.ticket}`, () =>
                manageOrder({
                  action: "modify",
                  ticket: order.ticket,
                  price: priceEdit === "" ? null : Number(priceEdit),
                  sl: slEdit === "" ? null : Number(slEdit),
                  tp: tpEdit === "" ? null : Number(tpEdit),
                })
              )
            }
          />
        </div>
      )}
    </div>
  );
}
