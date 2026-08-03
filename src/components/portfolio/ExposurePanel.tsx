import { Activity } from "lucide-react";
import { Panel, ProgressBar } from "@/components/institutional/primitives";
import type { ExposureResult } from "./types";

const toneByDirection: Record<string, string> = {
  long: "bg-profit/10 text-profit",
  short: "bg-loss/10 text-loss",
  flat: "bg-surface-panel text-text-muted",
};

export function ExposurePanel({ exposure }: { exposure: ExposureResult }) {
  const { totalExposure, netExposure, grossExposure, concentration, concentrationLabel, items } = exposure;

  return (
    <Panel eyebrow="Exposure" title="Portfolio Exposure">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-surface-panel/50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Net</p>
          <p className={`text-lg font-black ${netExposure >= 0 ? "text-profit" : "text-loss"}`}>{netExposure}</p>
        </div>
        <div className="rounded-lg bg-surface-panel/50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Gross</p>
          <p className="text-lg font-black text-text-primary">{grossExposure}</p>
        </div>
        <div className="rounded-lg bg-surface-panel/50 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Total</p>
          <p className="text-lg font-black text-text-primary">{totalExposure}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-text-muted">Concentration (HHI)</span>
          <span className={`text-xs font-bold ${concentration >= 80 ? "text-loss" : "text-gold"}`}>
            {concentrationLabel} · {concentration}
          </span>
        </div>
        <ProgressBar value={concentration} tone={concentration >= 80 ? "loss" : concentration >= 60 ? "warning" : "gold"} />
      </div>

      <div className="mt-4 space-y-2.5">
        {items.map((it) => (
          <div key={it.assetId} className="rounded-lg border border-border-subtle bg-surface-panel/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-text-primary">{it.assetName}</p>
              <div className="flex items-center gap-1.5">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${toneByDirection[it.direction]}`}>
                  {it.direction}
                </span>
                <span className="text-xs font-black text-text-primary">{it.exposurePercent}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar
                value={Math.min(100, it.exposurePercent)}
                tone={it.direction === "short" ? "loss" : "profit"}
                className="flex-1"
              />
              <span className="text-[10px] text-text-muted">w={it.weight}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
