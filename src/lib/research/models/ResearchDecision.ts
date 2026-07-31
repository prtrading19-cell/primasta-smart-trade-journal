import type { DriverBias } from "@/types/goldResearchConfig";

export type DecisionAction = "BUY" | "SELL" | "WAIT" | "STRONG BUY" | "STRONG SELL";

export interface ResearchDecision {
  action: DecisionAction;
  bias: DriverBias;
  score: number;
  confidence: number;
  riskRating: string;
  decisionQuality: string;
  supportingDrivers: string[];
  conflictingDrivers: string[];
  topContributors: { name: string; contribution: number }[];
  reasoning: string[];
  summary: string;
}
