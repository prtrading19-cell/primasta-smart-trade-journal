import type {
  DriverAnalysisObject,
  CategoryScoreObject,
  GoldDecisionEngineOutput,
  DriverContribution
} from "@/types/goldResearchConfig";

export interface GoldResearchReportV2Row {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  report_date: string;
  driver_name: string;
  input_headline: string | null;
  input_summary: string | null;
  news_headline: string | null;
  news_summary: string | null;
  current_value: string | null;
  chart_observation: string | null;
  source_link: string | null;
  notes: string | null;
  driver_fields: Record<string, unknown> | null;
  driver_specific_data: Record<string, unknown> | null;
  analysis_result: Record<string, unknown> | null;
  gold_bias: string;
  impact_level: string;
  time_sensitivity: string;
  confidence_score: number;
  explanation: string;
  gold_meaning: string;
  checklist_effect: string;
  trading_caution: string;
  final_guidance: string;
  driver_strength: string | null;
  driver_confidence: number | null;
  driver_weight: number | null;
  driver_contribution: number | null;
  driver_category: string | null;
  confidence_explanation: string | null;
  trend: string | null;
  momentum: string | null;
  historical_change: string | null;
  economic_surprise: string | null;
  driver_analysis_v2: DriverAnalysisObject | null;
}

export interface DailyGoldResearchReportV2Row {
  id: string;
  user_id: string;
  report_date: string;
  gold_current_price: string | null;
  sections_json: unknown[];
  full_summary_json: Record<string, unknown>;
  overall_gold_bias: string;
  pre_trade_verdict: string;
  created_at: string;
  updated_at: string;
  category_scores_json: CategoryScoreObject[] | null;
  decision_engine_json: GoldDecisionEngineOutput | null;
  expanded_sections_json: unknown[] | null;
  schema_version: number;
}

export interface GoldCategoryScoreRow {
  id: string;
  user_id: string;
  daily_report_id: string | null;
  category_id: string;
  category_title: string;
  score: number;
  bias: string;
  confidence: number;
  reason: string;
  weight: number;
  weighted_score: number;
  driver_contributions: DriverContribution[];
  alignment_score: number;
  alignment_strength: string;
  has_conflict: boolean;
  driver_count: number;
  created_at: string;
  updated_at: string;
}

export interface GoldDecisionEngineOutputRow {
  id: string;
  user_id: string;
  daily_report_id: string | null;
  macro_score: number;
  technical_score: number;
  institutional_score: number;
  sentiment_score: number;
  risk_score: number;
  final_gold_score: number;
  overall_bias: string;
  overall_confidence: number;
  decision: string;
  reasoning_summary: string;
  risk_warnings: string[];
  supporting_drivers: string[];
  conflicting_drivers: string[];
  driver_alignment: number;
  alignment_strength: string;
  category_scores_snapshot: CategoryScoreObject[];
  created_at: string;
  updated_at: string;
}

export interface NewGoldResearchReportV2Input {
  reportDate: string;
  driverName: string;
  goldBias: string;
  impactLevel: string;
  timeSensitivity: string;
  confidenceScore: number;
  explanation: string;
  goldMeaning: string;
  checklistEffect: string;
  tradingCaution: string;
  finalGuidance: string;
  inputHeadline?: string;
  inputSummary?: string;
  currentValue?: string;
  chartObservation?: string;
  sourceLink?: string;
  notes?: string;
  driverFields?: Record<string, string>;
  driverStrength?: string;
  driverConfidence?: number;
  driverWeight?: number;
  driverContribution?: number;
  driverCategory?: string;
  confidenceExplanation?: string;
  trend?: string;
  momentum?: string;
  historicalChange?: string;
  economicSurprise?: string;
  driverAnalysisV2?: DriverAnalysisObject;
}

export interface NewGoldCategoryScoreInput {
  dailyReportId: string;
  categoryId: string;
  categoryTitle: string;
  score: number;
  bias: string;
  confidence: number;
  reason: string;
  weight: number;
  weightedScore: number;
  driverContributions: DriverContribution[];
  alignmentScore: number;
  alignmentStrength: string;
  hasConflict: boolean;
  driverCount: number;
}

export interface NewGoldDecisionEngineOutputInput {
  dailyReportId: string;
  macroScore: number;
  technicalScore: number;
  institutionalScore: number;
  sentimentScore: number;
  riskScore: number;
  finalGoldScore: number;
  overallBias: string;
  overallConfidence: number;
  decision: string;
  reasoningSummary: string;
  riskWarnings: string[];
  supportingDrivers: string[];
  conflictingDrivers: string[];
  driverAlignment: number;
  alignmentStrength: string;
  categoryScoresSnapshot: CategoryScoreObject[];
}

export interface GoldResearchV2Repository {
  saveReportV2(userId: string, input: NewGoldResearchReportV2Input): Promise<string>;
  getReportV2(id: string): Promise<GoldResearchReportV2Row | null>;
  listReportsV2(userId: string, options?: { limit?: number; offset?: number }): Promise<GoldResearchReportV2Row[]>;

  saveCategoryScore(userId: string, input: NewGoldCategoryScoreInput): Promise<string>;
  getCategoryScoresByDailyReport(userId: string, dailyReportId: string): Promise<GoldCategoryScoreRow[]>;
  listCategoryScores(userId: string, options?: { limit?: number; offset?: number }): Promise<GoldCategoryScoreRow[]>;
  deleteCategoryScoresByDailyReport(userId: string, dailyReportId: string): Promise<void>;

  saveDecisionEngineOutput(userId: string, input: NewGoldDecisionEngineOutputInput): Promise<string>;
  getDecisionEngineOutput(userId: string, dailyReportId: string): Promise<GoldDecisionEngineOutputRow | null>;
  listDecisionEngineOutputs(userId: string, options?: { limit?: number; offset?: number }): Promise<GoldDecisionEngineOutputRow[]>;
  deleteDecisionEngineOutput(userId: string, id: string): Promise<void>;

  updateDailyReportV2(userId: string, dailyReportId: string, updates: {
    categoryScores?: CategoryScoreObject[];
    decisionEngine?: GoldDecisionEngineOutput;
    expandedSections?: unknown[];
    schemaVersion?: number;
  }): Promise<void>;
}
