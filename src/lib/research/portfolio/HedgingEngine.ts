import type {
  CorrelationMatrix,
  HedgingResult,
  HedgeSuggestion,
  InstitutionalFlowItem,
  PortfolioPosition,
  PortfolioRiskResult,
} from "./types";
import { HEDGE_VEHICLES } from "./config";

export interface HedgingEngineInput {
  positions: PortfolioPosition[];
  correlation: CorrelationMatrix;
  risk: PortfolioRiskResult;
  institutionalFlows: InstitutionalFlowItem[];
}

export class HedgingEngine {
  compute(input: HedgingEngineInput): HedgingResult {
    const suggestions: HedgeSuggestion[] = [];
    const { positions, correlation, risk, institutionalFlows } = input;

    const active = positions.filter((p) => p.state === "Active" || p.state === "Reduced");
    const longAssets = active.filter((p) => p.direction === "long");
    const shortAssets = active.filter((p) => p.direction === "short");

    /* 1. Conflict: opposing directional signals across assets */
    if (longAssets.length > 0 && shortAssets.length > 0) {
      suggestions.push({
        id: "hedge-conflict",
        type: "conflict",
        severity: "High",
        instrument: HEDGE_VEHICLES.conflict,
        rationale: `Opposing signals detected: ${longAssets.map((a) => a.assetName).join(", ")} long vs ${shortAssets.map((a) => a.assetName).join(", ")} short. Trim the lower-confidence leg.`,
        assets: [...longAssets.map((a) => a.assetId), ...shortAssets.map((a) => a.assetId)],
        effectiveness: 70,
      });
    }

    /* 2. Concentration */
    const longCount = longAssets.length;
    if (longCount === 1 && active.length >= 2) {
      suggestions.push({
        id: "hedge-concentration",
        type: "concentration",
        severity: "Medium",
        instrument: HEDGE_VEHICLES.concentration,
        rationale: `Portfolio concentration in a single long signal (${longAssets[0].assetName}) increases idiosyncratic risk.`,
        assets: longAssets.map((a) => a.assetId),
        effectiveness: 55,
      });
    }

    /* 3. Risk clusters from correlation */
    for (const cluster of risk.riskClusters) {
      suggestions.push({
        id: `hedge-cluster-${cluster.assetA}-${cluster.assetB}`,
        type: "risk-cluster",
        severity: risk.overallRisk === "Extreme" ? "High" : "Medium",
        instrument: HEDGE_VEHICLES["risk-cluster"],
        rationale: cluster.reason,
        assets: [cluster.assetA, cluster.assetB],
        effectiveness: 65,
      });
    }

    /* 4. Institutional conflict: flow disagrees with position direction */
    for (const pos of active) {
      const flow = institutionalFlows.find((f) => f.assetId === pos.assetId);
      if (!flow) continue;
      const flowDirection = flow.flowScore > 0 ? "long" : flow.flowScore < 0 ? "short" : "flat";
      if (pos.direction !== "flat" && flowDirection !== "flat" && pos.direction !== flowDirection) {
        suggestions.push({
          id: `hedge-institutional-${pos.assetId}`,
          type: "institutional",
          severity: "Medium",
          instrument: HEDGE_VEHICLES.institutional,
          rationale: `Institutional flows for ${pos.assetName} (${flow.sources.join(", ")}) run against the ${pos.direction} research signal.`,
          assets: [pos.assetId],
          effectiveness: 50,
        });
      }
    }

    /* 5. Volatility elevation */
    const highVol = positions.some((p) => p.riskLevel === "High" || p.riskLevel === "Extreme");
    if (highVol) {
      suggestions.push({
        id: "hedge-volatility",
        type: "volatility",
        severity: "Medium",
        instrument: HEDGE_VEHICLES.volatility,
        rationale: "Elevated portfolio risk warrants higher cash reserve and reduced sizing.",
        assets: active.map((p) => p.assetId),
        effectiveness: 45,
      });
    }

    const netExposureDirection = shortAssets.length > longAssets.length ? "short" : longAssets.length > shortAssets.length ? "long" : "flat";

    return {
      suggestions,
      netExposureDirection,
      concentrationExposure: active.length > 0 ? Math.round((longAssets.length / active.length) * 100) : 0,
      summary: suggestions.length > 0
        ? `${suggestions.length} hedge opportunity${suggestions.length > 1 ? "s" : ""} identified from conflicts, concentration, risk clusters, institutional flows, and volatility.`
        : "No material hedge opportunities identified from current research signals.",
    };
  }
}

export function computeHedging(input: HedgingEngineInput): HedgingResult {
  return new HedgingEngine().compute(input);
}
