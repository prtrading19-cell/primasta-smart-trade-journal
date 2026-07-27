import { Gauge, AlertTriangle } from "lucide-react";
import { ResearchSection, MetricRow, EmptyState } from "../shared";
import type { DecisionEngineResult } from "@/types/decisionEngine";

interface DecisionCardProps {
  decision: DecisionEngineResult;
}

function getDecisionColor(d: string): string {
  if (d.includes("Buy")) return "text-profit";
  if (d.includes("Sell")) return "text-loss";
  return "text-gold";
}

function getDecisionBg(d: string): string {
  if (d.includes("Buy")) return "bg-profit/10 border-profit/30";
  if (d.includes("Sell")) return "bg-loss/10 border-loss/30";
  return "bg-gold/10 border-gold/30";
}

function getRiskColor(r: string): string {
  if (r === "Extreme" || r === "High") return "text-loss";
  if (r === "Medium") return "text-gold";
  return "text-profit";
}

export function DecisionCard({ decision }: DecisionCardProps) {
  if (!decision || decision.overallGoldScore === 0) {
    return (
      <ResearchSection title="Decision Engine" icon={<Gauge size={16} />}>
        <EmptyState icon={<AlertTriangle size={24} />} title="No Decision Available" description="Run the research engine to generate a decision." />
      </ResearchSection>
    );
  }

  return (
    <ResearchSection title="Decision Engine" icon={<Gauge size={16} />}>
      <div className="mb-4 flex items-center gap-4">
        <div className={`rounded-lg border px-4 py-2 ${getDecisionBg(decision.decision)}`}>
          <span className={`text-lg font-bold ${getDecisionColor(decision.decision)}`}>{decision.decision}</span>
        </div>
        <div className="flex flex-col gap-1">
          <MetricRow label="Confidence" value={`${decision.overallConfidence}%`} tone={decision.overallConfidence >= 60 ? "profit" : "neutral"} />
          <MetricRow label="Risk Rating" value={decision.riskRating} tone={getRiskColor(decision.riskRating).includes("loss") ? "loss" : "gold"} />
          <MetricRow label="Quality" value={decision.decisionQuality} />
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1">
        <MetricRow label="Composite Score" value={decision.overallGoldScore.toFixed(1)} tone="gold" />
        <MetricRow label="Overall Bias" value={decision.overallBias} />
        <MetricRow label="Alignment" value={`${decision.alignmentScore}%`} />
        <MetricRow label="Conflict" value={`${decision.conflictScore}%`} tone={decision.conflictScore > 50 ? "loss" : "neutral"} />
      </div>
      {decision.summary && (
        <p className="mb-3 text-xs text-text-secondary leading-relaxed">{decision.summary}</p>
      )}
      {decision.institutionalExplanation && (
        <div className="rounded-lg border border-border-subtle bg-surface-panel p-3">
          <span className="text-[10px] font-medium text-gold">Institutional Explanation</span>
          {decision.institutionalExplanation.primaryReason && (
            <p className="mt-1 text-xs text-text-secondary">{decision.institutionalExplanation.primaryReason}</p>
          )}
          {decision.institutionalExplanation.supportingReasons && decision.institutionalExplanation.supportingReasons.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-[10px] text-profit">
              {decision.institutionalExplanation.supportingReasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
          {decision.institutionalExplanation.conflictingReasons && decision.institutionalExplanation.conflictingReasons.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-[10px] text-loss">
              {decision.institutionalExplanation.conflictingReasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      )}
      {decision.topContributors && decision.topContributors.length > 0 && (
        <div className="mt-3">
          <span className="text-[10px] font-medium text-text-muted">Top Contributors</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {decision.topContributors.map((c, i) => (
              <span key={i} className="inline-flex items-center rounded bg-surface-panel px-1.5 py-0.5 text-[10px] text-text-secondary">
                {c.name} ({c.contribution > 0 ? "+" : ""}{c.contribution.toFixed(1)})
              </span>
            ))}
          </div>
        </div>
      )}
    </ResearchSection>
  );
}
