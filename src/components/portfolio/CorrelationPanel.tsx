import { Layers } from "lucide-react";
import { Panel, ProgressBar, formatPct } from "@/components/institutional/primitives";
import type { CorrelationMatrix } from "./types";

const strengthTone: Record<string, string> = {
  strong: "text-loss",
  moderate: "text-warning",
  weak: "text-gold",
  none: "text-text-muted",
  unavailable: "text-text-muted",
};

const strengthBg: Record<string, string> = {
  strong: "bg-loss/10",
  moderate: "bg-warning/10",
  weak: "bg-gold/10",
  none: "bg-surface-panel",
  unavailable: "bg-surface-panel",
};

export function CorrelationPanel({ correlation }: { correlation: CorrelationMatrix }) {
  const { assets, cells } = correlation;

  if (assets.length === 0) {
    return (
      <Panel eyebrow="Correlation" title="Cross-Asset Correlation" icon={Layers}>
        <p className="py-6 text-center text-sm text-text-muted">Insufficient data to compute correlations.</p>
      </Panel>
    );
  }

  const cellFor = (a: string, b: string) =>
    cells.find((c) => (c.assetA === a && c.assetB === b) || (c.assetA === b && c.assetB === a));

  return (
    <Panel
      eyebrow="Correlation"
      title="Cross-Asset Correlation"
      icon={Layers}
      badge={<span className="text-[10px] text-text-muted">{correlation.methodology}</span>}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="text-left text-[10px] uppercase tracking-wider text-text-muted">Asset</th>
              {assets.map((a) => (
                <th key={a} className="text-center text-[10px] uppercase tracking-wider text-text-muted">
                  {a.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a}>
                <td className="text-[10px] font-bold uppercase text-text-primary">{a}</td>
                {assets.map((b) => {
                  if (a === b) {
                    return (
                      <td key={b} className="rounded bg-surface-panel/60 text-center text-xs font-bold text-text-muted">
                        —
                      </td>
                    );
                  }
                  const cell = cellFor(a, b);
                  const coef = cell?.coefficient ?? null;
                  const strength = cell?.strength ?? "unavailable";
                  return (
                    <td key={b} className={`rounded px-2 py-1 text-center ${strengthBg[strength]}`}>
                      <span className={`text-xs font-bold ${strengthTone[strength]}`}>
                        {coef == null ? "—" : coef.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {cells.map((c) => (
          <div key={`${c.assetA}-${c.assetB}`} className="rounded-lg border border-border-subtle bg-surface-panel/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">
              {c.assetA.toUpperCase()} × {c.assetB.toUpperCase()}
            </p>
            <p className={`mt-1 text-lg font-black ${strengthTone[c.strength]}`}>
              {c.coefficient == null ? "—" : c.coefficient.toFixed(2)}
            </p>
            <p className="text-[10px] text-text-muted">{c.strength} · {c.points} pts</p>
            <ProgressBar
              value={c.coefficient == null ? 0 : Math.abs(c.coefficient) * 100}
              tone={c.coefficient != null && Math.abs(c.coefficient) >= 0.7 ? "loss" : "gold"}
              className="mt-1.5"
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}
