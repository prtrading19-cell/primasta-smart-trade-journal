import { Milestone } from "lucide-react";
import { Panel, formatTime } from "@/components/institutional/primitives";
import type { PortfolioTimelineEntry } from "./types";

export function TimelinePanel({ timeline }: { timeline: PortfolioTimelineEntry[] }) {
  return (
    <Panel eyebrow="Timeline" title="Engine Execution" icon={Milestone}>
      {timeline.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">No engine activity recorded.</p>
      ) : (
        <div className="space-y-2">
          {timeline.map((t, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-surface-panel/40 px-3 py-2">
              <div className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-gold" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-text-primary">{t.engine}</p>
                  <span className="text-[10px] text-text-muted">{formatTime(t.timestamp)}</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-text-secondary" title={t.result}>{t.result}</p>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-text-muted">
                  <span>conf {t.confidence}%</span>
                  <span>{t.durationMs}ms</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
