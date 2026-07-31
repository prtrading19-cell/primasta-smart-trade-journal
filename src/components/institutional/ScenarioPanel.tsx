import { Activity, ShieldAlert, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { InstitutionalScenario } from "./types";
import { Panel, ProgressBar } from "./primitives";
import { cn } from "@/lib/format";

const CASE_STYLES = {
  bull: { icon: TrendingUp, accent: "text-profit", bar: "bg-profit", border: "border-profit/30", label: "Bull Case" },
  base: { icon: Activity, accent: "text-warning", bar: "bg-warning", border: "border-warning/30", label: "Base Case" },
  bear: { icon: TrendingDown, accent: "text-loss", bar: "bg-loss", border: "border-loss/30", label: "Bear Case" },
} as const;

function ScenarioCard({ type, scenario, isMostLikely }: {
  type: "bull" | "base" | "bear";
  scenario: InstitutionalScenario["bull"];
  isMostLikely: boolean;
}) {
  const style = CASE_STYLES[type];
  const Icon = style.icon;
  return (
    <div className={cn("rounded-lg border p-4", style.border, isMostLikely && "bg-surface-panel/60 ring-1 ring-gold/30")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", style.accent)} />
          <p className={cn("text-[10px] font-bold uppercase tracking-[0.16em]", style.accent)}>{style.label}</p>
        </div>
        {isMostLikely && (
          <span className="rounded bg-gold/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold">Most Likely</span>
        )}
      </div>
      <p className="mt-2 text-sm font-black text-text-primary">{scenario.title}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1"><ProgressBar value={scenario.probability} tone={type === "bull" ? "profit" : type === "bear" ? "loss" : "warning"} /></div>
        <span className="text-sm font-black text-text-primary">{scenario.probability}%</span>
      </div>

      {scenario.catalysts.length > 0 && (
        <div className="mt-3">
          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted"><Target className="h-3 w-3" /> Catalysts</p>
          <ul className="mt-1 space-y-0.5">
            {scenario.catalysts.map((c, i) => (
              <li key={i} className="text-[11px] text-text-secondary">• {c}</li>
            ))}
          </ul>
        </div>
      )}

      {scenario.risks.length > 0 && (
        <div className="mt-3">
          <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted"><ShieldAlert className="h-3 w-3" /> Risks</p>
          <ul className="mt-1 space-y-0.5">
            {scenario.risks.map((r, i) => (
              <li key={i} className="text-[11px] text-text-secondary">• {r}</li>
            ))}
          </ul>
        </div>
      )}

      {scenario.invalidationConditions.length > 0 && (
        <div className="mt-3 border-t border-border-subtle pt-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-muted">Invalidation</p>
          <ul className="mt-1 space-y-0.5">
            {scenario.invalidationConditions.map((c, i) => (
              <li key={i} className="text-[11px] text-loss/80">• {c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ScenarioPanel({ scenario }: { scenario: InstitutionalScenario }) {
  return (
    <Panel eyebrow="Scenario Analysis" title="Probabilistic Scenarios" icon={Activity}>
      <div className="grid gap-4 lg:grid-cols-3">
        <ScenarioCard type="bull" scenario={scenario.bull} isMostLikely={scenario.mostLikely === "bull"} />
        <ScenarioCard type="base" scenario={scenario.base} isMostLikely={scenario.mostLikely === "base"} />
        <ScenarioCard type="bear" scenario={scenario.bear} isMostLikely={scenario.mostLikely === "bear"} />
      </div>
      {scenario.base.supportingEvidence.length > 0 && (
        <div className="mt-4 rounded-lg border border-border-subtle bg-surface-panel/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Base Case Supporting Evidence</p>
          <ul className="mt-2 grid gap-1.5 md:grid-cols-2">
            {scenario.base.supportingEvidence.map((ev, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-text-secondary">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-gold" />
                {ev}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
