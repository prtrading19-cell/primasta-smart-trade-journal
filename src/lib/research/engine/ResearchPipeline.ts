import type { ResearchDataset, ResearchDriver, ResearchCategory, ResearchInstitutional, ResearchTechnical, ResearchBias, ResearchDecision, ResearchSummary } from "../models";
import type { InstitutionalEngineInput, TechnicalEngineInput, ResearchSummaryInput } from "../models";
import type { WeightConfiguration } from "@/types/goldResearchConfig";
import type { DecisionIntelligenceResult } from "../decision";
import { executeDriverEngine } from "./DriverEngine";
import { executeCategoryEngine } from "./CategoryEngine";
import { executeInstitutionalEngine } from "./InstitutionalEngine";
import { executeTechnicalEngine } from "./TechnicalEngine";
import { executeBiasEngine } from "./BiasEngine";
import { executeDecisionEngine } from "./DecisionEngine";
import { executeResearchSummaryEngine } from "./ResearchSummaryEngine";
import { runDecisionIntelligence } from "../decision/DecisionIntelligenceEngine";

export interface PipelineResult {
  dataset: ResearchDataset;
  drivers: ResearchDriver[];
  categories: ResearchCategory[];
  institutional: ResearchInstitutional;
  technical: ResearchTechnical;
  bias: ResearchBias;
  decision: ResearchDecision;
  summary: ResearchSummary;
  decisionIntelligence?: DecisionIntelligenceResult;
  executionTimeMs: number;
  stages: string[];
}

export async function run(
  dataset: ResearchDataset,
  options?: {
    weightConfig?: WeightConfiguration;
    categoryIds?: string[];
    technicalInput?: TechnicalEngineInput;
    institutionalInput?: InstitutionalEngineInput;
    enableDecisionIntelligence?: boolean;
    providerHealth?: { successRate: number; averageLatency: number } | null;
  }
): Promise<PipelineResult> {
  const startTime = performance.now();
  const stages: string[] = [];

  stages.push("driver");
  const drivers = executeDriverEngine(dataset);

  stages.push("category");
  const { categories } = executeCategoryEngine(drivers, options?.weightConfig, options?.categoryIds);

  stages.push("institutional");
  const institutional = executeInstitutionalEngine(
    options?.institutionalInput ?? buildInstitutionalInput(dataset)
  );

  stages.push("technical");
  const technical = executeTechnicalEngine(
    options?.technicalInput ?? buildTechnicalInput(dataset)
  );

  stages.push("bias");
  const bias = executeBiasEngine({ categories, institutional, technical });

  stages.push("decision");
  const decision = executeDecisionEngine(bias);

  stages.push("summary");
  const summary = executeResearchSummaryEngine({
    asset: dataset.asset,
    reportDate: typeof dataset.collectedAt === "string" && dataset.collectedAt ? dataset.collectedAt.split("T")[0] : new Date().toISOString().slice(0, 10),
    drivers: drivers.map((d) => ({
      driverTitle: d.driverTitle,
      bias: d.bias,
      confidence: d.confidence,
      currentDataValue: d.currentDataValue,
    })),
    decisionBias: bias.overallBias,
    decisionAction: decision.action,
    decisionConfidence: decision.confidence,
    riskRating: decision.riskRating,
    alignmentScore: bias.alignmentScore,
  });

  let decisionIntelligence: DecisionIntelligenceResult | undefined;
  if (options?.enableDecisionIntelligence) {
    stages.push("decision-intelligence");
    decisionIntelligence = runDecisionIntelligence({
      asset: dataset.asset,
      drivers,
      categories,
      institutional,
      technical,
      bias,
      decision,
      providerHealth: options.providerHealth,
    });
  }

  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    dataset,
    drivers,
    categories,
    institutional,
    technical,
    bias,
    decision,
    summary,
    decisionIntelligence,
    executionTimeMs,
    stages,
  };
}

function buildInstitutionalInput(dataset: ResearchDataset): InstitutionalEngineInput {
  return {
    etfFlows: dataset.etf ? {
      direction: "Unknown",
      etfs: dataset.etf.etfs.map((e) => ({
        symbol: e.symbol,
        flowDirection: e.flowDirection,
      })),
    } : undefined,
    cot: dataset.cot,
    macro: dataset.macro ? {
      indicators: dataset.macro.indicators.map((i) => ({
        name: i.name,
        value: String(i.value),
        trend: i.trend,
      })),
    } : undefined,
    breadth: dataset.breadth ? {
      advancing: dataset.breadth.advances,
      declining: dataset.breadth.declines,
    } : undefined,
    volatility: dataset.volatility ? {
      vix: dataset.volatility.vix ?? 0,
      gvz: (dataset.volatility as any).gvz ?? dataset.gold?.gvz,
    } : undefined,
  };
}

function buildTechnicalInput(dataset: ResearchDataset): TechnicalEngineInput {
  const vol = dataset.volatility;
  const us100 = dataset.us100;

  let trendDirection: number | undefined;
  if (us100?.stocks && us100.stocks.length > 0) {
    const positive = us100.stocks.filter((s) => s.changePercent > 0).length;
    const total = us100.stocks.length;
    trendDirection = (positive / total) * 2 - 1;
  }

  return {
    trendDirection,
    volatilityLevel: vol?.vix != null ? vol.vix : undefined,
  };
}
