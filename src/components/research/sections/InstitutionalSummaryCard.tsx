import { Layers3, AlertTriangle } from "lucide-react";
import { ResearchSection, MetricRow, EmptyState } from "../shared";
import type { InstitutionalFlowResult } from "@/types/institutionalFlow";

interface InstitutionalSummaryCardProps {
  institutionalFlow: InstitutionalFlowResult;
}

export function InstitutionalSummaryCard({ institutionalFlow }: InstitutionalSummaryCardProps) {
  console.log("[RUNTIME-AUDIT:InstitutionalCard] received props:", JSON.stringify(institutionalFlow, null, 2));
  const hasData = institutionalFlow.confidence > 0 || institutionalFlow.strength !== "None";
  console.log("[RUNTIME-AUDIT:InstitutionalCard] hasData:", hasData, "confidence:", institutionalFlow.confidence, "strength:", institutionalFlow.strength);

  if (!hasData) {
    return (
      <ResearchSection title="Institutional Flow" icon={<Layers3 size={16} />}>
        <EmptyState icon={<AlertTriangle size={24} />} title="Institutional Flow Unavailable" description="Institutional flow unavailable. Waiting for: Market Breadth, Sector Rotation, Volatility, Mega Cap Leadership." />
      </ResearchSection>
    );
  }

  const biasTone = institutionalFlow.institutionalBias.toLowerCase().includes("bullish")
    ? "profit"
    : institutionalFlow.institutionalBias.toLowerCase().includes("bearish")
      ? "loss"
      : "neutral";

  return (
    <ResearchSection title="Institutional Flow" icon={<Layers3 size={16} />}>
      <div className="mb-3 flex items-center gap-3">
        <span className={`text-lg font-bold ${biasTone === "profit" ? "text-profit" : biasTone === "loss" ? "text-loss" : "text-gold"}`}>
          {institutionalFlow.institutionalBias}
        </span>
        <span className="text-xs text-text-muted">Confidence: {institutionalFlow.confidence}%</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <MetricRow label="Strength" value={institutionalFlow.strength} />
        <MetricRow label="Data Quality" value={`${institutionalFlow.dataQuality.score}%`} tone="gold" />
      </div>
      {institutionalFlow.summary && (
        <p className="mt-3 text-xs text-text-secondary">{institutionalFlow.summary}</p>
      )}
      {institutionalFlow.concentrationRisks && institutionalFlow.concentrationRisks.length > 0 && (
        <div className="mt-2">
          <span className="text-[10px] font-medium text-loss">Concentration Risks:</span>
          <ul className="mt-0.5 list-inside list-disc text-[10px] text-text-muted">
            {institutionalFlow.concentrationRisks.map((r, i) => (
              <li key={i}>{typeof r === "string" ? r : r.description}</li>
            ))}
          </ul>
        </div>
      )}
    </ResearchSection>
  );
}
