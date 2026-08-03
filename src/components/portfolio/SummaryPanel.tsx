import { MessageSquareQuote, Sparkles } from "lucide-react";
import type { PortfolioSummary } from "./types";

export function SummaryPanel({ summary }: { summary: PortfolioSummary }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
      <div className="flex items-center gap-2 border-b border-border-subtle px-5 py-3">
        <MessageSquareQuote className="h-4 w-4 text-gold" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">Portfolio Summary</h3>
      </div>
      <div className="p-5">
        <p className="text-base font-black leading-snug text-text-primary">{summary.headline}</p>
        <p className="mt-3 text-sm leading-6 text-text-secondary">{summary.overview}</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {summary.keyPoints.map((k, i) => (
            <p key={i} className="flex items-start gap-2 rounded-lg bg-surface-panel/40 px-3 py-2 text-xs leading-5 text-text-secondary">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              {k}
            </p>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {summary.tags.map((t) => (
            <span key={t} className="rounded bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold">
              #{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
