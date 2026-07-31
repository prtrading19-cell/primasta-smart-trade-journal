import type { DriverBias } from "@/types/goldResearchConfig";
import type { ResearchDriver } from "./ResearchDriver";

export interface ResearchCategory {
  categoryId: string;
  categoryTitle: string;
  score: number;
  bias: DriverBias;
  confidence: number;
  weight: number;
  weightedScore: number;
  driverCount: number;
  hasConflict: boolean;
  drivers: ResearchDriver[];
  reason: string;
}

export interface CategoryEngineInput {
  drivers: ResearchDriver[];
  categoryWeights: Record<string, number>;
  defaultWeight: number;
}
