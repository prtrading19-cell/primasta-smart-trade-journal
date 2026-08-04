"use client";

import { useEffect, useState } from "react";
import {
  Download,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import type { Mt5SavedAccount } from "@/lib/mt5/accountTypes";
import { PanelShell, ToneBadge } from "@/components/trading/primitives";
import { formatDuration } from "@/components/institutional/primitives";
import { cn } from "@/lib/format";

interface AccountsResponse {
  ok: boolean;
  accounts: Mt5SavedAccount[];
}

const inputCls =
  "w-full rounded-lg border border-border-subtle bg-surface-panel/60 px-3 py-2 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted/50 focus:border-gold/50";

/**
 * Settings management surface for MT5 saved accounts. Supports create / edit /
 * delete, default & auto-connect flags, and config export/import — the export
 * never contains passwords (they are stored encrypted in the gateway).
 */
export function Mt5AccountSettingsPanel() {
  const [accounts, setAccounts] = useState<Mt5SavedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const [editing, setEditing] = useState<Mt5SavedAccount | null>(null);
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [server, setServer] = useState("");
  const [password, setPassword] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
  const [broker, setBroker] = useState("MetaTrader 5");
  const [demo, setDemo] = useState(false);
  const [remember, setRemember] = useState(true);
  const [autoConnect, setAutoConnect] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/mt5/accounts", { cache: "no-store" });
      const json = (await res.json()) as AccountsResponse;
      setAccounts(json.accounts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy("Updating");
    setNotice(null);
    try {
      const res = await fetch(`/api/mt5/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({ ok: false, error: "Update failed" }))) as { ok: boolean; error?: string };
      setNotice({ tone: json.ok ? "ok" : "err", text: json.ok ? "Account updated" : (json.error ?? "Update failed") });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string, name: string) => {
    setBusy("Deleting");
    setNotice(null);
    try {
      const res = await fetch(`/api/mt5/accounts/${id}`, { method: "DELETE", cache: "no-store" });
      const json = (await res.json().catch(() => ({ ok: false, error: "Delete failed" }))) as { ok: boolean; error?: string };
      setNotice({ tone: json.ok ? "ok" : "err", text: json.ok ? `Deleted ${name}` : (json.error ?? "Delete failed") });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    const loginNum = Number(login);
    if (!login.trim()) {
      setNotice({ tone: "err", text: "Enter an account number (login)." });
      return;
    }
    setBusy("Saving");
    setNotice(null);
    try {
      const res = await fetch("/api/mt5/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          broker,
          login: Number.isFinite(loginNum) ? loginNum : null,
          password,
          investorPassword,
          server,
          tradeMode: "manual",
          demo,
          remember,
          autoConnect,
          readOnly,
        }),
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({ ok: false, error: "Save failed" }))) as { ok: boolean; error?: string };
      setNotice({ tone: json.ok ? "ok" : "err", text: json.ok ? "Account saved" : (json.error ?? "Save failed") });
      if (json.ok) {
        setName("");
        setLogin("");
        setServer("");
        setPassword("");
        setInvestorPassword("");
        setDemo(false);
        setRemember(true);
        setAutoConnect(false);
        setReadOnly(false);
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  const exportConfig = async () => {
    setBusy("Exporting");
    setNotice(null);
    try {
      const res = await fetch("/api/mt5/account-export", { cache: "no-store" });
      const json = (await res.json().catch(() => ({ ok: false, error: "Export failed" }))) as { ok: boolean; payload?: Record<string, unknown>; error?: string };
      if (!json.ok || !json.payload) {
        setNotice({ tone: "err", text: (json.error ?? "Export failed") });
        return;
      }
      const blob = new Blob([JSON.stringify(json.payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mt5-accounts-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice({ tone: "ok", text: "Exported account config (passwords are not included)." });
    } finally {
      setBusy(null);
    }
  };

  const importConfig = async (file: File) => {
    setBusy("Importing");
    setNotice(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as Record<string, unknown>;
      const res = await fetch("/api/mt5/account-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({ ok: false, error: "Import failed" }))) as { ok: boolean; imported?: number; error?: string };
      setNotice({ tone: json.ok ? "ok" : "err", text: json.ok ? `Imported ${json.imported ?? 0} account(s)` : (json.error ?? "Import failed") });
      if (json.ok) await load();
    } catch {
      setNotice({ tone: "err", text: "Invalid export file." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <PanelShell eyebrow="Settings" title="MT5 Accounts" icon={UserRound} badge={<ToneBadge text={accounts.length ? `${accounts.length} saved` : "None"} tone="neutral" />}>
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

        {/* Saved accounts list */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Saved Accounts</p>
          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-panel/40 px-4 py-3 text-xs text-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" /> Loading…
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-subtle bg-surface-panel/30 px-4 py-3 text-xs text-text-muted">
              No MT5 accounts saved yet.
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-surface-panel/40 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-bold text-text-primary">{acc.name}</span>
                      {acc.isDefault && <ToneBadge text="Default" tone="neutral" />}
                      {acc.autoConnect && <ToneBadge text="Auto" tone="warning" />}
                      {acc.demo && <ToneBadge text="Demo" tone="warning" />}
                    </div>
                    <p className="truncate text-[10px] text-text-muted">
                      Login {acc.login} · {acc.server ?? "—"} · {acc.broker}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {acc.hasSavedPassword ? "Password stored (encrypted)" : "No saved password"} ·{" "}
                      {acc.lastConnectedAt
                        ? `last connected ${formatDuration(Date.now() - new Date(acc.lastConnectedAt).getTime())} ago`
                        : "never connected"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => void patch(acc.id, { isDefault: !acc.isDefault })}
                      className={cn("rounded-md p-1.5 text-[10px] font-bold uppercase transition-colors hover:bg-surface-panel", acc.isDefault ? "text-gold" : "text-text-muted hover:text-gold")}
                      title="Toggle default"
                    >
                      Default
                    </button>
                    <button
                      onClick={() => void patch(acc.id, { autoConnect: !acc.autoConnect })}
                      className="rounded-md p-1.5 text-[10px] font-bold uppercase text-text-muted transition-colors hover:bg-surface-panel hover:text-warning"
                      title="Toggle auto-connect"
                    >
                      Auto
                    </button>
                    <button
                      onClick={() => void patch(acc.id, { favorite: !acc.favorite })}
                      className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-panel hover:text-gold"
                      title="Toggle favorite"
                    >
                      <Star className={cn("h-3.5 w-3.5", acc.favorite && "fill-gold text-gold")} />
                    </button>
                    <button
                      onClick={() => {
                        setEditing(acc);
                        setName(acc.name);
                        setLogin(String(acc.login));
                        setServer(acc.server ?? "");
                        setBroker(acc.broker);
                        setDemo(Boolean(acc.demo));
                        setRemember(Boolean(acc.remember));
                        setAutoConnect(Boolean(acc.autoConnect));
                        setReadOnly(Boolean(acc.readOnly));
                        setPassword("");
                        setInvestorPassword("");
                      }}
                      className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-panel hover:text-text-primary"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => void remove(acc.id, acc.name)}
                      className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-loss/10 hover:text-loss"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export / import */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-surface-panel/30 p-4">
          <p className="mr-auto text-[10px] font-bold uppercase tracking-wider text-text-muted">Configuration Transfer</p>
          <button
            onClick={() => void exportConfig()}
            disabled={Boolean(busy)}
            className="flex items-center gap-1.5 rounded-lg bg-surface-panel px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-primary transition-colors hover:bg-surface-panel/70 disabled:opacity-40"
          >
            {busy === "Exporting" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export (no passwords)
          </button>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-surface-panel px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-primary transition-colors hover:bg-surface-panel/70 disabled:opacity-40">
            {busy === "Importing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Import
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              disabled={Boolean(busy)}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importConfig(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {/* Create / edit form */}
        <div className="rounded-xl border border-border-subtle bg-surface-panel/30 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {editing ? `Edit — ${editing.name}` : "Add Account"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Display Name">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. FundedNext" />
            </Field>
            <Field label="Broker">
              <input className={inputCls} value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="e.g. MetaTrader 5" />
            </Field>
            <Field label="Account Number">
              <input className={inputCls} value={login} onChange={(e) => setLogin(e.target.value)} placeholder="e.g. 34503247" inputMode="numeric" />
            </Field>
            <Field label="Broker Server">
              <input className={inputCls} value={server} onChange={(e) => setServer(e.target.value)} placeholder="e.g. FundedNext-Server 3" />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input type="password" className={cn(inputCls, "pr-8")} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editing ? "Leave blank to keep" : "••••••••"} />
                <KeyRound className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted/40" />
              </div>
            </Field>
            <Field label="Investor Password">
              <div className="relative">
                <input type="password" className={cn(inputCls, "pr-8")} value={investorPassword} onChange={(e) => setInvestorPassword(e.target.value)} placeholder={editing ? "Leave blank to keep" : "Optional"} />
                <KeyRound className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted/40" />
              </div>
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-text-primary">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-3.5 w-3.5 accent-gold" /> Remember
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-text-primary">
              <input type="checkbox" checked={autoConnect} onChange={(e) => setAutoConnect(e.target.checked)} className="h-3.5 w-3.5 accent-gold" /> Auto Connect
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-text-primary">
              <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} className="h-3.5 w-3.5 accent-gold" /> Read Only
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-text-primary">
              <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} className="h-3.5 w-3.5 accent-gold" /> Demo Account
            </label>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => void save()}
              disabled={Boolean(busy)}
              className="flex items-center gap-1.5 rounded-lg bg-profit/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-profit transition-colors hover:bg-profit/20 disabled:opacity-40"
            >
              {busy === "Saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? <RefreshCw className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {editing ? "Save Changes" : "Save Account"}
            </button>
            {editing && (
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg bg-surface-panel px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted transition-colors hover:bg-surface-panel/70"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
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
