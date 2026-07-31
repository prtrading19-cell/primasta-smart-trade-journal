import type { ResearchAsset } from "../ResearchTypes";

export interface ResearchSummary {
  asset: ResearchAsset;
  reportDate: string;
  overallBias: string;
  recommendation: string;
  confidence: number;
  risk: string;
  alignment: string;
  executiveSummary: string;
  sections: ResearchSummarySection[];
  missingData: string[];
  generatedAt: string;
  aiEnhanced: boolean;
}

export interface ResearchSummarySection {
  driver: string;
  impact: string;
  reason: string;
  currentDataValue: string;
  newsHeadline: string;
  newsSummary: string;
  chartObservation: string;
  sourceLink: string;
}

export interface ResearchSummaryInput {
  asset: ResearchAsset;
  reportDate: string;
  drivers: { driverTitle: string; bias: string; confidence: number; currentDataValue: string }[];
  decisionBias: string;
  decisionAction: string;
  decisionConfidence: number;
  riskRating: string;
  alignmentScore: number;
}
