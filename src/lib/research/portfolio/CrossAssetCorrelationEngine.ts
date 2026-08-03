import type { CorrelationCell, CorrelationMatrix } from "./types";
import type { ResearchSnapshot } from "../repository/types";
import { PORTFOLIO_MIN_SNAPSHOTS_FOR_CORRELATION } from "./config";

export interface CorrelationSeries {
  assetId: string;
  snapshots: ResearchSnapshot[];
}

function signalValue(snapshot: ResearchSnapshot): number {
  const action = snapshot.result.decision.action;
  switch (action) {
    case "STRONG BUY": return 100;
    case "BUY": return 70;
    case "SELL": return -70;
    case "STRONG SELL": return -100;
    default: return 0;
  }
}

function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 2) return null;
  const ax = a.slice(0, n);
  const bx = b.slice(0, n);
  const meanA = ax.reduce((s, v) => s + v, 0) / n;
  const meanB = bx.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = ax[i] - meanA;
    const db = bx[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  if (denA === 0 || denB === 0) return null;
  const r = num / Math.sqrt(denA * denB);
  return Number.isFinite(r) ? Math.round(r * 1000) / 1000 : null;
}

function describeCorrelation(r: number | null, points: number): { strength: CorrelationCell["strength"]; interpretation: string } {
  if (r === null) {
    return {
      strength: "unavailable",
      interpretation: "Insufficient overlapping history to compute correlation",
    };
  }
  const abs = Math.abs(r);
  let strength: CorrelationCell["strength"];
  if (abs >= 0.7) strength = "strong";
  else if (abs >= 0.4) strength = "moderate";
  else if (abs >= 0.2) strength = "weak";
  else strength = "none";

  const direction = r >= 0 ? "positively" : "negatively";
  const interpretation = `${direction} correlated (r=${r.toFixed(2)}, ${points} aligned signals)`;
  return { strength, interpretation };
}

export class CrossAssetCorrelationEngine {
  compute(series: CorrelationSeries[]): CorrelationMatrix {
    const assets = series.map((s) => s.assetId);
    const cells: CorrelationCell[] = [];

    for (let i = 0; i < series.length; i++) {
      for (let j = i + 1; j < series.length; j++) {
        const a = series[i];
        const b = series[j];

        const aSnaps = [...a.snapshots].sort((x, y) => x.timestamp.localeCompare(y.timestamp));
        const bSnaps = [...b.snapshots].sort((x, y) => x.timestamp.localeCompare(y.timestamp));

        const aSeries = aSnaps.map(signalValue);
        const bSeries = bSnaps.map(signalValue);

        const points = Math.min(aSeries.length, bSeries.length);
        const r = points >= PORTFOLIO_MIN_SNAPSHOTS_FOR_CORRELATION ? pearson(aSeries, bSeries) : null;
        const { strength, interpretation } = describeCorrelation(r, points);

        cells.push({
          assetA: a.assetId,
          assetB: b.assetId,
          coefficient: r,
          points,
          status: r === null ? "insufficient" : "computed",
          strength,
          interpretation,
        });
      }
    }

    return {
      assets,
      cells,
      methodology: "Pearson correlation of aligned research decision signals from repository snapshot history",
      generatedAt: new Date().toISOString(),
    };
  }
}

export function computeCrossAssetCorrelation(series: CorrelationSeries[]): CorrelationMatrix {
  return new CrossAssetCorrelationEngine().compute(series);
}
