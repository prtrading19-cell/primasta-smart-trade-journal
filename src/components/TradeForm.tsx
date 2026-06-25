"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ScreenshotInput } from "@/components/ScreenshotInput";
import { cn } from "@/lib/format";
import {
  CHECKLIST_LABELS,
  CONFIRMATION_TIMEFRAMES,
  DEFAULT_CHECKLIST,
  EMOTIONS,
  ENTRY_POIS,
  HTF_BIASES,
  LIQUIDITY_SWEPT_OPTIONS,
  NEWS_RISKS,
  NO_TRADE_STRATEGY,
  PAIRS,
  SESSIONS,
  SETUP_GRADES,
  STRATEGIES,
  STRATEGY_DESCRIPTIONS,
  TIMEFRAMES,
  TRADING_RULE_STATUSES,
  type Checklist,
  type ConfirmationTimeframe,
  type Emotion,
  type EntryPoi,
  type HtfBias,
  type LiquiditySwept,
  type NewTradeInput,
  type NewsRisk,
  type Session,
  type SetupGrade,
  type Timeframe,
  type Trade,
  type TradeResult,
  type TradeType,
  type TradingRuleStatus
} from "@/types/trade";

interface TradeFormProps {
  initialTrade?: Trade;
  submitLabel?: string;
  onSubmit: (trade: NewTradeInput) => Promise<void> | void;
  onCancel?: () => void;
}

