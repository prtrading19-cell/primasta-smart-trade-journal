import { GitBranch } from "lucide-react";
import type { InstitutionalTimelineEntry } from "./types";
import { Panel, formatTime } from "./primitives";
import { cn } from "@/lib/format";

export function TimelinePanel({ timeline }: { timeline: InstitutionalTimelineEntry[] }) {
  if (timeline.length === 0) {
    return (
      <Panel eyebrow="Pipeline" title="Research Execution Timeline" icon={GitBranch}>
        <p className="py-6 text-center text-sm text-text-muted">No pipeline executions recorded yet.</p>
      </Panel>
    );
  }
  return (
    <Panel eyebrow="Pipeline" title="Research Execution Timeline" icon={GitBranch} badge={<span className="rounded bg-surface-panel px-2 py-0.5 text-[10px] font-bold text-text-muted">{timeline.length}</span>}>
      <ol className="relative space-y-4 border-l border-border-subtle pl-5">
        {timeline.map((entry) => (
          <li key={`${entry.timestamp}-${entry.engine}`} className="relative">
            <span className="absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full border-2 border-gold bg-surface-card" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-text-primary">{entry.engine}</span>
              <span className="text-[9px] text-text-muted">{formatTime(entry.timestamp)}</span>
              <span className="ml-auto text-[9px] font-mono text-text-muted">{entry.durationMs}ms</span>
            </div>
            <p className={cn(
              "mt-0.5 text-xs font-semibold",
              entry.result.includes("error") || entry.result.includes("fail") ? "text-loss"
              : entry.result.includes("success") || entry.result.includes("complete") ? "text-profit"
              : "text-text-secondary"
            )}>{entry.result}</p>
            {entry.confidence > 0 && (
              <div className="mt-1 h-1 w-28 overflow-hidden rounded-full bg-surface-panel">
                <div className="h-full rounded-full bg-gradient-to-r from-gold via-gold-dim to-gold" style={{ width: `${entry.confidence}%` }} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </Panel>
  );
}
