"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PLAN } from "@/types/trade";
import { useAppData } from "@/context/AppDataContext";

export default function TradingPlanPage() {
  const { plan, savePlan } = useAppData();
  const [form, setForm] = useState(DEFAULT_PLAN);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plan) {
      setForm({
        mainMarket: plan.mainMarket,
        allowedPairs: plan.allowedPairs,
        maxTradesPerDay: plan.maxTradesPerDay,
        riskPerTrade: plan.riskPerTrade,
        minimumRiskReward: plan.minimumRiskReward,
        stopAfterLosses: plan.stopAfterLosses,
        mainStrategy: plan.mainStrategy,
        personalRules: plan.personalRules
      });
    }
  }, [plan]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    await savePlan(form);
    setMessage("Trading plan saved.");
    setSaving(false);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          <div className="p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">TradeOS Discipline</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Trading Plan</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">Set the rules that keep daily trade decisions simple and consistent.</p>
          </div>
        </div>
      </header>

      {message ? <p className="rounded-xl border border-profit/20 bg-profit/5 px-4 py-3 text-sm text-profit">{message}</p> : null}

      <form onSubmit={handleSubmit} className="rounded-xl border border-border-subtle bg-surface-card p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Main market">
            <input value={form.mainMarket} onChange={(event) => setForm({ ...form, mainMarket: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Allowed pairs">
            <input value={form.allowedPairs} onChange={(event) => setForm({ ...form, allowedPairs: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Maximum trades per day">
            <input type="number" value={form.maxTradesPerDay} onChange={(event) => setForm({ ...form, maxTradesPerDay: Number(event.target.value || 0) })} className={inputClass} />
          </Field>
          <Field label="Risk per trade">
            <input value={form.riskPerTrade} onChange={(event) => setForm({ ...form, riskPerTrade: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Minimum risk-to-reward">
            <input value={form.minimumRiskReward} onChange={(event) => setForm({ ...form, minimumRiskReward: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Stop trading after how many losses">
            <input type="number" value={form.stopAfterLosses} onChange={(event) => setForm({ ...form, stopAfterLosses: Number(event.target.value || 0) })} className={inputClass} />
          </Field>
          <Field label="Main strategy">
            <input value={form.mainStrategy} onChange={(event) => setForm({ ...form, mainStrategy: event.target.value })} className={inputClass} />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Personal rules">
            <textarea value={form.personalRules} onChange={(event) => setForm({ ...form, personalRules: event.target.value })} className={`${inputClass} min-h-44`} />
          </Field>
        </div>

        <div className="mt-5 rounded-lg border border-border-subtle bg-surface-panel/40 p-4 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Default discipline guardrails</p>
          <p className="mt-2">Risk per trade: 0.25% to 0.5%. Maximum trades per day: 2. Stop trading after 2 losses. Minimum risk-to-reward: 1:2. No revenge trading, overtrading, moving stop loss, or trading without a clear setup.</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="focus-ring mt-5 inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-bold text-surface-base transition-all hover:bg-gold-dim disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save trading plan"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-text-secondary">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-border-subtle bg-surface-panel px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:ring-2 focus:ring-gold/10";
