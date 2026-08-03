import { Compass, AlertTriangle, Lightbulb, Activity } from "lucide-react";
import { Panel, RiskBadge } from "@/components/institutional/primitives";
import type { PortfolioDecision, PortfolioConflict, PortfolioOpportunity, PortfolioWarning } from "./types";

const biasTone: Record<string, string> = {
  Bullish: "bg-profit/10 text-profit",
  "Strong Bullish": "bg-profit/10 text-profit",
  Bearish: "bg-loss/10 text-loss",
  "Strong Bearish": "bg-loss/10 text-loss",
  Neutral: "bg-gold/10 text-gold",
};

const actionTone: Record<string, string> = {
  ACCUMULATE: "bg-profit/10 text-profit",
  HEDGE: "bg-warning/10 text-warning",
  REDUCE: "bg-loss/10 text-loss",
  WAIT: "bg-gold/10 text-gold",
  REBALANCE: "bg-gold/10 text-gold",
};

const warningTone: Record<string, string> = {
  Low: "bg-gold/10 text-gold",
  Medium: "bg-warning/10 text-warning",
  High: "bg-loss/10 text-loss",
};

export function DecisionPanel({
  decision,
  conflicts,
  opportunities,
  warnings,
}: {
  decision: PortfolioDecision;
  conflicts: PortfolioConflict[];
  opportunities: PortfolioOpportunity[];
  warnings: PortfolioWarning[];
}) {
  return (
    <Panel eyebrow="Decision" title="Portfolio Recommendation" icon={Compass}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-lg px-3 py-1.5 text-sm font-black uppercase tracking-wider ${biasTone[decision.bias] ?? "bg-surface-panel text-text-primary"}`}>
          {decision.bias}
        </span>
        <span className={`rounded-lg px-3 py-1.5 text-sm font-black uppercase tracking-wider ${actionTone[decision.action]}`}>
          {decision.action}
        </span>
        <div className="ml-auto text-right">
          <p className="text-2xl font-black text-text-primary">{decision.score}</p>
          <p className="text-[10px] text-text-muted">score</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-gold">{decision.confidence}%</p>
          <p className="text-[10px] text-text-muted">confidence</p>
        </div>
        <RiskBadge risk={decision.risk} />
      </div>

      <div className="mt-4 space-y-1.5">
        {decision.reasoning.map((r, i) => (
          <p key={i} className="flex items-start gap-2 text-xs leading-5 text-text-secondary">
            <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
            {r}
          </p>
        ))}
      </div>

      {opportunities.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-profit">
            <Lightbulb className="h-3.5 w-3.5" /> Opportunities
          </p>
          <div className="space-y-1.5">
            {opportunities.map((o, i) => (
              <p key={i} className="rounded bg-profit/5 px-3 py-2 text-xs text-text-secondary">
                <span className="font-bold text-profit">{o.type}</span> — {o.description}
                <span className="ml-2 text-[10px] text-text-muted">conviction {o.conviction}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-warning">
            <AlertTriangle className="h-3.5 w-3.5" /> Warnings
          </p>
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start justify-between gap-2 rounded bg-warning/5 px-3 py-2">
                <p className="text-xs text-text-secondary">
                  <span className="font-bold text-text-primary">{w.category}</span> — {w.message}
                </p>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${warningTone[w.severity]}`}>
                  {w.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-loss">Conflicts</p>
          <div className="space-y-1.5">
            {conflicts.map((c, i) => (
              <p key={i} className="rounded bg-loss/5 px-3 py-2 text-xs text-text-secondary">
                <span className="font-bold text-text-primary">{c.assetA} vs {c.assetB}</span> — {c.description}
              </p>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