export function TradeForm({ initialTrade, submitLabel = "Save trade", onSubmit, onCancel }: TradeFormProps) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(initialTrade?.date ?? today);
  const [pair, setPair] = useState(initialTrade?.pair ?? "XAUUSD");
  const [tradeType, setTradeType] = useState<TradeType>(initialTrade?.tradeType ?? "Buy");
  const [strategy, setStrategy] = useState(initialTrade?.strategy ?? STRATEGIES[0]);
  const [session, setSession] = useState<Session>(initialTrade?.session ?? "London");
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTrade?.timeframe ?? "M15");
  const [entryPrice, setEntryPrice] = useState(String(initialTrade?.entryPrice || ""));
  const [stopLoss, setStopLoss] = useState(String(initialTrade?.stopLoss || ""));
  const [takeProfit, setTakeProfit] = useState(String(initialTrade?.takeProfit || ""));
  const [lotSize, setLotSize] = useState(String(initialTrade?.lotSize || ""));
  const [riskAmount, setRiskAmount] = useState(String(initialTrade?.riskAmount || ""));
  const [entryReason, setEntryReason] = useState(initialTrade?.entryReason ?? "");
  const [checklist, setChecklist] = useState<Checklist>({ ...DEFAULT_CHECKLIST, ...(initialTrade?.smcChecklist ?? initialTrade?.checklist) });
  const [htfBias, setHtfBias] = useState<HtfBias>(initialTrade?.htfBias ?? "Unclear");
  const [liquiditySwept, setLiquiditySwept] = useState<LiquiditySwept>(initialTrade?.liquiditySwept ?? "None");
  const [entryPoi, setEntryPoi] = useState<EntryPoi>(initialTrade?.entryPoi ?? "FVG");
  const [confirmationTimeframe, setConfirmationTimeframe] = useState<ConfirmationTimeframe>(initialTrade?.confirmationTimeframe ?? "M5");
  const [setupGrade, setSetupGrade] = useState<SetupGrade>(initialTrade?.setupGrade ?? "C");
  const [newsRisk, setNewsRisk] = useState<NewsRisk>(initialTrade?.newsRisk ?? "No major news");
  const [tradingRuleStatus, setTradingRuleStatus] = useState<TradingRuleStatus>(initialTrade?.tradingRuleStatus ?? "Failed");
  const [emotionBefore, setEmotionBefore] = useState<Emotion>(initialTrade?.emotionBefore ?? "Calm");
  const [screenshotBefore, setScreenshotBefore] = useState(initialTrade?.screenshotBefore ?? "");
  const [closedNow, setClosedNow] = useState(initialTrade?.status === "Closed");
  const [exitPrice, setExitPrice] = useState(String(initialTrade?.exitPrice || ""));
  const [finalResult, setFinalResult] = useState<TradeResult>(initialTrade?.finalResult ?? "Win");
  const [profitLoss, setProfitLoss] = useState(String(initialTrade?.profitLoss || ""));
  const [rMultiple, setRMultiple] = useState(String(initialTrade?.rMultiple || ""));
  const [exitReason, setExitReason] = useState(initialTrade?.exitReason ?? "");
  const [mistakeMade, setMistakeMade] = useState(initialTrade?.mistakeMade ?? "");
  const [lessonLearned, setLessonLearned] = useState(initialTrade?.lessonLearned ?? "");
  const [screenshotAfter, setScreenshotAfter] = useState(initialTrade?.screenshotAfter ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const aPlusScore = useMemo(() => Object.values(checklist).filter(Boolean).length, [checklist]);
  const riskReward = useMemo(() => calculateRiskReward(tradeType, entryPrice, stopLoss, takeProfit), [entryPrice, stopLoss, takeProfit, tradeType]);
  const isNoTradeObservation = strategy === NO_TRADE_STRATEGY;
  const highNewsRisk = newsRisk === "News within 30 minutes" || newsRisk === "High-impact news active";
  const qualifiesForAPlus = useMemo(
    () =>
      !isNoTradeObservation &&
      htfBias !== "Unclear" &&
      liquiditySwept !== "None" &&
      checklist.strongDisplacement &&
      checklist.mssChochConfirmation &&
      checklist.validFvgObBreaker &&
      checklist.entryFromHighProbabilityPoi &&
      checklist.stopLossBeyondInvalidation &&
      checklist.targetLiquidityDefined &&
      checklist.rrAtLeastTwo &&
      riskReward !== null &&
      riskReward >= 2 &&
      !highNewsRisk &&
      checklist.noRevengeTrading &&
      emotionBefore !== "Revenge",
    [checklist, emotionBefore, highNewsRisk, htfBias, isNoTradeObservation, liquiditySwept, riskReward]
  );

  const calculatedSetupGrade = useMemo<SetupGrade>(() => {
    if (isNoTradeObservation) return "No Trade";
    if (qualifiesForAPlus && aPlusScore >= 13) return "A+";
    if (aPlusScore >= 12) return "A";
    if (aPlusScore >= 9) return "B";
    return "C";
  }, [aPlusScore, isNoTradeObservation, qualifiesForAPlus]);

  const calculatedTradingRuleStatus = qualifiesForAPlus && aPlusScore >= 13 ? "Passed" : "Failed";
  const strategyDescription = STRATEGY_DESCRIPTIONS[strategy] ?? "Choose the SMC setup that best describes this trade.";

  useEffect(() => {
    setSetupGrade(calculatedSetupGrade);
    setTradingRuleStatus(calculatedTradingRuleStatus);
  }, [calculatedSetupGrade, calculatedTradingRuleStatus]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const strategyIsClear = STRATEGIES.includes(strategy);
    const shouldWarn =
      !isNoTradeObservation &&
      (aPlusScore < 9 || riskReward === null || riskReward < 2 || highNewsRisk || !strategyIsClear || !strategy.trim());

    if (shouldWarn) {
      const confirmed = window.confirm("This trade does not fully meet your A+ SMC rules. Are you sure you want to save it?");
      if (!confirmed) return;
    }

    setSubmitting(true);

    const payload: NewTradeInput = {
      date,
      pair: pair.trim().toUpperCase(),
      tradeType,
      strategy: strategy.trim(),
      session,
      timeframe,
      entryPrice: toNumber(entryPrice),
      stopLoss: toNumber(stopLoss),
      takeProfit: toNumber(takeProfit),
      lotSize: toNumber(lotSize),
      riskAmount: toNumber(riskAmount),
      entryReason: entryReason.trim(),
      checklist,
      smcChecklist: checklist,
      htfBias,
      liquiditySwept,
      entryPoi,
      confirmationTimeframe,
      setupGrade: calculatedSetupGrade,
      newsRisk,
      tradingRuleStatus: calculatedTradingRuleStatus,
      aPlusScore,
      emotionBefore,
      screenshotBefore: screenshotBefore.trim() || undefined,
      status: closedNow && !isNoTradeObservation ? "Closed" : "Open"
    };

    if (closedNow && !isNoTradeObservation) {
      payload.exitPrice = toNumber(exitPrice);
      payload.finalResult = finalResult;
      payload.profitLoss = toNumber(profitLoss);
      payload.rMultiple = toNumber(rMultiple);
      payload.exitReason = exitReason.trim();
      payload.mistakeMade = mistakeMade.trim();
      payload.lessonLearned = lessonLearned.trim();
      payload.screenshotAfter = screenshotAfter.trim() || undefined;
    }

    try {
      await onSubmit(payload);
      if (!initialTrade) resetForm(today);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save this trade.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm(nextDate: string) {
    setDate(nextDate);
    setPair("XAUUSD");
    setTradeType("Buy");
    setStrategy(STRATEGIES[0]);
    setSession("London");
    setTimeframe("M15");
    setEntryPrice("");
    setStopLoss("");
    setTakeProfit("");
    setLotSize("");
    setRiskAmount("");
    setEntryReason("");
    setChecklist(DEFAULT_CHECKLIST);
    setHtfBias("Unclear");
    setLiquiditySwept("None");
    setEntryPoi("FVG");
    setConfirmationTimeframe("M5");
    setSetupGrade("C");
    setNewsRisk("No major news");
    setTradingRuleStatus("Failed");
    setEmotionBefore("Calm");
    setScreenshotBefore("");
    setClosedNow(false);
    setExitPrice("");
    setFinalResult("Win");
    setProfitLoss("");
    setRMultiple("");
    setExitReason("");
    setMistakeMade("");
    setLessonLearned("");
    setScreenshotAfter("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Date">
          <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} />
        </Field>

        <Field label="Pair / Asset">
          <input required list="pair-options" value={pair} onChange={(event) => setPair(event.target.value)} className={inputClass} placeholder="XAUUSD" />
          <datalist id="pair-options">
            {PAIRS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </Field>

        <Field label="Trade type">
          <select value={tradeType} onChange={(event) => setTradeType(event.target.value as TradeType)} className={inputClass}>
            <option>Buy</option>
            <option>Sell</option>
          </select>
        </Field>

        <Field label="Strategy">
          <select value={strategy} onChange={(event) => setStrategy(event.target.value)} className={inputClass}>
            {STRATEGIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <Field label="Session">
          <select value={session} onChange={(event) => setSession(event.target.value as Session)} className={inputClass}>
            {SESSIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <Field label="Timeframe">
          <select value={timeframe} onChange={(event) => setTimeframe(event.target.value as Timeframe)} className={inputClass}>
            {TIMEFRAMES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
      </section>

      <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">{strategyDescription}</p>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Higher Timeframe Bias">
          <select value={htfBias} onChange={(event) => setHtfBias(event.target.value as HtfBias)} className={inputClass}>
            {HTF_BIASES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <Field label="Liquidity Swept">
          <select value={liquiditySwept} onChange={(event) => setLiquiditySwept(event.target.value as LiquiditySwept)} className={inputClass}>
            {LIQUIDITY_SWEPT_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <Field label="Entry POI">
          <select value={entryPoi} onChange={(event) => setEntryPoi(event.target.value as EntryPoi)} className={inputClass}>
            {ENTRY_POIS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <Field label="Confirmation Timeframe">
          <select value={confirmationTimeframe} onChange={(event) => setConfirmationTimeframe(event.target.value as ConfirmationTimeframe)} className={inputClass}>
            {CONFIRMATION_TIMEFRAMES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <Field label="Setup Grade">
          <select value={setupGrade} disabled className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-80`}>
            {SETUP_GRADES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <Field label="News Risk">
          <select value={newsRisk} onChange={(event) => setNewsRisk(event.target.value as NewsRisk)} className={inputClass}>
            {NEWS_RISKS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <Field label="Trading Rule Status">
          <select value={tradingRuleStatus} disabled className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-80`}>
            {TRADING_RULE_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <div className={cn("rounded-md border px-4 py-3", scoreCardClass(aPlusScore))}>
          <p className="text-xs font-semibold uppercase">A+ Score</p>
          <p className="mt-1 text-2xl font-bold">A+ Score: {aPlusScore}/15</p>
          <p className="mt-1 text-xs">Planned R:R {riskReward === null ? "not ready" : `1:${riskReward.toFixed(2)}`}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Field label="Entry price">
          <input required={!isNoTradeObservation} type="number" step="any" value={entryPrice} onChange={(event) => setEntryPrice(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Stop loss price">
          <input required={!isNoTradeObservation} type="number" step="any" value={stopLoss} onChange={(event) => setStopLoss(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Take profit price">
          <input required={!isNoTradeObservation} type="number" step="any" value={takeProfit} onChange={(event) => setTakeProfit(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Lot size">
          <input required={!isNoTradeObservation} type="number" step="any" value={lotSize} onChange={(event) => setLotSize(event.target.value)} className={inputClass} />
        </Field>
        <Field label="Risk amount">
          <input required={!isNoTradeObservation} type="number" step="any" value={riskAmount} onChange={(event) => setRiskAmount(event.target.value)} className={inputClass} />
        </Field>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Field label={isNoTradeObservation ? "Observation notes" : "Entry reason"}>
          <textarea required value={entryReason} onChange={(event) => setEntryReason(event.target.value)} className={`${inputClass} min-h-32`} placeholder="Why did this setup qualify, or why did you stand aside?" />
        </Field>

        <div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">A+ SMC checklist</p>
            <span className={cn("rounded-md px-3 py-1 text-xs font-bold", scoreBadgeClass(aPlusScore))}>A+ Score: {aPlusScore}/15</span>
          </div>
          <div className="mt-2 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2">
            {Object.entries(CHECKLIST_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={checklist[key as keyof Checklist]}
                  onChange={(event) => setChecklist((current) => ({ ...current, [key]: event.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950"
                />
                {label}
              </label>
            ))}
          </div>
          {!isNoTradeObservation && !qualifiesForAPlus ? (
            <div className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>This is not an A+ SMC setup yet. Consider waiting.</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Field label="Emotion before trade">
          <select value={emotionBefore} onChange={(event) => setEmotionBefore(event.target.value as Emotion)} className={inputClass}>
            {EMOTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>

        <ScreenshotInput label="Screenshot before trade" value={screenshotBefore} onChange={setScreenshotBefore} kind="before" />
      </section>

      {!isNoTradeObservation ? (
        <label className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <input type="checkbox" checked={closedNow} onChange={(event) => setClosedNow(event.target.checked)} className="h-4 w-4 rounded" />
          Mark this trade as already closed
        </label>
      ) : null}

      {closedNow && !isNoTradeObservation ? (
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-sm font-semibold">Closing details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Exit price">
              <input required={closedNow} type="number" step="any" value={exitPrice} onChange={(event) => setExitPrice(event.target.value)} className={inputClass} />
            </Field>
            <Field label="Final result">
              <select value={finalResult} onChange={(event) => setFinalResult(event.target.value as TradeResult)} className={inputClass}>
                <option>Win</option>
                <option>Loss</option>
                <option>Break-even</option>
              </select>
            </Field>
            <Field label="Profit/loss amount">
              <input required={closedNow} type="number" step="any" value={profitLoss} onChange={(event) => setProfitLoss(event.target.value)} className={inputClass} />
            </Field>
            <Field label="R-multiple result">
              <input required={closedNow} type="number" step="any" value={rMultiple} onChange={(event) => setRMultiple(event.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Exit reason">
              <textarea value={exitReason} onChange={(event) => setExitReason(event.target.value)} className={`${inputClass} min-h-24`} />
            </Field>
            <Field label="Mistake made">
              <textarea value={mistakeMade} onChange={(event) => setMistakeMade(event.target.value)} className={`${inputClass} min-h-24`} />
            </Field>
            <Field label="Lesson learned">
              <textarea value={lessonLearned} onChange={(event) => setLessonLearned(event.target.value)} className={`${inputClass} min-h-24`} />
            </Field>
            <ScreenshotInput label="After-trade screenshot" value={screenshotAfter} onChange={setScreenshotAfter} kind="after" />
          </div>
        </section>
      ) : null}

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={submitting}
          className="focus-ring inline-flex justify-center rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="focus-ring inline-flex justify-center rounded-md border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
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
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:focus:border-slate-200";

function toNumber(value: string) {
  return Number(value || 0);
}

function calculateRiskReward(tradeType: TradeType, entryValue: string, stopValue: string, targetValue: string) {
  const entry = toNumber(entryValue);
  const stop = toNumber(stopValue);
  const target = toNumber(targetValue);
  if (!entry || !stop || !target) return null;

  const risk = tradeType === "Buy" ? entry - stop : stop - entry;
  const reward = tradeType === "Buy" ? target - entry : entry - target;
  if (risk <= 0 || reward <= 0) return null;

  return reward / risk;
}

function scoreCardClass(score: number) {
  if (score >= 13) return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200";
  if (score >= 9) return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
  return "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200";
}

function scoreBadgeClass(score: number) {
  if (score >= 13) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (score >= 9) return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
  return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
}
