import type { DriverBias } from "@/types/goldResearchConfig";

export interface ResearchInstitutional {
  bias: DriverBias;
  score: number;
  confidence: number;
  strength: string;
  etfFlowInterpretation: string;
  cotInterpretation: string;
  macroInterpretation: string;
  breadthInterpretation: string;
  volatilityInterpretation: string;
  supportingFactors: string[];
  conflictingFactors: string[];
  summary: string;
}

export interface InstitutionalEngineInput {
  etfFlows?: {
    direction: string;
    magnitude?: string;
    netFlow?: number;
    etfs: { symbol?: string; flowDirection: string }[];
  };
  cot?: {
    contractName?: string;
    nonCommercials: { netLong: number; long: number; short: number };
    commercials: { netLong: number; long: number; short: number };
  }[];
  macro?: {
    indicators: { name: string; value: string; trend?: string }[];
  };
  breadth?: {
    advancing: number;
    declining: number;
    ratio?: number;
  };
  volatility?: {
    vix?: number;
    gvz?: number;
  };
}
