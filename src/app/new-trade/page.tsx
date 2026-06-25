"use client";

import { useState } from "react";
import { TradeForm } from "@/components/TradeForm";
import { useAppData } from "@/context/AppDataContext";
import type { NewTradeInput } from "@/types/trade";

export default function NewTradePage() {
  const { addTrade } = useAppData();
  const [message, setMessage] = useState("");

  async function handleSubmit(input: NewTradeInput) {
    const trade = await addTrade(input);
    setMessage(`${trade.pair} saved as ${trade.status}.`);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Quick entry</p>
        <h1 className="text-2xl font-bold tracking-tight">New Trade</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">Trades are saved as Open by default. Mark as already closed only when the result is already known.</p>
      </header>

      {message ? <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">{message}</p> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <TradeForm submitLabel="Save trade" onSubmit={handleSubmit} />
      </section>
    </div>
  );
}
