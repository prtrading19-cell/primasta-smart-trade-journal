import type { DriverBias } from "@/types/goldResearchConfig";

export interface ResearchTechnical {
  bias: DriverBias;
  score: number;
  confidence: number;
  strength: string;
  trend: string;
  momentum: string;
  structure: string;
  volatility: string;
  setupPresent: boolean;
  setupType: string;
  supportingFactors: string[];
  conflictingFactors: string[];
  summary: string;
}

export interface TechnicalEngineInput {
  trendDirection?: number;
  trendStrength?: number;
  momentumScore?: number;
  structureScore?: number;
  volatilityLevel?: number;
  movingAverageAlignment?: number;
  setupGrade?: number;
}
