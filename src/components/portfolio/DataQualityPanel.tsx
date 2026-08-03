import { Database } from "lucide-react";
import { Panel, ProgressBar } from "@/components/institutional/primitives";
import type { PortfolioDataQuality } from "./types";

export function DataQualityPanel({ quality }: { quality: PortfolioDataQuality }) {
  const { assetsTracked, assetsWithData, missingAssets, snapshotCount, providerCacheHits, usedFallback } = quality;

  return (
    <Panel eyebrow="Data Quality" title="Data Quality" icon={Database}>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-surface-panel/50 p-3 text-center">
          <p className="text-lg font-black text-text-primary">{assetsWithData}/{assetsTracked}</p>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Assets w/ data</p>
        </div>
        <div className="rounded-lg bg-surface-panel/50 p-3 text-center">
          <p className="text-lg font-black text-text-primary">{snapshotCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Snapshots</p>
        </div>
        <div className="rounded-lg bg-surface-panel/50 p-3 text-center">
          <p className="text-lg font-black text-text-primary">{providerCacheHits}</p>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Cache hits</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-text-muted">Coverage</span>
          <span className="text-xs font-bold text-gold">
            {assetsTracked > 0 ? Math.round((assetsWithData / assetsTracked) * 100) : 0}%
          </span>
        </div>
        <ProgressBar
          value={assetsTracked > 0 ? (assetsWithData / assetsTracked) * 100 : 0}
          tone="gold"
        />
      </div>

      {missingAssets.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {missingAssets.map((m) => (
            <span key={m} className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
              missing: {m}
            </span>
          ))}
        </div>
      )}

      {usedFallback && (
        <p className="mt-3 rounded bg-warning/5 px-3 py-2 text-[10px] text-warning">
          Some data used last-known-good fallback.
        </p>
      )}
    </Panel>
  );
}
