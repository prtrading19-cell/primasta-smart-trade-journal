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
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Rules and discipline</p>
        <h1 className="text-2xl font-bold tracking-tight">Trading Plan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Set the rules that keep daily trade decisions simple and consistent.</p>
      </header>

      {message ? <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">{message}</p> : null}

      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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

        <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          <p className="font-semibold text-slate-800 dark:text-slate-100">Default discipline guardrails</p>
          <p className="mt-2">Risk per trade: 0.25% to 0.5%. Maximum trades per day: 2. Stop trading after 2 losses. Minimum risk-to-reward: 1:2. No revenge trading, overtrading, moving stop loss, or trading without a clear setup.</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="focus-ring mt-5 rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
        >
          {saving ? "Saving..." : "Save trading plan"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-200";
