"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  EconomicEvent,
  CalendarFilterState,
  CalendarStats,
  EconomicImpact,
} from "@/types/economicCalendar";

const DEFAULT_FILTER: CalendarFilterState = {
  dateRange: "today",
  impacts: [],
  currencies: [],
  searchQuery: "",
};

const AUTO_REFRESH_INTERVAL = 60_000;

function applyFilter(events: EconomicEvent[], filter: CalendarFilterState): EconomicEvent[] {
  let result = [...events];

  if (filter.dateRange !== "all") {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (filter.dateRange === "today") {
      result = result.filter((e) => e.date === todayStr);
    } else if (filter.dateRange === "tomorrow") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      result = result.filter((e) => e.date === tomorrowStr);
    } else if (filter.dateRange === "thisWeek") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const startStr = startOfWeek.toISOString().split("T")[0];
      const endStr = endOfWeek.toISOString().split("T")[0];
      result = result.filter((e) => e.date >= startStr && e.date <= endStr);
    }
  }

  if (filter.impacts.length > 0) {
    result = result.filter((e) => filter.impacts.includes(e.impact));
  }

  if (filter.currencies.length > 0) {
    result = result.filter((e) => filter.currencies.includes(e.currency));
  }

  if (filter.searchQuery.trim()) {
    const q = filter.searchQuery.toLowerCase();
    result = result.filter(
      (e) =>
        e.eventName.toLowerCase().includes(q) ||
        e.currency.toLowerCase().includes(q) ||
        e.country.toLowerCase().includes(q)
    );
  }

  return result;
}

function computeStats(events: EconomicEvent[], allEvents: EconomicEvent[]): CalendarStats {
  const highImpactCount = events.filter((e) => e.impact === "High").length;
  const mediumImpactCount = events.filter((e) => e.impact === "Medium").length;
  const lowImpactCount = events.filter((e) => e.impact === "Low").length;
  const upcomingCount = events.filter((e) => e.status === "Upcoming").length;
  const liveCount = events.filter((e) => e.status === "Live").length;
  const releasedCount = events.filter((e) => e.status === "Released").length;
  const usdEventsToday = allEvents.filter(
    (e) => e.currency === "USD" && e.date === new Date().toISOString().split("T")[0]
  ).length;

  const upcomingEvents = allEvents
    .filter((e) => e.status === "Upcoming")
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const nextEvent = upcomingEvents[0];

  let marketStatus = "Closed";
  if (liveCount > 0) {
    marketStatus = "Active";
  } else if (upcomingCount > 0) {
    marketStatus = "Pre-Market";
  }

  return {
    totalEvents: events.length,
    highImpactCount,
    mediumImpactCount,
    lowImpactCount,
    upcomingCount,
    liveCount,
    releasedCount,
    nextEventName: nextEvent?.eventName ?? "—",
    nextEventCountdown: nextEvent ? `${nextEvent.date}T${nextEvent.time}` : "",
    usdEventsToday,
    marketStatus,
  };
}

export function useEconomicCalendar() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<CalendarFilterState>(DEFAULT_FILTER);
  const [lastSync, setLastSync] = useState<string>("");
  const [source, setSource] = useState<string>("");

  const fetchEvents = useCallback(async () => {
    try {
      setLoading((prev) => (events.length === 0 ? true : prev));
      const res = await fetch("/api/economic-calendar");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(data.events ?? []);
      setLastSync(data.lastSync ?? "");
      setSource(data.source ?? "");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch calendar data");
    } finally {
      setLoading(false);
    }
  }, [events.length]);

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hasLive = events.some((e) => e.status === "Live");
    if (!hasLive) return;

    const id = setInterval(fetchEvents, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [events, fetchEvents]);

  const setFilter = useCallback((newFilter: CalendarFilterState) => {
    setFilterState(newFilter);
  }, []);

  const updateFilter = useCallback((partial: Partial<CalendarFilterState>) => {
    setFilterState((prev) => ({ ...prev, ...partial }));
  }, []);

  const filteredEvents = useMemo(() => applyFilter(events, filter), [events, filter]);
  const stats = useMemo(() => computeStats(filteredEvents, events), [filteredEvents, events]);

  return {
    events,
    filteredEvents,
    loading,
    error,
    filter,
    setFilter,
    updateFilter,
    refetch: fetchEvents,
    stats,
    lastSync,
    source,
  };
}
