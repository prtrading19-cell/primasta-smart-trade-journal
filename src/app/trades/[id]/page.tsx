"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { CloseTradeDialog } from "@/components/CloseTradeDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppData } from "@/context/AppDataContext";
import { exportTradePdf } from "@/lib/exporters";
import { money, number, shortDate } from "@/lib/format";
import { getScreenshotDisplayUrl, isSupabaseStorageUri } from "@/lib/storage";
import { CHECKLIST_LABELS } from "@/types/trade";
import { getAPlusScore, getPlannedRiskReward, isRuleFollowed } from "@/lib/calculations";

export default function TradeDetailPage({ params }: { params: { id: string } }) {
  const { trades, closeTrade } = useAppData();
  const [closing, setClosing] = useState(false);
  const trade = trades.find((item) => item.id === params.id);

  if (!trade) {
    return (
      <div className="space-y-4">
        <Link href="/journal" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <ArrowLeft className="h-4 w-4" />
          Back to journal
        </Link>
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-semibold">Trade not found</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Refresh the page or return to the journal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/journal" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <ArrowLeft className="h-4 w-4" />
            Back to journal
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {trade.pair} {trade.tradeType}
            </h1>
            <StatusBadge status={trade.status} result={trade.finalResult} />
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {shortDate(trade.date)} - {trade.strategy} - {trade.session} - {trade.timeframe}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {trade.status === "Open" ? (
            <button type="button" onClick={() => setClosing(true)} className="focus-ring rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
              Close Trade
            </button>
          ) : null}
          <button type="button" onClick={() => void exportTradePdf(trade)} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-5 py-3 text-sm font-semibold dark:border-slate-800">
            <Download className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailCard label="Entry" value={String(trade.entryPrice)} />
        <DetailCard label="Stop loss" value={String(trade.stopLoss)} />
        <DetailCard label="Take profit" value={String(trade.takeProfit)} />
        <DetailCard label="Risk amount" value={money(trade.riskAmount)} />
        <DetailCard label="Lot size" value={String(trade.lotSize)} />
        <DetailCard label="Setup grade" value={trade.setupGrade ?? "-"} />
        <DetailCard label="A+ score" value={`${getAPlusScore(trade)}/15`} />
        <DetailCard label="HTF bias" value={trade.htfBias ?? "-"} />
        <DetailCard label="Liquidity swept" value={trade.liquiditySwept ?? "-"} />
        <DetailCard label="Entry POI" value={trade.entryPoi ?? "-"} />
        <DetailCard label="Confirmation TF" value={trade.confirmationTimeframe ?? "-"} />
        <DetailCard label="News risk" value={trade.newsRisk ?? "-"} />
        <DetailCard label="Planned R:R" value={formatPlannedRiskReward(trade)} />
        <DetailCard label="Exit" value={trade.exitPrice ? String(trade.exitPrice) : "Open"} />
        <DetailCard label="Profit/loss" value={trade.status === "Closed" ? money(Number(trade.profitLoss ?? 0)) : "Open"} />
        <DetailCard label="R-multiple" value={trade.status === "Closed" ? number(Number(trade.rMultiple ?? 0)) : "Open"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Trade Summary">
          <TextBlock label="Entry reason" value={trade.entryReason} />
          {trade.status === "Closed" ? (
            <>
              <TextBlock label="Exit reason" value={trade.exitReason || "Not logged"} />
              <TextBlock label="Mistake made" value={trade.mistakeMade || "None logged"} />
              <TextBlock label="Lesson learned" value={trade.lessonLearned || "Not logged"} />
            </>
          ) : (
            <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">This trade is still open and is not included in performance calculations.</p>
          )}
        </Panel>

        <Panel title="Checklist and Psychology">
          <div className="space-y-2">
            {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
              const checked = trade.checklist[key as keyof typeof trade.checklist];
              return (
                <div key={key} className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950">
                  <span>{label}</span>
                  <span className={checked ? "font-semibold text-profit" : "font-semibold text-loss"}>{checked ? "Yes" : "No"}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <DetailCard label="Emotion before trade" value={trade.emotionBefore} />
            <DetailCard label="Rule followed" value={isRuleFollowed(trade.checklist) ? "Yes" : "No"} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ScreenshotPanel title="Before-trade screenshot" value={trade.screenshotBefore} />
        <ScreenshotPanel title="After-trade screenshot" value={trade.screenshotAfter} />
      </section>

      {closing ? <CloseTradeDialog trade={trade} onClose={() => setClosing(false)} onSave={(details) => closeTrade(trade.id, details)} /> : null}
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-200">{value}</p>
    </div>
  );
}

function formatPlannedRiskReward(trade: Parameters<typeof getPlannedRiskReward>[0]) {
  const value = getPlannedRiskReward(trade);
  return value === null ? "-" : `1:${number(value)}`;
}

function ScreenshotPanel({ title, value }: { title: string; value?: string }) {
  const [displayUrl, setDisplayUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function resolveUrl() {
      setError("");

      if (!value) {
        setDisplayUrl("");
        return;
      }

      try {
        const nextUrl = await getScreenshotDisplayUrl(value);
        if (!cancelled) setDisplayUrl(nextUrl);
      } catch {
        if (!cancelled) {
          setDisplayUrl("");
          setError("Unable to load this Supabase Storage screenshot.");
        }
      }
    }

    void resolveUrl();

    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold">{title}</h2>
      {displayUrl ? (
        <a href={displayUrl} target="_blank" rel="noreferrer" className="mt-4 block overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
          <img src={displayUrl} alt={title} className="max-h-96 w-full object-cover" />
        </a>
      ) : value && isSupabaseStorageUri(value) ? (
        <p className="mt-4 rounded-md bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          {error || "Loading private Supabase Storage screenshot..."}
        </p>
      ) : (
        <p className="mt-4 rounded-md bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">No screenshot added.</p>
      )}
    </div>
  );
}
