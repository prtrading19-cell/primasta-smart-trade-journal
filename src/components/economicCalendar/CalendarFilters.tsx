"use client";

import { cn } from "@/lib/format";
import { TIMEFRAMES } from "@/lib/economicCalendar/constants";
import { CURRENCIES } from "@/types/economicCalendar";
import { ImpactBadge } from "@/components/economicCalendar/ImpactBadge";
import { CurrencyFlag } from "@/components/economicCalendar/CurrencyFlag";
import type { CalendarFilterState, EconomicImpact } from "@/types/economicCalendar";
import { TrendingUp } from "lucide-react";

interface CalendarFiltersProps {
  filter: CalendarFilterState;
  onFilterChange: (filter: CalendarFilterState) => void;
}

const IMPACT_OPTIONS: EconomicImpact[] = ["High", "Medium", "Low"];

export function CalendarFilters({ filter, onFilterChange }: CalendarFiltersProps) {
  function setDateRange(dateRange: CalendarFilterState["dateRange"]) {
    onFilterChange({ ...filter, dateRange });
  }

  function toggleImpact(impact: EconomicImpact) {
    const impacts = filter.impacts.includes(impact)
      ? filter.impacts.filter((i) => i !== impact)
      : [...filter.impacts, impact];
    onFilterChange({ ...filter, impacts });
  }

  function toggleCurrency(currency: string) {
    const currencies = filter.currencies.includes(currency)
      ? filter.currencies.filter((c) => c !== currency)
      : [...filter.currencies, currency];
    onFilterChange({ ...filter, currencies });
  }

  function toggleGoldFocus() {
    onFilterChange({ ...filter, goldFocus: !filter.goldFocus });
  }

  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-4 space-y-4">
      {/* Gold Focus Mode */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          Focus Mode
        </p>
        <button
          onClick={toggleGoldFocus}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors w-full",
            filter.goldFocus
              ? "bg-gold/10 text-gold border-gold/30"
              : "bg-surface-panel text-text-secondary border-border-subtle hover:border-text-muted/30"
          )}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Gold Focus</span>
        </button>
      </div>

      {/* Date Range */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          Date Range
        </p>
        <div className="flex flex-wrap gap-2">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setDateRange(tf.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                filter.dateRange === tf.id
                  ? "bg-gold/10 text-gold border-gold/30"
                  : "bg-surface-panel text-text-secondary border-border-subtle hover:border-text-muted/30"
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Impact */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          Impact
        </p>
        <div className="flex flex-wrap gap-2">
          {IMPACT_OPTIONS.map((impact) => {
            const isActive = filter.impacts.includes(impact);
            return (
              <button
                key={impact}
                onClick={() => toggleImpact(impact)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-gold/10 text-gold border-gold/30"
                    : "bg-surface-panel text-text-secondary border-border-subtle hover:border-text-muted/30"
                )}
              >
                <ImpactBadge impact={impact} size="sm" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Currency */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
          Currency
        </p>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
          {CURRENCIES.map((curr) => {
            const isActive = filter.currencies.includes(curr.code);
            return (
              <button
                key={curr.code}
                onClick={() => toggleCurrency(curr.code)}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-gold/10 text-gold border-gold/30"
                    : "bg-surface-panel text-text-secondary border-border-subtle hover:border-text-muted/30"
                )}
              >
                <CurrencyFlag currency={curr.code} size="sm" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
