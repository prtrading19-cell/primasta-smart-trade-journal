import { Landmark } from "lucide-react";
import { Panel, formatTime } from "@/components/institutional/primitives";
import type { InstitutionalFlowItem } from "./types";

const flowTone: Record<string, string> = {
  Bullish: "text-profit",
  "Strong Bullish": "text-profit",
  Bearish: "text-loss",
  "Strong Bearish": "text-loss",
  Neutral: "text-gold",
};

export function InstitutionalFlowPanel({ flows }: { flows: InstitutionalFlowItem[] }) {
  return (
    <Panel eyebrow="Institutional" title="Institutional Flows" icon={Landmark}>
      {flows.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">No institutional flow data available.</p>
      ) : (
        <div className="space-y-3">
          {flows.map((f) => (
            <div key={f.assetId} className="rounded-lg border border-border-subtle bg-surface-panel/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-text-primary">{f.assetName}</p>
                  <div className="flex gap-1">
                    {f.sources.map((s) => (
                      <span key={s} className="rounded bg-gold/10 px-1.5 py-0.5 text-[10px] font-medium text-gold">{s}</span>
                    ))}
                  </div>
                </div>
                <p className={`text-sm font-black ${flowTone[f.flowBias] ?? "text-text-primary"}`}>
                  {f.flowBias} · {f.flowScore}
                </p>
              </div>

              <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
                {f.cotNetCommercial != null && (
                  <div className="rounded bg-surface-panel/50 px-2 py-1.5">
                    <p className="text-[10px] text-text-muted">COT Net Commercial</p>
                    <p className="font-bold text-text-primary">{f.cotNetCommercial}</p>
                  </div>
                )}
                {f.etfFlowDirection != null && (
                  <div className="rounded bg-surface-panel/50 px-2 py-1.5">
                    <p className="text-[10px] text-text-muted">ETF Flow</p>
                    <p className="font-bold text-text-primary">{f.etfFlowDirection}</p>
                  </div>
                )}
                {f.openInterestTrend != null && (
                  <div className="rounded bg-surface-panel/50 px-2 py-1.5">
                    <p className="text-[10px] text-text-muted">Open Interest</p>
                    <p className="font-bold text-text-primary">{f.openInterestTrend}</p>
                  </div>
                )}
                {f.breadthScore != null && (
                  <div className="rounded bg-surface-panel/50 px-2 py-1.5">
                    <p className="text-[10px] text-text-muted">Breadth</p>
                    <p className="font-bold text-text-primary">{f.breadthScore}</p>
                  </div>
                )}
                {f.volatilityRating != null && (
                  <div className="rounded bg-surface-panel/50 px-2 py-1.5">
                    <p className="text-[10px] text-text-muted">Volatility</p>
                    <p className="font-bold text-text-primary">{f.volatilityRating}</p>
                  </div>
                )}
                {f.vix != null && (
                  <div className="rounded bg-surface-panel/50 px-2 py-1.5">
                    <p className="text-[10px] text-text-muted">VIX</p>
                    <p className="font-bold text-text-primary">{f.vix}</p>
                  </div>
                )}
                {f.gvz != null && (
                  <div className="rounded bg-surface-panel/50 px-2 py-1.5">
                    <p className="text-[10px] text-text-muted">GVZ</p>
                    <p className="font-bold text-text-primary">{f.gvz}</p>
                  </div>
                )}
              </div>

              <p className="mt-2.5 text-[11px] leading-4 text-text-secondary">{f.macroSummary}</p>
              <p className="mt-1.5 text-[10px] text-text-muted">Updated {formatTime(f.timestamp)}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
