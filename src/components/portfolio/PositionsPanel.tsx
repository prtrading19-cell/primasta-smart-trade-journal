import { Scale, TrendingDown, TrendingUp } from "lucide-react";
import { Panel, RiskBadge, formatPct } from "@/components/institutional/primitives";
import type { PortfolioPosition } from "./types";

const directionTone: Record<string, string> = {
  long: "bg-profit/10 text-profit",
  short: "bg-loss/10 text-loss",
  flat: "bg-surface-panel text-text-muted",
};

const stateTone: Record<string, string> = {
  Active: "bg-profit/10 text-profit",
  Waiting: "bg-gold/10 text-gold",
  Reduced: "bg-warning/10 text-warning",
  Closed: "bg-surface-panel text-text-muted",
  Invalidated: "bg-loss/10 text-loss",
};

export function PositionsPanel({ positions }: { positions: PortfolioPosition[] }) {
  return (
    <Panel
      eyebrow="Positions"
      title="Portfolio Positions"
      icon={Scale}
      badge={<span className="text-xs font-bold text-text-muted">{positions.length} tracked</span>}
    >
      {positions.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">No active positions.</p>
      ) : (
        <div className="space-y-3">
          {positions.map((p) => (
            <div key={p.assetId} className="rounded-lg border border-border-subtle bg-surface-panel/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-text-primary">{p.assetName}</p>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">{p.assetClass}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${directionTone[p.direction]}`}>
                    {p.direction}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${stateTone[p.state]}`}>
                    {p.state}
                  </span>
                  <RiskBadge risk={p.riskLevel} />
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] text-text-muted">Signal</p>
                  <p className={`text-sm font-bold ${p.score >= 0 ? "text-profit" : "text-loss"}`}>
                    {p.score >= 0 ? "+" : ""}{p.score}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted">Confidence</p>
                  <p className="text-sm font-bold text-gold">{p.confidence}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted">Conflict</p>
                  <p className={`text-sm font-bold ${p.conflictScore > 40 ? "text-loss" : "text-text-secondary"}`}>
                    {p.conflictScore}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted">Action</p>
                  <p className="text-sm font-bold text-text-primary">{p.action}</p>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-text-secondary">{p.reason}</p>

              {p.invalidationReasons.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.invalidationReasons.map((r) => (
                    <span key={r} className="rounded bg-loss/10 px-1.5 py-0.5 text-[10px] text-loss">
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
