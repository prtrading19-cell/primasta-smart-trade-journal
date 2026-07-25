"use client";

import { useEffect } from "react";
import { cn } from "@/lib/format";
import type { EconomicEvent } from "@/types/economicCalendar";
import { ImpactBadge } from "@/components/economicCalendar/ImpactBadge";
import { StatusBadge } from "@/components/economicCalendar/StatusBadge";
import { CurrencyFlag } from "@/components/economicCalendar/CurrencyFlag";
import { Countdown } from "@/components/economicCalendar/Countdown";
import { X, Clock, TrendingUp, TrendingDown, AlertTriangle, Brain } from "lucide-react";

interface EventDrawerProps {
  event: EconomicEvent | null;
  onClose: () => void;
}

interface EventInsight {
  importance: string;
  goldImpact: string;
  currencyImpact: string;
}

function getEventInsight(event: EconomicEvent): EventInsight {
  const name = event.eventName.toLowerCase();
  const c = event.currency;
  const co = event.country;

  if (name.includes("gdp") || name.includes("gross domestic")) {
    return {
      importance: "GDP is the broadest measure of economic activity for " + co + ". Stronger-than-forecast readings signal economic expansion, which typically strengthens the " + c + " and can trigger risk-on sentiment across global markets.",
      goldImpact: "Strong GDP reduces gold demand as a safe haven, often causing price declines. Weak GDP fuels gold rallies on recession fears.",
      currencyImpact: "Directly drives " + c + " valuation. A positive surprise strengthens the currency; a miss weakens it.",
    };
  }

  if (name.includes("interest rate") || name.includes("rate decision") || name.includes("monetary policy")) {
    return {
      importance: "Interest rate decisions are the single most impactful events for " + c + ". Central bank policy shifts affect borrowing costs, capital flows, and global risk appetite simultaneously.",
      goldImpact: "Rate hikes are bearish for gold (higher opportunity cost); rate cuts are bullish for gold as yields fall.",
      currencyImpact: "Rate increases attract foreign capital, strengthening " + c + ". Cuts weaken " + c + " as yield differentials narrow.",
    };
  }

  if (name.includes("inflation") || name.includes("cpi") || name.includes("consumer price")) {
    return {
      importance: "Inflation data is a key input for central bank policy. Above-target CPI may accelerate tightening, while below-target readings could prompt dovish action. This directly shapes " + c + " interest rate expectations.",
      goldImpact: "Rising inflation supports gold as a store of value. Deflationary readings reduce gold appeal as an inflation hedge.",
      currencyImpact: "Higher-than-expected inflation strengthens " + c + " via rate hike expectations; lower readings weaken it.",
    };
  }

  if (name.includes("employment") || name.includes("non-farm") || name.includes("nonfarm") || name.includes("payroll") || name.includes("unemployment") || name.includes("jobless")) {
    return {
      importance: "Labor market data reflects the health of the " + co + " economy. Strong employment supports consumer spending and GDP growth, while deterioration signals economic weakness.",
      goldImpact: "Strong jobs data reduces safe-haven demand for gold; weak employment boosts gold as recession risk rises.",
      currencyImpact: "Robust employment figures strengthen " + c + "; deteriorating labor data weakens it as central banks may ease policy.",
    };
  }

  if (name.includes("pmi") || name.includes("manufacturing") || name.includes("ism")) {
    return {
      importance: "PMI data provides a leading indicator of economic expansion or contraction. Readings above 50 signal growth; below 50 indicates contraction. This shapes forward-looking " + c + " market positioning.",
      goldImpact: "Expanding PMI reduces gold demand; contracting PMI increases safe-haven flows into gold.",
      currencyImpact: "Strong PMI readings support " + c + " through improved growth expectations; weak readings undermine it.",
    };
  }

  if (name.includes("retail") || name.includes("consumer") || name.includes("spending")) {
    return {
      importance: "Consumer spending accounts for a significant portion of " + co + " GDP. This data reveals real-time economic momentum and consumer confidence trends.",
      goldImpact: "Strong retail sales reduce gold safe-haven appeal; weak consumer spending increases gold demand.",
      currencyImpact: "Rising consumer spending supports " + c + " through stronger growth expectations; declines weaken it.",
    };
  }

  if (name.includes("trade balance") || name.includes("trade deficit") || name.includes("trade surplus")) {
    return {
      importance: "Trade balance data reflects the flow of goods and services between " + co + " and its trading partners. Persistent deficits can weaken " + c + " over time.",
      goldImpact: "Widening trade deficits can weaken " + c + " and increase gold demand as a store of value.",
      currencyImpact: "Improving trade balance supports " + c + "; widening deficits create headwinds.",
    };
  }

  return {
    importance: "This event directly impacts " + c + " valuation and global market sentiment. Traders should monitor for deviations from forecast that could trigger volatility.",
    goldImpact: "High impact events can cause significant gold price movement. Monitor deviations from forecast for trading opportunities.",
    currencyImpact: "Directly affects " + c + " strength. Unexpected data releases can trigger immediate and sustained directional moves.",
  };
}

