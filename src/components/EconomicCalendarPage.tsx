"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useEconomicCalendar } from "@/lib/economicCalendar/hooks/useEconomicCalendar";
import CalendarHeader from "@/components/economicCalendar/CalendarHeader";
import { CalendarStats } from "@/components/economicCalendar/CalendarStats";
import CalendarSearch from "@/components/economicCalendar/CalendarSearch";
import { CalendarFilters } from "@/components/economicCalendar/CalendarFilters";
import { EconomicCalendarTable } from "@/components/economicCalendar/EconomicCalendarTable";
import { EventDrawer } from "@/components/economicCalendar/EventDrawer";
import { CalendarLoading } from "@/components/economicCalendar/CalendarLoading";
import { CalendarEmptyState } from "@/components/economicCalendar/CalendarEmptyState";
import type { EconomicEvent } from "@/types/economicCalendar";

export function EconomicCalendarPage() {
  const {
    filteredEvents,
    loading,
    error,
    filter,
    setFilter,
    updateFilter,
    refetch,
    stats,
    source,
  } = useEconomicCalendar();

  const [selectedEvent, setSelectedEvent] = useState<EconomicEvent | null>(null);

  const hasActiveFilters =
    filter.impacts.length > 0 ||
    filter.currencies.length > 0 ||
    filter.searchQuery.trim().length > 0 ||
    filter.goldFocus;

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 lg:px-8">
        <CalendarHeader />
        <CalendarLoading />
      </div>
    );
  }

  if (error && filteredEvents.length === 0) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 lg:px-8">
        <CalendarHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-loss/10">
              <AlertTriangle className="h-6 w-6 text-loss" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              Economic Calendar Unavailable
            </h3>
            <p className="text-sm text-text-muted mb-4">
              Unable to retrieve economic calendar.
            </p>
            <button
              onClick={() => void refetch()}
              className="rounded-lg bg-gold/10 px-5 py-2.5 text-sm font-medium text-gold border border-gold/30 hover:bg-gold/20 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
        <CalendarHeader />

        <div className="space-y-4">
          <CalendarStats stats={stats} />

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="w-full lg:w-64 shrink-0">
              <CalendarFilters filter={filter} onFilterChange={setFilter} />
            </div>

            <div className="flex-1 space-y-4">
              <CalendarSearch
                value={filter.searchQuery}
                onChange={(q) => updateFilter({ searchQuery: q })}
              />

              <div className="flex items-center justify-between">
                <p className="text-xs text-text-muted">
                  {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
                  {hasActiveFilters ? " (filtered)" : ""}
                  {filter.goldFocus ? " \u2014 Gold Focus" : ""}
                </p>
                <button
                  onClick={() => void refetch()}
                  className="text-xs text-text-muted hover:text-gold transition-colors"
                >
                  Refresh
                </button>
              </div>

              {filteredEvents.length === 0 ? (
                <CalendarEmptyState source={source} hasFilters={hasActiveFilters} />
              ) : (
                <EconomicCalendarTable
                  events={filteredEvents}
                  onEventClick={setSelectedEvent}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <EventDrawer
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
