import type { ExposureItem, ExposureResult, PortfolioPosition } from "./types";

export interface ExposureEngineInput {
  positions: PortfolioPosition[];
}

export class ExposureEngine {
  compute(input: ExposureEngineInput): ExposureResult {
    const items: ExposureItem[] = [];
    let total = 0;

    for (const pos of input.positions) {
      const weight = Math.abs(pos.score) * (pos.confidence / 100);
      total += weight;
      items.push({
        assetId: pos.assetId,
        assetName: pos.assetName,
        assetClass: pos.assetClass,
        exposurePercent: 0,
        signalScore: pos.score,
        direction: pos.direction,
        confidence: pos.confidence,
        weight,
      });
    }

    for (const item of items) {
      item.exposurePercent = total > 0 ? Math.round((item.weight / total) * 1000) / 10 : 0;
    }

    const grossExposure = total;
    const netExposure = items.reduce((s, i) => s + (i.direction === "short" ? -i.weight : i.direction === "long" ? i.weight : 0), 0);
    const concentration = total > 0
      ? items.reduce((s, i) => s + Math.pow(i.weight / total, 2), 0)
      : 0;

    return {
      totalExposure: Math.round(grossExposure * 10) / 10,
      netExposure: Math.round(netExposure * 10) / 10,
      grossExposure: Math.round(grossExposure * 10) / 10,
      concentration: Math.round(concentration * 1000) / 1000,
      concentrationLabel: concentration >= 0.6 ? "High" : concentration >= 0.4 ? "Moderate" : "Diversified",
      items,
    };
  }
}

export function computeExposure(positions: PortfolioPosition[]): ExposureResult {
  return new ExposureEngine().compute({ positions });
}
