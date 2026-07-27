import { Gauge, AlertTriangle, TrendingUp, TrendingDown, Shield, Target } from "lucide-react";
import { ResearchSection, MetricRow, EmptyState } from "../shared";
import type { DecisionEngineResult } from "@/types/decisionEngine";
import type { InstitutionalDecisionResult, CategoryBreakdown } from "@/lib/research/InstitutionalDecisionTypes";

interface DecisionCardProps {
  decision: DecisionEngineResult;
  institutionalDecision?: InstitutionalDecisionResult;
}

function getDecisionColor(d: string): string {
  if (d.includes("Buy") || d === "BUY" || d === "BUY ON PULLBACK") return "text-profit";
  if (d.includes("Sell") || d === "SELL" || d === "STRONG SELL") return "text-loss";
  return "text-gold";
}

function getDecisionBg(d: string): string {
  if (d.includes("Buy") || d === "BUY" || d === "BUY ON PULLBACK") return "bg-profit/10 border-profit/30";
  if (d.includes("Sell") || d === "SELL" || d === "STRONG SELL") return "bg-loss/10 border-loss/30";
  return "bg-gold/10 border-gold/30";
}

function getRiskColor(r: string): string {
  if (r === "Extreme" || r === "High") return "text-loss";
  if (r === "Moderate" || r === "Medium") return "text-gold";
  return "text-profit";
}

function getBiasColor(b: string): string {
  if (b.includes("Strong Bullish")) return "text-profit";
  if (b.includes("Bullish")) return "text-profit/80";
  if (b.includes("Strong Bearish")) return "text-loss";
  if (b.includes("Bearish")) return "text-loss/80";
  return "text-gold";
}

function getCategoryStatusColor(s: string): string {
  if (s === "Available") return "text-profit";
  if (s === "Partial") return "text-gold";
  return "text-loss";
}

function CategoryBreakdownBar({ category }: { category: CategoryBreakdown }) {
  const barWidth = Math.max(0, Math.min(100, category.rawScore));
  const barColor = category.rawScore >= 60 ? "bg-profit/60"
    : category.rawScore <= 40 ? "bg-loss/60"
    : "bg-gold/60";

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-28 truncate text-text-secondary" title={category.categoryTitle}>
        {category.categoryTitle}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-panel">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barWidth}%` }} />
      </div>
      <span className="w-8 text-right text-text-muted">{category.rawScore}</span>
      <span className="w-10 text-right text-text-muted">{(category.weight * 100).toFixed(0)}%</span>
      <span className={`w-12 text-right ${getCategoryStatusColor(category.status)}`}>
        {category.status}
      </span>
    </div>
  );
}

export function DecisionCard({ decision, institutionalDecision }: DecisionCardProps) {
  if (!institutionalDecision) {
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

  const inst = institutionalDecision;

  return (
    <ResearchSection title="Institutional Decision" icon={<Gauge size={16} />}>
      {/* Score + Recommendation Row */}
      <div className="mb-4 flex items-center gap-4">
        <div className={`rounded-lg border px-4 py-2 ${getDecisionBg(inst.recommendation)}`}>
          <span className={`text-lg font-bold ${getDecisionColor(inst.recommendation)}`}>{inst.recommendation}</span>
        </div>
        <div className="flex flex-col gap-1">
          <MetricRow label="Institutional Score" value={`${inst.overallScore}/100`} tone="gold" />
          <MetricRow label="Confidence" value={`${inst.confidence}%`} tone={inst.confidence >= 60 ? "profit" : "neutral"} />
          <MetricRow label="Risk Rating" value={inst.riskRating} tone={getRiskColor(inst.riskRating).includes("loss") ? "loss" : "gold"} />
        </div>
      </div>

      {/* Market Bias + Alignment */}
      <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1">
        <MetricRow label="Market Bias" value={inst.marketBias} tone={getBiasColor(inst.marketBias).includes("profit") ? "profit" : getBiasColor(inst.marketBias).includes("loss") ? "loss" : "gold"} />
        <MetricRow label="Alignment" value={`${inst.baseDecision.alignmentScore}%`} />
        <MetricRow label="Conflict" value={`${inst.baseDecision.conflictScore}%`} tone={inst.baseDecision.conflictScore > 50 ? "loss" : "neutral"} />
        <MetricRow label="Quality" value={inst.baseDecision.decisionQuality} />
      </div>

      {/* Top Bullish / Bearish Drivers */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-profit/20 bg-profit/5 p-2">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-profit">
            <TrendingUp size={10} /> Top Bullish Drivers
          </div>
          {inst.topBullishDrivers.length > 0 ? (
            <ul className="list-inside list-disc text-[10px] text-text-secondary">
              {inst.topBullishDrivers.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          ) : (
            <span className="text-[10px] text-text-muted">None identified</span>
          )}
        </div>
        <div className="rounded-lg border border-loss/20 bg-loss/5 p-2">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-loss">
            <TrendingDown size={10} /> Top Bearish Drivers
          </div>
          {inst.topBearishDrivers.length > 0 ? (
            <ul className="list-inside list-disc text-[10px] text-text-secondary">
              {inst.topBearishDrivers.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          ) : (
            <span className="text-[10px] text-text-muted">None identified</span>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      {inst.categoryBreakdown.length > 0 && (
        <div className="mb-3 rounded-lg border border-border-subtle bg-surface-panel p-3">
          <div className="mb-2 flex items-center gap-1 text-[10px] font-medium text-gold">
            <Target size={10} /> Category Breakdown
          </div>
          <div className="space-y-1.5">
            {inst.categoryBreakdown.map((cb) => (
              <CategoryBreakdownBar key={cb.categoryId} category={cb} />
            ))}
          </div>
        </div>
      )}

      {/* Institutional Risks */}
      {inst.explanation.institutionalRisks.length > 0 && (
        <div className="mb-3 rounded-lg border border-loss/20 bg-loss/5 p-3">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-loss">
            <Shield size={10} /> Institutional Risks
          </div>
          <ul className="list-inside list-disc text-[10px] text-text-secondary">
            {inst.explanation.institutionalRisks.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {/* Trade Plan */}
      <div className="mb-3 rounded-lg border border-border-subtle bg-surface-panel p-3">
        <span className="text-[10px] font-medium text-gold">Trade Plan</span>
        <p className="mt-1 text-xs text-text-secondary leading-relaxed">{inst.explanation.tradePlan}</p>
      </div>

      {/* Confidence Summary */}
      <p className="text-[10px] text-text-muted leading-relaxed">{inst.explanation.confidenceSummary}</p>
    </ResearchSection>
  );
}
