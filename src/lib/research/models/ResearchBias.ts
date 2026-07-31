import type { DriverBias } from "@/types/goldResearchConfig";
import type { ResearchCategory } from "./ResearchCategory";
import type { ResearchInstitutional } from "./ResearchInstitutional";
import type { ResearchTechnical } from "./ResearchTechnical";

export interface ResearchBias {
  overallBias: DriverBias;
  overallScore: number;
  confidence: number;
  categoryContribution: number;
  institutionalContribution: number;
  technicalContribution: number;
  categoryBias: DriverBias;
  institutionalBias: DriverBias;
  technicalBias: DriverBias;
  alignmentScore: number;
  conflictScore: number;
}

export interface BiasEngineInput {
  categories: ResearchCategory[];
  institutional: ResearchInstitutional;
  technical: ResearchTechnical;
}
