import { ShieldAlert } from "lucide-react";
import type { InstitutionalRisk } from "./types";
import { LevelBadge, Panel, ProgressBar, RiskBadge } from "./primitives";

export function RiskPanel({ risk }: { risk: InstitutionalRisk }) {
  const categoryLabels: { key: keyof InstitutionalRisk & string; label: string }[] = [
    { key: "marketRisk", label: "Market Risk" },
    { key: "liquidityRisk", label: "Liquidity Risk" },
    { key: "volatilityRisk", label: "Volatility Risk" },
    { key: "macroRisk", label: "Macro Risk" },
    { key: "institutionalRisk", label: "Institutional Risk" },
    { key: "newsRisk", label: "News Risk" },
    { key: "eventRisk", label: "Event Risk" },
  ];

  return (
    <Panel eyebrow="Risk" title="Risk Dashboard" icon={ShieldAlert} badge={<RiskBadge risk={risk.overallRisk} />}>
      <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-panel/40 p-4">
        <p className={risk.overallScore >= 55 ? "text-3xl font-black text-loss" : risk.overallScore >= 35 ? "text-3xl font-black text-warning" : "text-3xl font-black text-profit"}>{risk.overallScore}</p>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">Overall Risk Score</p>
          <p className="text-sm font-bold text-text-primary">{risk.overallRisk} · out of 100</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {categoryLabels.map(({ key, label }) => {
          const level = risk[key] as string;
          const breakItem = risk.breakdown.find((b) => b.category === label || b.category === key);
          const score = breakItem?.score ?? 0;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-[11px] font-medium text-text-secondary">{label}</span>
              <ProgressBar value={score} tone={score >= 55 ? "loss" : score >= 35 ? "warning" : "profit"} className="flex-1" />
              <span className="w-9 shrink-0 text-right text-xs font-bold text-text-primary">{score}</span>
              <LevelBadge level={level} />
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
