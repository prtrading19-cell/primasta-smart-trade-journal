import { History, RefreshCw } from "lucide-react";
import { Panel, formatTime } from "@/components/institutional/primitives";
import type { PortfolioHistoryEntry } from "./types";

const biasTone: Record<string, string> = {
  Bullish: "text-profit",
  "Strong Bullish": "text-profit",
  Bearish: "text-loss",
  "Strong Bearish": "text-loss",
  Neutral: "text-gold",
};

export function HistoryPanel({ history }: { history: PortfolioHistoryEntry[] }) {
  return (
    <Panel eyebrow="History" title="Portfolio History" icon={History}>
      {history.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">No history yet — run the portfolio build to generate a snapshot.</p>
      ) : (
        <div className="space-y-2.5">
          {history.map((h) => (
            <div key={h.id} className="rounded-lg border border-border-subtle bg-surface-panel/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-text-primary">{h.summary}</p>
                <p className={`text-xs font-black ${biasTone[h.bias] ?? "text-text-primary"}`}>
                  {h.bias} · {h.score >= 0 ? "+" : ""}{h.score}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-text-muted">
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> {formatTime(h.timestamp)}
                </span>
                <span>confidence {h.confidence}%</span>
                <span>risk {h.risk}</span>
                <span>{h.positionCount} positions</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
