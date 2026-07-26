"use client";

import Link from "next/link";
import { Calculator, Clipboard, History, Save, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppData } from "@/context/AppDataContext";
import { ACCOUNT_CURRENCIES, CALCULATOR_SYMBOLS, RISK_PERCENTAGE_OPTIONS, SYMBOL_PRESETS, calculateLotMargin } from "@/lib/lotMargin";
import { cn, number } from "@/lib/format";
import type { AccountCurrency, CalculatorRiskType, CalculatorSymbol, LotMarginInput } from "@/types/lotMargin";
import type { TradeType } from "@/types/trade";

const inputClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-slate-200";

export function LotMarginCalculator() {
  const { addLotMarginCalculation } = useAppData();
  const [accountBalance, setAccountBalance] = useState("1000");
  const [accountCurrency, setAccountCurrency] = useState<AccountCurrency>("USD");
  const [riskType, setRiskType] = useState<CalculatorRiskType>("Percentage");
  const [riskPreset, setRiskPreset] = useState<(typeof RISK_PERCENTAGE_OPTIONS)[number]>("0.25");
  const [riskPercentage, setRiskPercentage] = useState("0.25");
  const [fixedRiskAmount, setFixedRiskAmount] = useState("");
  const [symbol, setSymbol] = useState<CalculatorSymbol>("XAUUSD");
  const [customSymbol, setCustomSymbol] = useState("");
  const [tradeType, setTradeType] = useState<TradeType>("Buy");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [takeProfitPrice, setTakeProfitPrice] = useState("");
  const [leverage, setLeverage] = useState(String(SYMBOL_PRESETS.XAUUSD.leverage));
  const [contractSize, setContractSize] = useState(String(SYMBOL_PRESETS.XAUUSD.contractSize));
  const [pipSize, setPipSize] = useState(String(SYMBOL_PRESETS.XAUUSD.pipSize));
  const [pipValuePerLot, setPipValuePerLot] = useState(String(SYMBOL_PRESETS.XAUUSD.pipValuePerLot));
  const [lotStep, setLotStep] = useState(String(SYMBOL_PRESETS.XAUUSD.lotStep));
  const [minLot, setMinLot] = useState(String(SYMBOL_PRESETS.XAUUSD.minLot));
  const [maxLot, setMaxLot] = useState(String(SYMBOL_PRESETS.XAUUSD.maxLot));
  const [currentMarketPrice, setCurrentMarketPrice] = useState("");
  const [conversionRate, setConversionRate] = useState("1");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const activeSymbol = symbol === "Custom" ? customSymbol.trim().toUpperCase() || "Custom" : symbol;
  const input = useMemo<LotMarginInput>(
    () => ({
      accountBalance: toNumber(accountBalance),
      accountCurrency,
      riskType,
      riskPercentage: toNumber(riskPercentage),
      fixedRiskAmount: toNumber(fixedRiskAmount),
      symbol: activeSymbol,
      tradeType,
      entryPrice: toNumber(entryPrice),
      stopLossPrice: toNumber(stopLossPrice),
      takeProfitPrice: takeProfitPrice ? toNumber(takeProfitPrice) : undefined,
      leverage: toNumber(leverage),
      contractSize: toNumber(contractSize),
      pipSize: toNumber(pipSize),
      pipValuePerLot: toNumber(pipValuePerLot),
      lotStep: toNumber(lotStep),
      minLot: toNumber(minLot),
      maxLot: toNumber(maxLot),
      currentMarketPrice: currentMarketPrice ? toNumber(currentMarketPrice) : undefined,
      conversionRate: conversionRate ? toNumber(conversionRate) : 1,
      notes
    }),
    [accountBalance, accountCurrency, activeSymbol, contractSize, conversionRate, currentMarketPrice, entryPrice, fixedRiskAmount, leverage, lotStep, maxLot, minLot, notes, pipSize, pipValuePerLot, riskPercentage, riskType, stopLossPrice, takeProfitPrice, tradeType]
  );
  const result = useMemo(() => calculateLotMargin(input), [input]);
  const newTradeHref = `/new-trade?pair=${encodeURIComponent(activeSymbol)}&tradeType=${tradeType}&entryPrice=${input.entryPrice || ""}&stopLoss=${input.stopLossPrice || ""}&takeProfit=${input.takeProfitPrice ?? ""}&lotSize=${result.calculatedLotSize || ""}&riskAmount=${result.riskAmount || ""}`;

  function handleSymbolChange(nextSymbol: CalculatorSymbol) {
    setSymbol(nextSymbol);
    const preset = SYMBOL_PRESETS[nextSymbol];
    setContractSize(String(preset.contractSize));
    setPipSize(String(preset.pipSize));
    setPipValuePerLot(String(preset.pipValuePerLot));
    setLotStep(String(preset.lotStep));
    setMinLot(String(preset.minLot));
    setMaxLot(String(preset.maxLot));
    setLeverage(String(preset.leverage));
  }

  function handleRiskPreset(value: (typeof RISK_PERCENTAGE_OPTIONS)[number]) {
    setRiskPreset(value);
    if (value !== "Custom") setRiskPercentage(value);
  }

  async function saveCalculation() {
    setMessage("");
    if (!result.isValid) {
      setMessage("Fix the invalid trade warnings before saving this calculation.");
      return;
    }

    try {
      await addLotMarginCalculation({ ...input, ...result });
      setMessage("Calculation saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save calculation.");
    }
  }

  async function copyLotSize() {
    await navigator.clipboard.writeText(String(result.calculatedLotSize));
    setMessage("Lot size copied.");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Trading calculator</p>
          <h1 className="text-2xl font-bold tracking-tight">TradeOS Lot Size & Margin Calculator</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Calculate safest lot size, risk amount, risk-to-reward, and estimated margin before placing a trade.</p>
        </div>
        <Link href="/calculator/history" className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-800">
          <History className="h-4 w-4" />
          History
        </Link>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Panel title="Lot Size Calculator">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Account Balance">
                <input type="number" step="any" value={accountBalance} onChange={(event) => setAccountBalance(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Account Currency">
                <select value={accountCurrency} onChange={(event) => setAccountCurrency(event.target.value as AccountCurrency)} className={inputClass}>
                  {ACCOUNT_CURRENCIES.map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </select>
              </Field>
              <Field label="Risk Type">
                <select value={riskType} onChange={(event) => setRiskType(event.target.value as CalculatorRiskType)} className={inputClass}>
                  <option>Percentage</option>
                  <option>Fixed Amount</option>
                </select>
              </Field>
              {riskType === "Percentage" ? (
                <>
                  <Field label="Risk Percentage">
                    <select value={riskPreset} onChange={(event) => handleRiskPreset(event.target.value as (typeof RISK_PERCENTAGE_OPTIONS)[number])} className={inputClass}>
                      {RISK_PERCENTAGE_OPTIONS.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Custom Risk %">
                    <input type="number" step="any" value={riskPercentage} onChange={(event) => setRiskPercentage(event.target.value)} disabled={riskPreset !== "Custom"} className={`${inputClass} disabled:opacity-60`} />
                  </Field>
                </>
              ) : (
                <Field label="Fixed Risk Amount">
                  <input type="number" step="any" value={fixedRiskAmount} onChange={(event) => setFixedRiskAmount(event.target.value)} className={inputClass} />
                </Field>
              )}
              <Field label="Symbol / Instrument">
                <select value={symbol} onChange={(event) => handleSymbolChange(event.target.value as CalculatorSymbol)} className={inputClass}>
                  {CALCULATOR_SYMBOLS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              {symbol === "Custom" ? (
                <Field label="Custom Symbol">
                  <input value={customSymbol} onChange={(event) => setCustomSymbol(event.target.value)} className={inputClass} placeholder="Example: NAS100.cash" />
                </Field>
              ) : null}
              <Field label="Trade Type">
                <select value={tradeType} onChange={(event) => setTradeType(event.target.value as TradeType)} className={inputClass}>
                  <option>Buy</option>
                  <option>Sell</option>
                </select>
              </Field>
              <Field label="Entry Price">
                <input type="number" step="any" value={entryPrice} onChange={(event) => setEntryPrice(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Stop Loss Price">
                <input type="number" step="any" value={stopLossPrice} onChange={(event) => setStopLossPrice(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Take Profit Price">
                <input type="number" step="any" value={takeProfitPrice} onChange={(event) => setTakeProfitPrice(event.target.value)} className={inputClass} />
              </Field>
            </div>
          </Panel>

          <Panel title="Broker Contract Settings">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Leverage">
                <input type="number" step="any" value={leverage} onChange={(event) => setLeverage(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Contract Size">
                <input type="number" step="any" value={contractSize} onChange={(event) => setContractSize(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Pip Size / Tick Size">
                <input type="number" step="any" value={pipSize} onChange={(event) => setPipSize(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Pip Value Per Standard Lot">
                <input type="number" step="any" value={pipValuePerLot} onChange={(event) => setPipValuePerLot(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Lot Step">
                <input type="number" step="any" value={lotStep} onChange={(event) => setLotStep(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Minimum Lot">
                <input type="number" step="any" value={minLot} onChange={(event) => setMinLot(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Maximum Lot">
                <input type="number" step="any" value={maxLot} onChange={(event) => setMaxLot(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Current Market Price">
                <input type="number" step="any" value={currentMarketPrice} onChange={(event) => setCurrentMarketPrice(event.target.value)} className={inputClass} placeholder="Optional" />
              </Field>
              <Field label="Conversion Rate">
                <input type="number" step="any" value={conversionRate} onChange={(event) => setConversionRate(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Notes">
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} min-h-24`} placeholder="Optional broker or setup notes" />
              </Field>
            </div>
          </Panel>
        </div>

        <ResultPanel input={input} result={result} onCopy={() => void copyLotSize()} onSave={() => void saveCalculation()} newTradeHref={newTradeHref} message={message} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="font-semibold">My risk rule:</p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">I risk only 0.25% to 0.5% per trade until I have proven consistency. I do not increase lot size to recover losses. I only trade when setup, risk, and psychology agree.</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          This calculator is an estimate. Always confirm contract size, margin rules, pip value, and lot step with your broker before placing a live trade.
        </div>
      </section>
    </div>
  );
}

function ResultPanel({ input, result, onCopy, onSave, newTradeHref, message }: { input: LotMarginInput; result: ReturnType<typeof calculateLotMargin>; onCopy: () => void; onSave: () => void; newTradeHref: string; message: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:sticky xl:top-6 xl:self-start">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Recommended Lot Size</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{number(result.calculatedLotSize, 2)}</p>
        </div>
        <span className={cn("rounded-md px-3 py-1 text-xs font-bold", statusClass(result.finalRiskStatus))}>{result.finalRiskStatus}</span>
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        <ResultRow label="Risk Amount" value={formatMoney(result.riskAmount, input.accountCurrency)} />
        <ResultRow label="Stop Distance" value={`${number(result.stopDistance, 5)}${result.stopDistanceInPips !== null ? ` / ${number(result.stopDistanceInPips, 1)} pips` : ""}`} />
        <ResultRow label="Estimated Loss if SL hits" value={formatMoney(result.estimatedLoss, input.accountCurrency)} />
        <ResultRow label="Estimated Profit if TP hits" value={result.estimatedProfit === null ? "TP not entered" : formatMoney(result.estimatedProfit, input.accountCurrency)} />
        <ResultRow label="Risk-to-Reward" value={result.riskRewardRatio === null ? "TP not entered" : `1:${number(result.riskRewardRatio, 2)}`} />
        <ResultRow label="Notional Value" value={formatMoney(result.notionalValue, input.accountCurrency)} />
        <ResultRow label="Margin Required" value={formatMoney(result.marginRequired, input.accountCurrency)} />
        <ResultRow label="Margin Used" value={`${number(result.marginUsedPercentage, 2)}%`} />
        <ResultRow label="Free Balance After Margin" value={formatMoney(result.estimatedFreeBalanceAfterMargin, input.accountCurrency)} />
        <ResultRow label="Final Guidance" value={result.guidance} />
      </div>

      {result.warnings.length ? (
        <div className="mt-4 space-y-2">
          {result.warnings.map((warning) => (
            <p key={warning} className={cn("rounded-md px-3 py-2 text-sm", warningClass(warning))}>{warning}</p>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2">
        <button type="button" onClick={onCopy} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-800">
          <Clipboard className="h-4 w-4" />
          Copy Lot Size
        </button>
        <Link href={newTradeHref} className={cn("focus-ring inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold", result.isValid ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "pointer-events-none bg-slate-200 text-slate-500 dark:bg-slate-800")}>
          <Send className="h-4 w-4" />
          Use This Calculation in New Trade
        </Link>
        <button type="button" onClick={onSave} className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-800">
          <Save className="h-4 w-4" />
          Save Calculation
        </button>
      </div>
      {message ? <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">{message}</p> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2">
        <Calculator className="h-4 w-4 text-slate-500" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
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

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-4 py-3 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

function statusClass(value: string) {
  if (value === "Safe") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (value === "Caution") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
  return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
}

function warningClass(value: string) {
  if (value.includes("below your trading plan") || value.includes("above 20%")) return "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
  return "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200";
}

function formatMoney(value: number, currency: AccountCurrency) {
  if (currency === "Custom") return number(value, 2);
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(value || 0);
}

function toNumber(value: string) {
  return Number(value || 0);
}
