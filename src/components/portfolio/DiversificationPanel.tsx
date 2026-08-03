import { PieChart } from "lucide-react";
import { Panel, ProgressBar } from "@/components/institutional/primitives";
import type { DiversificationResult } from "./types";

export function DiversificationPanel({ diversification }: { diversification: DiversificationResult }) {
  const { score, effectiveAssetCount, averageCorrelation, highestCorrelation, lowestCorrelation, assessment, warnings } = diversification;

  return (
    <Panel eyebrow="Diversification" title="Diversification Score" icon={PieChart}>
      <div className="flex items-center justify-between">
        <p className="text-4xl font-black text-text-primary">{score}</p>
        <div className="text-right">
          <p className="text-sm font-black text-gold">{effectiveAssetCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">effective assets</p>
        </div>
      </div>
      <ProgressBar value={score} tone={score >= 70 ? "profit" : score >= 40 ? "warning" : "loss"} className="mt-3" />
      <p className="mt-3 text-xs leading-5 text-text-secondary">{assessment}</p>

      <div className="mt-3 space-y-1.5 text-[11px] text-text-secondary">
        <p>
          Avg correlation:{" "}
          <span className="font-bold text-text-primary">{averageCorrelation == null ? "—" : averageCorrelation.toFixed(2)}</span>
        </p>
        {highestCorrelation && (
          <p>
            Highest:{" "}
            <span className="font-bold text-loss">
              {highestCorrelation.assetA}×{highestCorrelation.assetB} {highestCorrelation.coefficient?.toFixed(2)}
            </span>
          </p>
        )}
        {lowestCorrelation && (
          <p>
            Lowest:{" "}
            <span className="font-bold text-profit">
              {lowestCorrelation.assetA}×{lowestCorrelation.assetB} {lowestCorrelation.coefficient?.toFixed(2)}
            </span>
          </p>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="rounded bg-warning/5 px-3 py-1.5 text-[11px] text-warning">{w}</p>
          ))}
        </div>
      )}
    </Panel>
  );
}
