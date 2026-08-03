import { ShieldAlert } from "lucide-react";
import { Panel, RiskBadge, ProgressBar } from "@/components/institutional/primitives";
import type { PortfolioRiskResult } from "./types";

const impactTone: Record<string, string> = {
  diversifying: "bg-profit/10 text-profit",
  neutral: "bg-gold/10 text-gold",
  concentrating: "bg-loss/10 text-loss",
};

export function RiskPanel({ risk }: { risk: PortfolioRiskResult }) {
  const { overallRisk, overallScore, perAsset, correlationImpact, riskClusters, assessment } = risk;

  return (
    <Panel
      eyebrow="Risk"
      title="Portfolio Risk"
      icon={ShieldAlert}
      badge={
        <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${impactTone[correlationImpact]}`}>
          {correlationImpact}
        </span>
      }
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-3xl font-black text-text-primary">{overallScore}</p>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Risk score</p>
        </div>
        <RiskBadge risk={overallRisk} />
      </div>
      <ProgressBar value={overallScore} tone={overallScore >= 75 ? "loss" : overallScore >= 50 ? "warning" : "profit"} className="mt-3" />
      <p className="mt-3 text-xs leading-5 text-text-secondary">{assessment}</p>

      <div className="mt-4 space-y-2">
        {perAsset.map((a) => (
          <div key={a.assetId} className="flex items-center justify-between rounded-lg bg-surface-panel/40 px-3 py-2">
            <div>
              <p className="text-xs font-bold text-text-primary">{a.assetName}</p>
              <p className="text-[10px] text-text-muted">{a.assetClass} · {a.overallScore}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted">contrib {a.contribution}</span>
              <RiskBadge risk={a.overallRisk} />
            </div>
          </div>
        ))}
      </div>

      {riskClusters.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-loss">Risk Clusters</p>
          <div className="space-y-1.5">
            {riskClusters.map((c, i) => (
              <p key={i} className="rounded bg-loss/5 px-3 py-2 text-xs text-text-secondary">
                <span className="font-bold text-text-primary">{c.assetA} × {c.assetB}</span> — {c.reason}
              </p>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
