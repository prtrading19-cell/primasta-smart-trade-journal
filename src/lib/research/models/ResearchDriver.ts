import type { DriverBias, DriverStrength } from "@/types/goldResearchConfig";

export interface ResearchDriver {
  driverId: string;
  driverTitle: string;
  categoryId: string;
  categoryTitle: string;
  bias: DriverBias;
  strength: DriverStrength;
  score: number;
  confidence: number;
  weight: number;
  currentDataValue: string;
  reason: string;
  meta?: Record<string, unknown>;
}

export interface DriverAnalysisInput {
  dataset: Record<string, unknown>;
  categoryId: string;
  categoryTitle: string;
}

export type DriverMapper = (dataset: Record<string, unknown>) => ResearchDriver[];
