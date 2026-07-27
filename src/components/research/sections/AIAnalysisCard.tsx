import { BrainCircuit, AlertTriangle } from "lucide-react";
import { ResearchSection, EmptyState } from "../shared";
import type { ResearchSummary } from "@/lib/research/ResearchTypes";

interface AIAnalysisCardProps {
  summary: ResearchSummary | null;
}

export function AIAnalysisCard({ summary }: AIAnalysisCardProps) {
  if (!summary) {
    return (
      <ResearchSection title="AI Summary" icon={<BrainCircuit size={16} />}>
        <EmptyState icon={<AlertTriangle size={24} />} title="No AI Analysis" description="Run auto-fill to generate AI-powered research summary." />
      </ResearchSection>
    );
  }

  return (
    <ResearchSection title="AI Summary" icon={<BrainCircuit size={16} />}>
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Overall Bias:</span>
          <span className={`text-sm font-semibold ${
            summary.overallBias.toLowerCase().includes("bullish") ? "text-profit" :
            summary.overallBias.toLowerCase().includes("bearish") ? "loss" : "text-gold"
          }`}>
            {summary.overallBias}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-text-muted">Verdict:</span>
          <span className="text-xs font-medium text-text-primary">{summary.preTradeVerdict}</span>
        </div>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed">{summary.finalGuidance}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {summary.bullishDrivers.length > 0 && (
          <div>
            <span className="text-[10px] font-medium text-profit">Bullish Drivers</span>
            <ul className="mt-0.5 list-inside list-disc text-[10px] text-text-muted">
              {summary.bullishDrivers.slice(0, 5).map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        )}
        {summary.bearishDrivers.length > 0 && (
          <div>
            <span className="text-[10px] font-medium text-loss">Bearish Drivers</span>
            <ul className="mt-0.5 list-inside list-disc text-[10px] text-text-muted">
              {summary.bearishDrivers.slice(0, 5).map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        )}
      </div>
      {summary.tradeRecommendation && (
        <div className="mt-3 rounded-lg border border-border-subtle bg-surface-panel p-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Trade Recommendation:</span>
            <span className={`text-xs font-semibold ${
              summary.tradeRecommendation.action === "BUY" ? "text-profit" :
              summary.tradeRecommendation.action === "SELL" ? "text-loss" : "text-gold"
            }`}>
              {summary.tradeRecommendation.action}
            </span>
            <span className="text-[10px] text-text-muted">({summary.tradeRecommendation.confidence}% confidence)</span>
          </div>
          <p className="mt-1 text-[10px] text-text-muted">{summary.tradeRecommendation.reason}</p>
        </div>
      )}
      {summary.personalRule && (
        <div className="mt-3 rounded-lg border border-gold/30 bg-gold/5 p-3">
          <span className="text-[10px] font-medium text-gold">Personal Rule: </span>
          <span className="text-[10px] text-text-secondary">{summary.personalRule}</span>
        </div>
      )}
    </ResearchSection>
  );
}
