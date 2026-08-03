import { Briefcase } from "lucide-react";
import type { PortfolioIntelligenceResult } from "./types";

export function PortfolioHero({ data }: { data: PortfolioIntelligenceResult }) {
  const { decision, risk, exposure } = data;

  const toneClass =
    decision.score >= 25 ? "bg-profit/10 border-profit/30 text-profit"
    : decision.score <= -25 ? "bg-loss/10 border-loss/30 text-loss"
    : "bg-gold/10 border-gold/30 text-gold";

  const riskTone =
    risk.overallRisk === "Low" || risk.overallRisk === "Medium"
      ? "bg-profit/10 border-profit/30 text-profit"
      : "bg-loss/10 border-loss/30 text-loss";

  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">Portfolio Intelligence Engine</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
                Portfolio Intelligence
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
                Cross-asset decision intelligence aggregating research signals, institutional flows, correlation, risk, and allocation across the registered asset universe.
              </p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10">
              <Briefcase className="h-7 w-7 text-gold" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className={`rounded-xl border p-4 ${toneClass}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Portfolio Signal</p>
              <p className="mt-1 text-2xl font-black">{decision.score}</p>
              <p className="text-xs font-medium">{decision.bias}</p>
            </div>
            <div className={`rounded-xl border p-4 ${riskTone}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Risk</p>
              <p className="mt-1 text-2xl font-black">{risk.overallRisk}</p>
              <p className="text-xs font-medium">{risk.overallScore}/100</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-panel p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Confidence</p>
              <p className="mt-1 text-2xl font-black text-gold">{decision.confidence}%</p>
              <p className="text-xs font-medium text-text-muted">{decision.action}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-panel p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Net Exposure</p>
              <p className="mt-1 text-2xl font-black text-text-primary">{exposure.netExposure}</p>
              <p className="text-xs font-medium text-text-muted">gross {exposure.grossExposure}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
