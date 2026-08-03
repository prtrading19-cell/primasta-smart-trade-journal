"use client";

import { Activity } from "lucide-react";
import type { ExecutionTimelineEntry } from "@/lib/trading";
import { PanelShell } from "./primitives";
import { formatTime } from "@/components/institutional/primitives";

export function ExecutionTimelinePanel({ timeline }: { timeline: ExecutionTimelineEntry[] }) {
  return (
    <PanelShell eyebrow="Execution Trail" title="Execution Timeline" icon={Activity} badge={<span className="text-[10px] text-text-muted">{timeline.length} events</span>}>
      {timeline.length === 0 ? (
        <p className="text-xs text-text-muted">No execution events yet. Execute a signal to begin the trail.</p>
      ) : (
        <ol className="relative space-y-3 border-l border-border-subtle pl-4">
          {timeline.slice(0, 30).map((entry, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-gold/70" />
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-bold text-text-primary">{entry.detail}</p>
                <span className="shrink-0 text-[10px] text-text-muted">{formatTime(entry.timestamp)}</span>
              </div>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-gold">{entry.type}</p>
            </li>
          ))}
        </ol>
      )}
    </PanelShell>
  );
}