function DetailRow({ label, value, highlighted }: { label: string; value: string; highlighted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={cn("text-sm font-medium", highlighted ? "text-gold" : "text-text-primary")}>
        {value || "N/A"}
      </span>
    </div>
  );
}

export function EventDrawer({ event, onClose }: EventDrawerProps) {
  const isOpen = event !== null;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const insight = event ? getEventInsight(event) : null;

  return (
    <div className="relative z-50">
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md bg-surface-card border-l border-border-subtle transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="h-full overflow-y-auto">
          {event && (
            <div className="flex flex-col h-full">
              <div className="sticky top-0 z-10 bg-surface-card border-b border-border-subtle px-6 py-4">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                <h2 className="text-lg font-bold text-text-primary pr-10">
                  {event.eventName}
                </h2>

                <div className="flex items-center gap-2 mt-2">
                  <CurrencyFlag currency={event.currency} />
                  <StatusBadge status={event.status === "Pending" ? "Upcoming" : event.status} />
                  <ImpactBadge impact={event.impact} />
                </div>
              </div>

              <div className="flex-1 p-6 space-y-5">
                <div className="bg-surface-panel rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Key Details
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailRow label="Country" value={event.country} />
                    <DetailRow label="Currency" value={event.currency} />
                    <div className="col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-muted">Importance</span>
                        <ImpactBadge impact={event.impact} size="sm" />
                      </div>
                    </div>
                    <DetailRow label="Release Time" value={event.time + " - " + event.date} />
                    <DetailRow label="Status" value={event.status} />
                    <DetailRow label="Forecast" value={event.forecast} />
                    <DetailRow label="Previous" value={event.previous} />
                    <DetailRow label="Actual" value={event.actual} highlighted={!!event.actual} />
                    <DetailRow label="Source" value={event.source} />
                  </div>
                </div>

                {insight && (
                  <div className="bg-surface-panel rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-gold" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                        AI Event Analysis
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary mb-1">
                          Why This Event Matters
                        </h4>
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {insight.importance}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingUp className="h-3.5 w-3.5 text-text-muted" />
                          <h4 className="text-sm font-semibold text-text-primary">
                            Typical Impact on Gold
                          </h4>
                        </div>
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {insight.goldImpact}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingDown className="h-3.5 w-3.5 text-text-muted" />
                          <h4 className="text-sm font-semibold text-text-primary">
                            {"Typical Impact on " + event.currency}
                          </h4>
                        </div>
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {insight.currencyImpact}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-text-muted" />
                          <span className="text-sm font-semibold text-text-primary">
                            Market Volatility
                          </span>
                        </div>
                        <ImpactBadge impact={event.impact} size="sm" />
                      </div>
                    </div>
                  </div>
                )}

                {event.status === "Upcoming" && (
                  <div className="bg-surface-panel rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-gold" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                        Next Release In
                      </h3>
                    </div>
                    <div className="flex justify-center py-2">
                      <Countdown
                        targetTime={event.date + "T" + event.time}
                        status={event.status}
                      />
                    </div>
                  </div>
                )}

                <div className="bg-surface-panel rounded-xl p-4">
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Monitor this event for potential trading opportunities. Watch for deviations from forecast values that may trigger market volatility.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
