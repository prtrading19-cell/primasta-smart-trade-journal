"use client";

import { useEffect, useRef, useState } from "react";
import {
  Cable,
  CheckCircle2,
  Eraser,
  KeyRound,
  Loader2,
  Pencil,
  Plug,
  PlugZap,
  RefreshCw,
  Server,
  Star,
  Trash2,
  Unplug,
  UserRound,
} from "lucide-react";
import type {
  Mt5AccountConnectionStatus,
  Mt5SavedAccount,
} from "@/lib/mt5/accountTypes";
import { PanelShell, ToneBadge } from "@/components/trading/primitives";
import { formatDuration } from "@/components/institutional/primitives";
import { cn } from "@/lib/format";

interface ConnResponse {
  ok: boolean;
  error?: string;
  message?: string;
  result?: {
    ok?: boolean;
    broker?: string | null;
    server?: string | null;
    latencyMs?: number | null;
    build?: number | null;
    error?: string | null;
  };
  status?: Mt5AccountConnectionStatus;
}

interface AccountsResponse {
  ok: boolean;
  accounts: Mt5SavedAccount[];
}

const inputCls =
  "w-full rounded-lg border border-border-subtle bg-surface-panel/60 px-3 py-2 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted/50 focus:border-gold/50";

export function Mt5ConnectionManagerPanel({
  onChanged,
  onSelectAccount,
}: {
  onChanged?: () => void;
  onSelectAccount?: (account: Mt5SavedAccount | null) => void;
}) {
  const [accounts, setAccounts] = useState<Mt5SavedAccount[]>([]);
  const [status, setStatus] = useState<Mt5AccountConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [broker, setBroker] = useState("MetaTrader 5");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
  const [server, setServer] = useState("");
  const [terminalPath, setTerminalPath] = useState("");
  const [tradeMode, setTradeMode] = useState("manual");
  const [demo, setDemo] = useState(false);
  const [remember, setRemember] = useState(true);
  const [autoConnect, setAutoConnect] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  const [editing, setEditing] = useState<Mt5SavedAccount | null>(null);
  const [editName, setEditName] = useState("");

  const loadAll = async () => {
    const [accRes, stRes] = await Promise.all([fetch("/api/mt5/accounts"), fetch("/api/mt5/connection-status")]);
    let fetchedAccounts: Mt5SavedAccount[] = [];
    let fetchedStatus: Mt5AccountConnectionStatus | null = null;
    if (accRes.ok) {
      const json = (await accRes.json()) as AccountsResponse;
      fetchedAccounts = json.accounts;
      setAccounts(json.accounts);
    }
    if (stRes.ok) {
      const json = (await stRes.json()) as { ok: boolean; status: Mt5AccountConnectionStatus | null };
      fetchedStatus = json.status;
      setStatus(json.status);
    }
    setLoading(false);
    return { fetchedAccounts, fetchedStatus };
  };

  const autoConnectOnce = useRef(false);

  useEffect(() => {
    void loadAll().then(({ fetchedAccounts, fetchedStatus }) => {
      if (autoConnectOnce.current) return;
      autoConnectOnce.current = true;
      const shouldAuto = fetchedAccounts.some((a) => a.autoConnect || a.isDefault);
      if (shouldAuto && fetchedStatus?.connected !== true) {
        void act("/api/mt5/auto-connect", {}, "Auto-connecting");
      }
    });
    timer.current = setInterval(() => void loadAll(), 15000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (path: string, body: Record<string, unknown> | undefined, label: string) => {
    setBusy(label);
    setNotice(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({ ok: false, error: "Invalid response" }))) as ConnResponse;
      if (res.ok && json.ok) {
        setNotice({ tone: "ok", text: json.message ?? `${label} complete` });
      } else {
        setNotice({ tone: "err", text: json.error ?? json.message ?? `${label} failed` });
      }
      await loadAll();
      onChanged?.();
      return json;
    } catch (e) {
      setNotice({ tone: "err", text: e instanceof Error ? e.message : `${label} failed` });
      return { ok: false, error: e instanceof Error ? e.message : `${label} failed` };
    } finally {
      setBusy(null);
    }
  };

  const connectFromForm = async () => {
    const loginNum = Number(login);
    if (!login.trim()) {
      setNotice({ tone: "err", text: "Enter an account number (login) to connect." });
      return;
    }
    await act(
      "/api/mt5/connect",
      {
        login: Number.isFinite(loginNum) ? loginNum : null,
        password,
        investorPassword,
        server,
        terminalPath,
        broker,
        tradeMode,
        demo,
        remember,
        autoConnect,
        readOnly,
      },
      "Connecting"
    );
  };

  const handleTest = async () => {
    setBusy("Testing");
    setNotice(null);
    try {
      const res = await fetch("/api/mt5/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: Number.isFinite(Number(login)) ? Number(login) : null,
          password,
          investorPassword,
          server,
          terminalPath,
        }),
      });
      const json = (await res.json().catch(() => ({ ok: false, result: null }))) as ConnResponse;
      const result = json.result ?? {};
      setNotice(
        result.ok
          ? { tone: "ok", text: `Test passed — ${result.broker ?? "broker"} · ${result.server ?? "server"} · build ${result.build ?? "?"} · ${result.latencyMs ?? "?"}ms` }
          : { tone: "err", text: `Test failed — ${result.error ?? json.error ?? "authorization failed"}` }
      );
    } catch (e) {
      setNotice({ tone: "err", text: e instanceof Error ? e.message : "Test connection failed" });
    } finally {
      setBusy(null);
    }
  };

  const handleSaveAccount = async () => {
    const loginNum = Number(login);
    if (!login.trim()) {
      setNotice({ tone: "err", text: "Enter an account number (login) to save." });
      return;
    }
    const res = await act(
      "/api/mt5/accounts",
      {
        name: editing ? editName : broker,
        broker,
        login: Number.isFinite(loginNum) ? loginNum : null,
        password,
        investorPassword,
        server,
        terminalPath,
        tradeMode,
        demo,
        remember,
        autoConnect,
        readOnly,
      },
      "Saving"
    );
    if (res.ok) {
      setEditing(null);
      setEditName("");
    }
  };

  const handleSwitch = (account: Mt5SavedAccount) => {
    void act("/api/mt5/connect", { accountId: account.id }, `Switching`);
    onSelectAccount?.(account);
  };

  const handlePatch = async (account: Mt5SavedAccount, updates: Record<string, unknown>) => {
    await act(`/api/mt5/accounts/${account.id}`, updates, "Updating");
  };

  const handleRename = (account: Mt5SavedAccount) => {
    setEditing(account);
    setEditName(account.name);
    onSelectAccount?.(account);
  };

  const handleDelete = (account: Mt5SavedAccount) => {
    void (async () => {
      setBusy("Deleting");
      setNotice(null);
      try {
        const res = await fetch(`/api/mt5/accounts/${account.id}`, { method: "DELETE" });
        const json = (await res.json().catch(() => ({ ok: false, error: "Delete failed" }))) as { ok: boolean; error?: string };
        setNotice({ tone: json.ok ? "ok" : "err", text: json.ok ? `Deleted ${account.name}` : (json.error ?? "Delete failed") });
        await loadAll();
        onChanged?.();
      } catch (e) {
        setNotice({ tone: "err", text: e instanceof Error ? e.message : "Delete failed" });
      } finally {
        setBusy(null);
      }
    })();
  };

  const activeId = status?.activeAccountId ?? null;
  const connected = status?.connected === true;

  return (
    <PanelShell
      eyebrow="Connection Manager"
      title="MT5 Account Connections"
      icon={Cable}
      badge={
        <span className="flex items-center gap-2">
          {connected ? (
            <ToneBadge text="Connected" tone="profit" />
          ) : (
            <ToneBadge text="Disconnected" tone="loss" />
          )}
        </span>
      }
    >
      <div className="space-y-5">
        {notice && (
          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border px-4 py-3",
              notice.tone === "ok" ? "border-profit/20 bg-profit/5" : "border-loss/20 bg-loss/5"
            )}
          >
            <p className={cn("text-xs font-bold", notice.tone === "ok" ? "text-profit" : "text-loss")}>{notice.text}</p>
            <button onClick={() => setNotice(null)} className="text-[10px] text-text-muted">
              Dismiss
            </button>
          </div>
        )}

        {/* Account selector */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Saved Accounts</p>
          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-panel/40 px-4 py-3 text-xs text-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" /> Loading saved accounts…
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-subtle bg-surface-panel/30 px-4 py-3 text-xs text-text-muted">
              No saved accounts yet. Fill in the form below and press Save to store a password-encrypted connection.
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors",
                    activeId === acc.id
                      ? "border-gold/40 bg-gold/5"
                      : "border-border-subtle bg-surface-panel/40 hover:border-border-subtle"
                  )}
                >
                  <button
                    onClick={() => handleSwitch(acc)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    title="Click to switch to this account"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black",
                        acc.demo ? "bg-warning/10 text-warning" : "bg-profit/10 text-profit"
                      )}
                    >
                      {acc.broker.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold text-text-primary">{acc.name}</span>
                        {acc.isDefault && <ToneBadge text="Default" tone="neutral" />}
                        {acc.autoConnect && <ToneBadge text="Auto" tone="warning" />}
                        {acc.favorite && <Star className="h-3 w-3 fill-gold text-gold" />}
                      </span>
                      <span className="block truncate text-[10px] text-text-muted">
                        Login {acc.login} · {acc.server ?? "—"}
                      </span>
                    </span>
                  </button>
                  <ToneBadge text={acc.demo ? "Demo" : "Live"} tone={acc.demo ? "warning" : "profit"} />
                  <span className="text-[10px] text-text-muted">
                    {acc.lastConnectedAt
                      ? `Last connected ${formatDuration(Date.now() - new Date(acc.lastConnectedAt).getTime())} ago`
                      : "Never connected"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePatch(acc, { favorite: !acc.favorite })}
                      className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-panel hover:text-gold"
                      title={acc.favorite ? "Remove favorite" : "Mark favorite"}
                    >
                      <Star className={cn("h-3.5 w-3.5", acc.favorite && "fill-gold text-gold")} />
                    </button>
                    <button
                      onClick={() => handlePatch(acc, { isDefault: true })}
                      className="rounded-md p-1.5 text-[10px] font-bold uppercase text-text-muted transition-colors hover:bg-surface-panel hover:text-gold"
                      title="Set as default account"
                    >
                      Default
                    </button>
                    <button
                      onClick={() => handlePatch(acc, { autoConnect: !acc.autoConnect })}
                      className="rounded-md p-1.5 text-[10px] font-bold uppercase text-text-muted transition-colors hover:bg-surface-panel hover:text-warning"
                      title="Toggle auto-connect"
                    >
                      Auto
                    </button>
                    <button
                      onClick={() => handleRename(acc)}
                      className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-panel hover:text-text-primary"
                      title="Rename account"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(acc)}
                      className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-loss/10 hover:text-loss"
                      title="Delete account"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connection form */}
        <div className="rounded-xl border border-border-subtle bg-surface-panel/30 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {editing ? `Edit saved connection — ${editing.name}` : "New Connection"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Broker">
              <input className={inputCls} value={editing ? editing.broker : broker} onChange={(e) => setBroker(e.target.value)} placeholder="e.g. MetaTrader 5" />
            </Field>
            <Field label="Account Number">
              <input className={inputCls} value={login} onChange={(e) => setLogin(e.target.value)} placeholder="e.g. 34503247" inputMode="numeric" />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input type="password" className={cn(inputCls, "pr-8")} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <KeyRound className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted/40" />
              </div>
            </Field>
            <Field label="Broker Server">
              <input className={inputCls} value={server} onChange={(e) => setServer(e.target.value)} placeholder="e.g. FundedNext-Server 3" />
            </Field>
            <Field label="Terminal Path (optional)">
              <input className={inputCls} value={terminalPath} onChange={(e) => setTerminalPath(e.target.value)} placeholder="e.g. C:\Program Files\MetaTrader 5" />
            </Field>
            <Field label="Trade Mode">
              <select className={inputCls} value={tradeMode} onChange={(e) => setTradeMode(e.target.value)}>
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
                <option value="hedging">Hedging</option>
              </select>
            </Field>
          </div>

          {readOnly && (
            <div className="mt-3">
              <Field label="Investor Password (Read Only Mode)">
                <div className="relative">
                  <input type="password" className={cn(inputCls, "pr-8")} value={investorPassword} onChange={(e) => setInvestorPassword(e.target.value)} placeholder="••••••••" />
                  <KeyRound className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted/40" />
                </div>
              </Field>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Toggle label="Remember Account" checked={remember} onChange={setRemember} />
            <Toggle label="Auto Connect" checked={autoConnect} onChange={setAutoConnect} />
            <Toggle label="Read Only (Investor)" checked={readOnly} onChange={setReadOnly} />
            <Toggle label="Demo Account" checked={demo} onChange={setDemo} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ActionButton icon={<PlugZap className="h-3.5 w-3.5" />} label="Test Connection" tone="neutral" busy={busy === "Testing"} onClick={() => void handleTest()} />
            <ActionButton icon={<Plug className="h-3.5 w-3.5" />} label={editing ? "Save Changes" : "Connect"} tone="profit" busy={busy !== null && busy.startsWith("Connecting")} onClick={() => void connectFromForm()} />
            {editing && (
              <ActionButton icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Save Account" tone="warning" busy={busy === "Saving"} onClick={() => void handleSaveAccount()} />
            )}
            {!editing && (
              <ActionButton icon={<UserRound className="h-3.5 w-3.5" />} label="Save Account" tone="warning" busy={busy === "Saving"} onClick={() => void handleSaveAccount()} />
            )}
            <ActionButton icon={<Unplug className="h-3.5 w-3.5" />} label="Disconnect" tone="loss" busy={busy === "Disconnecting"} onClick={() => void act("/api/mt5/disconnect", undefined, "Disconnecting")} />
            <ActionButton icon={<RefreshCw className="h-3.5 w-3.5" />} label="Reconnect" tone="warning" busy={busy === "Reconnecting"} onClick={() => void act("/api/mt5/reconnect", undefined, "Reconnecting")} />
            <ActionButton icon={<RefreshCw className="h-3.5 w-3.5" />} label="Refresh" tone="neutral" busy={busy === "Refreshing"} onClick={() => void act("/api/mt5/refresh", undefined, "Refreshing")} />
            <ActionButton icon={<Eraser className="h-3.5 w-3.5" />} label="Clear" tone="neutral" busy={null} onClick={() => { setBroker("MetaTrader 5"); setLogin(""); setPassword(""); setInvestorPassword(""); setServer(""); setTerminalPath(""); setTradeMode("manual"); setDemo(false); setRemember(true); setAutoConnect(false); setReadOnly(false); setEditing(null); setEditName(""); }} />
          </div>

          {editing && (
            <div className="mt-4 rounded-lg border border-border-subtle bg-surface-panel/40 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Rename saved account</p>
              <div className="flex items-center gap-2">
                <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="New display name" />
                <button
                  onClick={() => void (async () => {
                    setBusy("Updating");
                    try {
                      const res = await fetch(`/api/mt5/accounts/${editing.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: editName }),
                      });
                      const json = (await res.json().catch(() => ({ ok: false, error: "Update failed" }))) as { ok: boolean; error?: string };
                      setNotice({ tone: json.ok ? "ok" : "err", text: json.ok ? "Account renamed" : (json.error ?? "Update failed") });
                      setEditing(null);
                      setEditName("");
                      await loadAll();
                      onChanged?.();
                    } finally {
                      setBusy(null);
                    }
                  })()}
                  className="rounded-lg bg-surface-panel px-3 py-2 text-xs font-bold text-text-primary transition-colors hover:bg-surface-panel/70"
                >
                  Rename
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Active session details */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Status" value={connected ? "Connected" : "Disconnected"} tone={connected ? "text-profit" : "text-loss"} />
          <Detail label="Broker" value={status?.brokerName ?? "—"} />
          <Detail label="Account" value={status?.login != null ? String(status.login) : "—"} sub={status?.accountType ?? undefined} />
          <Detail label="Server" value={status?.server ?? "—"} />
          <Detail label="Terminal" value={status?.terminalVersion ?? "—"} sub={status?.terminalBuild != null ? `build ${status.terminalBuild}` : undefined} />
          <Detail label="Company" value={status?.company ?? "—"} />
          <Detail label="Type" value={status?.demo ? "Demo" : status?.demo === false ? "Live" : "—"} />
          <Detail label="Trade Allowed" value={status?.tradeAllowed === true ? "Yes" : status?.tradeAllowed === false ? "No" : "—"} tone={status?.tradeAllowed === false ? "text-warning" : undefined} />
          <Detail label="Read Only" value={status?.readOnly === true ? "Yes" : status?.readOnly === false ? "No" : "—"} />
          <Detail label="Auto Connect" value={status?.autoConnect === true ? "Yes" : status?.autoConnect === false ? "No" : "—"} />
          <Detail label="Last Login" value={status?.lastLoginAt ? formatDuration(Date.now() - new Date(status.lastLoginAt).getTime()) + " ago" : "—"} />
          <Detail label="Last Sync" value={status?.lastSyncAt ? formatDuration(Date.now() - new Date(status.lastSyncAt).getTime()) + " ago" : "—"} />
        </div>

        <p className="flex items-center gap-1.5 text-[10px] text-text-muted">
          <Server className="h-3 w-3" />
          Credentials are encrypted at rest inside the Python gateway (AES-256-GCM) and are never sent to the browser,
          logged, or stored on the Next.js side.
        </p>
      </div>
    </PanelShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-text-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-border-subtle accent-gold"
      />
      {label}
    </label>
  );
}

function ActionButton({
  icon,
  label,
  tone,
  busy,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "profit" | "loss" | "warning" | "neutral";
  busy?: boolean | null;
  onClick: () => void;
}) {
  const tones: Record<string, string> = {
    profit: "bg-profit/10 text-profit hover:bg-profit/20",
    loss: "bg-loss/10 text-loss hover:bg-loss/20",
    warning: "bg-warning/10 text-warning hover:bg-warning/20",
    neutral: "bg-surface-panel text-text-primary hover:bg-surface-panel/70",
  };
  return (
    <button
      onClick={onClick}
      disabled={Boolean(busy)}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40",
        tones[tone]
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function Detail({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-panel/40 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className={cn("mt-1 truncate text-sm font-bold text-text-primary", tone)}>{value}</p>
      {sub && <p className="text-[10px] text-text-muted">{sub}</p>}
    </div>
  );
}
