import { TrendingUp, AlertTriangle } from "lucide-react";
import { ResearchSection, MetricRow, EmptyState } from "../shared";
import type { TechnicalBiasResult } from "@/types/technicalBias";

interface TechnicalCardProps {
  technicalBias: TechnicalBiasResult;
}

export function TechnicalCard({ technicalBias }: TechnicalCardProps) {
  const hasData = technicalBias.confidence > 0 || technicalBias.strength !== "None";

  if (!hasData) {
    return (
      <ResearchSection title="Technical Analysis" icon={<TrendingUp size={16} />}>
        <EmptyState icon={<AlertTriangle size={24} />} title="Technical Data Unavailable" description="Technical data unavailable. Waiting for: Price history, Technical indicators, Trend analysis." />
      </ResearchSection>
    );
  }

  const biasTone = technicalBias.technicalBias.toLowerCase().includes("bullish")
    ? "profit"
    : technicalBias.technicalBias.toLowerCase().includes("bearish")
      ? "loss"
      : "neutral";

  return (
    <ResearchSection title="Technical Analysis" icon={<TrendingUp size={16} />}>
      <div className="mb-3 flex items-center gap-3">
        <span className={`text-lg font-bold ${biasTone === "profit" ? "text-profit" : biasTone === "loss" ? "text-loss" : "text-gold"}`}>
          {technicalBias.technicalBias}
        </span>
        <span className="text-xs text-text-muted">Confidence: {technicalBias.confidence}%</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <MetricRow label="Strength" value={technicalBias.strength} />
        <MetricRow label="Timeframe" value={technicalBias.timeframe || "N/A"} />
        <MetricRow label="Structure" value={technicalBias.marketStructure || "N/A"} tone="gold" />
        <MetricRow label="Risk Level" value={technicalBias.riskLevel || "N/A"} />
        {technicalBias.setupPresent && (
          <MetricRow label="Setup" value={technicalBias.setupType || "Present"} tone="profit" />
        )}
      </div>
      {technicalBias.summary && (
        <p className="mt-3 text-xs text-text-secondary">{technicalBias.summary}</p>
      )}
      {technicalBias.supportingFactors && technicalBias.supportingFactors.length > 0 && (
        <div className="mt-2">
          <span className="text-[10px] font-medium text-profit">Supporting:</span>
          <ul className="mt-0.5 list-inside list-disc text-[10px] text-text-muted">
            {technicalBias.supportingFactors.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
      {technicalBias.conflictingFactors && technicalBias.conflictingFactors.length > 0 && (
        <div className="mt-2">
          <span className="text-[10px] font-medium text-loss">Conflicting:</span>
          <ul className="mt-0.5 list-inside list-disc text-[10px] text-text-muted">
            {technicalBias.conflictingFactors.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}
    </ResearchSection>
  );
}
