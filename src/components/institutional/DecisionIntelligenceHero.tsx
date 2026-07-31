import { Activity, BrainCircuit, Clock, Layers, ShieldCheck, Timer } from "lucide-react";
import type { InstitutionalIntelligence } from "./types";
import { ActionBadge, LevelBadge, RiskBadge, ProgressBar, formatTime } from "./primitives";

export function DecisionIntelligenceHero({ intelligence }: { intelligence: InstitutionalIntelligence }) {
  const decision = intelligence.decision;
  const confidence = intelligence.confidence;
  const risk = intelligence.risk;
  const conflicts = intelligence.conflicts;
  const scenario = intelligence.scenario;

  const overallScore = confidence.score;
  const overallRiskScore = risk.overallScore;
  const overallConflictScore = conflicts.score;
  const evidenceCount = intelligence.evidence.length;

  const metricCards = [
    { label: "Overall Decision", value: decision.action, node: <ActionBadge action={decision.action} className="text-xs px-2.5 py-1" /> },
    { label: "Overall Confidence", value: `${overallScore}%`, node: <LevelBadge level={confidence.level} /> },
    { label: "Risk Level", value: risk.overallRisk, node: <RiskBadge risk={risk.overallRisk} /> },
    { label: "Conflict Score", value: `${overallConflictScore}%`, node: <span className="text-xs text-text-muted">{conflicts.severity}</span> },
    { label: "Evidence Count", value: `${evidenceCount}`, node: <span className="text-xs text-text-muted">records</span> },
    { label: "Most Likely Scenario", value: scenario.mostLikely.toUpperCase(), node: <span className="text-xs text-text-muted">{scenario.bull.probability}/{scenario.base.probability}/{scenario.bear.probability}</span> },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card">
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle bg-surface-panel/50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <BrainCircuit className="h-4 w-4 text-gold" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Institutional Decision Intelligence</p>
              <h3 className="mt-0.5 text-sm font-bold text-text-primary">{intelligence.asset.toUpperCase()}</h3>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-text-muted">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(intelligence.timestamp)}</span>
            {intelligence.executionDurationMs != null && (
              <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {intelligence.executionDurationMs}ms</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((m) => (
          <div key={m.label} className="rounded-lg border border-border-subtle bg-surface-panel/40 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">{m.label}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="text-lg font-black text-text-primary">{m.value}</p>
              {m.node}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 px-5 pb-5 md:grid-cols-3">
        <div className="rounded-lg border border-border-subtle bg-surface-panel/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Confidence Score</p>
            <span className="text-sm font-bold text-text-primary">{overallScore}%</span>
          </div>
          <ProgressBar value={overallScore} tone="gold" className="mt-2 h-2" />
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-text-muted">
            <span>Freshness {confidence.components.freshness}%</span>
            <span>Health {confidence.components.providerHealth}%</span>
            <span>Evidence {confidence.components.evidenceCount}%</span>
            <span>Agreement {confidence.components.agreement}%</span>
            <span>Completeness {confidence.components.completeness}%</span>
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-panel/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Risk Score</p>
            <span className="text-sm font-bold text-text-primary">{overallRiskScore}/100</span>
          </div>
          <ProgressBar value={overallRiskScore} tone={overallRiskScore >= 55 ? "loss" : overallRiskScore >= 35 ? "warning" : "profit"} className="mt-2 h-2" />
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-text-muted">
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Market {risk.marketRisk}</span>
            <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Volatility {risk.volatilityRisk}</span>
            <span>Liquidity {risk.liquidityRisk}</span>
            <span>Macro {risk.macroRisk}</span>
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-panel/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Conflict Score</p>
            <span className="text-sm font-bold text-text-primary">{overallConflictScore}%</span>
          </div>
          <ProgressBar value={overallConflictScore} tone={overallConflictScore >= 40 ? "loss" : overallConflictScore >= 20 ? "warning" : "profit"} className="mt-2 h-2" />
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-text-muted">
            <span>Pairs {conflicts.conflictingPairs.length}</span>
            <span>Consensus {conflicts.consensusDrivers.length}</span>
            <span>Discord {conflicts.discordDrivers.length}</span>
            <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {conflicts.severity}</span>
          </div>
        </div>
      </div>

      {intelligence.aiSummary && (
        <div className="border-t border-border-subtle bg-surface-panel/30 px-5 py-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">AI Summary</p>
          <pre className="whitespace-pre-wrap font-sans text-xs leading-5 text-text-secondary">{intelligence.aiSummary}</pre>
        </div>
      )}
    </div>
  );
}
