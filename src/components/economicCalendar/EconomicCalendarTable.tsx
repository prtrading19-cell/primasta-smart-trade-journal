"use client";

import { EconomicEvent, EventStatus } from "@/types/economicCalendar";
import { ImpactBadge } from "@/components/economicCalendar/ImpactBadge";
import { StatusBadge } from "@/components/economicCalendar/StatusBadge";
import { CurrencyFlag } from "@/components/economicCalendar/CurrencyFlag";
import { Countdown } from "@/components/economicCalendar/Countdown";
import { cn } from "@/lib/format";
import { formatEventTime, getStatusForEvent } from "@/lib/economicCalendar/utils";

function toEventStatus(status: EconomicEvent["status"]): EventStatus {
  if (status === "Pending") return "Upcoming";
  return status;
}

interface EconomicCalendarTableProps {
  events: EconomicEvent[];
  onEventClick: (event: EconomicEvent) => void;
}

function getImpactBorderClass(impact: string): string {
  switch (impact.toLowerCase()) {
    case "high":
      return "border-l-2 border-l-loss";
    case "medium":
      return "border-l-2 border-l-amber-400";
    case "low":
      return "border-l-2 border-l-profit";
    default:
      return "border-l-2 border-l-transparent";
  }
}

export function EconomicCalendarTable({
  events,
  onEventClick,
}: EconomicCalendarTableProps) {
  if (events.length === 0) {
    return (
      <div className="bg-surface-card border border-border-subtle rounded-xl p-8 text-center">
        <p className="text-text-muted text-sm">No economic events found.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-panel text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Countdown</th>
              <th className="px-4 py-3 text-left">Currency</th>
              <th className="px-4 py-3 text-left">Impact</th>
              <th className="px-4 py-3 text-left w-full">Event</th>
              <th className="hidden md:table-cell px-4 py-3 text-left">Forecast</th>
              <th className="hidden md:table-cell px-4 py-3 text-left">Previous</th>
              <th className="px-4 py-3 text-left">Actual</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => {
              const isFirst = index === 0;
              const isLast = index === events.length - 1;

              return (
                <tr
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={cn(
                    "border-b border-border-subtle hover:bg-surface-hover cursor-pointer transition-colors",
                    getImpactBorderClass(event.impact),
                    isFirst && "rounded-t-xl",
                    isLast && "rounded-b-xl"
                  )}
                >
                  <td className="px-4 py-3 text-xs font-mono text-text-secondary">
                    {formatEventTime(event.time, event.date)}
                  </td>
                  <td className="px-4 py-3">
                    <Countdown
                      targetTime={`${event.date}T${event.time}`}
                      status={toEventStatus(event.status)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <CurrencyFlag currency={event.currency} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <ImpactBadge impact={event.impact} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">
                    {event.eventName}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-text-secondary">
                    {event.forecast || "\u2014"}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 text-sm text-text-secondary">
                    {event.previous || "\u2014"}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-sm",
                      event.actual
                        ? "font-semibold text-gold"
                        : "text-text-muted"
                    )}
                  >
                    {event.actual || "\u2014"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={toEventStatus(event.status)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
