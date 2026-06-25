"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ScreenshotInput } from "@/components/ScreenshotInput";
import type { ClosingDetails, Trade, TradeResult } from "@/types/trade";

export function CloseTradeDialog({ trade, onClose, onSave }: { trade: Trade; onClose: () => void; onSave: (details: ClosingDetails) => Promise<void> }) {
  const [exitPrice, setExitPrice] = useState("");
  const [finalResult, setFinalResult] = useState<TradeResult>("Win");
  const [profitLoss, setProfitLoss] = useState("");
  const [rMultiple, setRMultiple] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [mistakeMade, setMistakeMade] = useState("");
  const [lessonLearned, setLessonLearned] = useState("");
  const [screenshotAfter, setScreenshotAfter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await onSave({
        exitPrice: Number(exitPrice || 0),
        finalResult,
        profitLoss: Number(profitLoss || 0),
        rMultiple: Number(rMultiple || 0),
        exitReason: exitReason.trim(),
        mistakeMade: mistakeMade.trim(),
        lessonLearned: lessonLearned.trim(),
        screenshotAfter: screenshotAfter.trim() || undefined
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to close this trade.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-soft dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Close trade</p>
            <h2 className="text-xl font-semibold">
              {trade.pair} {trade.tradeType}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="focus-ring rounded-md border border-slate-200 p-2 dark:border-slate-800" aria-label="Close dialog">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Exit price">
              <input required type="number" step="any" value={exitPrice} onChange={(event) => setExitPrice(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Final result">
              <select value={finalResult} onChange={(event) => setFinalResult(event.target.value as TradeResult)} className={inputClass}>
                <option>Win</option>
                <option>Loss</option>
                <option>Break-even</option>
              </select>
            </Field>
            <Field label="Profit/loss amount">
              <input required type="number" step="any" value={profitLoss} onChange={(event) => setProfitLoss(event.target.value)} className={inputClass} />
            </Field>
            <Field label="R-multiple result">
              <input required type="number" step="any" value={rMultiple} onChange={(event) => setRMultiple(event.target.value)} className={inputClass} />
            </Field>
          </div>

          <Field label="Exit reason">
            <textarea value={exitReason} onChange={(event) => setExitReason(event.target.value)} className={`${inputClass} min-h-20`} />
          </Field>
          <Field label="Mistake made">
            <textarea value={mistakeMade} onChange={(event) => setMistakeMade(event.target.value)} className={`${inputClass} min-h-20`} />
          </Field>
          <Field label="Lesson learned">
            <textarea value={lessonLearned} onChange={(event) => setLessonLearned(event.target.value)} className={`${inputClass} min-h-20`} />
          </Field>
          <ScreenshotInput label="After-trade screenshot" value={screenshotAfter} onChange={setScreenshotAfter} kind="after" />

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="focus-ring rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
            >
              {submitting ? "Closing..." : "Save result"}
            </button>
            <button type="button" onClick={onClose} className="focus-ring rounded-md border border-slate-200 px-5 py-3 text-sm font-semibold dark:border-slate-800">
              Cancel
            </button>
          </div>
        </form>
      </div>
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
