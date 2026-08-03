import type { AssetRiskItem, CorrelationMatrix, ExposureResult, PortfolioPosition, PortfolioRiskResult, RiskCluster } from "./types";
import { RISK_LEVEL_BY_SCORE, RISK_SCORE_BY_LEVEL } from "./config";
import type { RiskLevel } from "../decision/types";

export interface RiskEngineInput {
  positions: PortfolioPosition[];
  correlation: CorrelationMatrix;
  exposure: ExposureResult;
}

function levelForScore(score: number): RiskLevel {
  for (const range of RISK_LEVEL_BY_SCORE) {
    if (score <= range.max) return range.level;
  }
  return "Extreme";
}

export class PortfolioRiskEngine {
  compute(input: RiskEngineInput): PortfolioRiskResult {
    const { positions, correlation, exposure } = input;

    const perAsset: AssetRiskItem[] = positions.map((pos) => {
      const weight = exposure.items.find((e) => e.assetId === pos.assetId)?.weight ?? 0;
      const totalWeight = exposure.grossExposure > 0 ? exposure.grossExposure : 1;
      return {
        assetId: pos.assetId,
        assetName: pos.assetName,
        assetClass: pos.assetClass,
        overallRisk: pos.riskLevel,
        overallScore: pos.riskScore,
        contribution: totalWeight > 0 ? Math.round((weight / totalWeight) * 1000) / 10 : 0,
      };
    });

    const weightedScore = positions.reduce((sum, pos) => {
      const weight = exposure.items.find((e) => e.assetId === pos.assetId)?.weight ?? 0;
      const totalWeight = exposure.grossExposure > 0 ? exposure.grossExposure : 1;
      const share = totalWeight > 0 ? weight / totalWeight : 0;
      return sum + pos.riskScore * share;
    }, 0);
    const overallScore = Math.round(weightedScore);

    const riskClusters: RiskCluster[] = [];
    for (const cell of correlation.cells) {
      if (cell.status !== "computed" || cell.coefficient === null) continue;
      if (cell.coefficient >= 0.6) {
        const a = perAsset.find((p) => p.assetId === cell.assetA);
        const b = perAsset.find((p) => p.assetId === cell.assetB);
        if (a && b && (a.overallScore >= 60 || b.overallScore >= 60)) {
          riskClusters.push({
            assetA: cell.assetA,
            assetB: cell.assetB,
            reason: `High correlation (${cell.coefficient.toFixed(2)}) with elevated risk in ${cell.assetA} (${a.overallScore}) / ${cell.assetB} (${b.overallScore})`,
          });
        }
      }
    }

    let correlationImpact: PortfolioRiskResult["correlationImpact"] = "neutral";
    if (input.correlation.cells.length > 0) {
      const computed = input.correlation.cells.filter((c) => c.status === "computed" && c.coefficient !== null);
      if (computed.length > 0) {
        const avg = computed.reduce((s, c) => s + (c.coefficient ?? 0), 0) / computed.length;
        correlationImpact = avg > 0.4 ? "concentrating" : avg < 0 ? "diversifying" : "neutral";
      }
    }

    const overallRisk = levelForScore(overallScore);
    return {
      overallRisk,
      overallScore,
      perAsset,
      correlationImpact,
      riskClusters,
      assessment: buildAssessment(overallRisk, overallScore, riskClusters.length),
    };
  }
}

function buildAssessment(risk: RiskLevel, score: number, clusterCount: number): string {
  const base = `Portfolio risk rated ${risk} (score ${score}/100).`;
  const clusterNote = clusterCount > 0
    ? ` ${clusterCount} risk cluster${clusterCount > 1 ? "s" : ""} detected across correlated exposures.`
    : " No correlated risk clusters detected.";
  return base + clusterNote;
}

export function computePortfolioRisk(input: RiskEngineInput): PortfolioRiskResult {
  return new PortfolioRiskEngine().compute(input);
}

export function riskLevelScore(level: RiskLevel): number {
  return RISK_SCORE_BY_LEVEL[level];
}
