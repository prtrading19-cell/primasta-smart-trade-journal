import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type {
  GoldResearchReportV2Row,
  DailyGoldResearchReportV2Row,
  GoldCategoryScoreRow,
  GoldDecisionEngineOutputRow,
  NewGoldResearchReportV2Input,
  NewGoldCategoryScoreInput,
  NewGoldDecisionEngineOutputInput,
  GoldResearchV2Repository
} from "@/types/goldResearchPersistence";
import type { CategoryScoreObject, GoldDecisionEngineOutput } from "@/types/goldResearchConfig";

function toReportV2Row(input: NewGoldResearchReportV2Input, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    report_date: input.reportDate,
    driver_name: input.driverName,
    input_headline: input.inputHeadline ?? null,
    input_summary: input.inputSummary ?? null,
    news_headline: input.inputHeadline ?? null,
    news_summary: input.inputSummary ?? null,
    current_value: input.currentValue ?? null,
    chart_observation: input.chartObservation ?? null,
    source_link: input.sourceLink ?? null,
    notes: input.notes ?? null,
    driver_fields: input.driverFields ?? null,
    driver_specific_data: input.driverFields ?? null,
    gold_bias: input.goldBias,
    impact_level: input.impactLevel,
    time_sensitivity: input.timeSensitivity,
    confidence_score: input.confidenceScore,
    explanation: input.explanation,
    gold_meaning: input.goldMeaning,
    checklist_effect: input.checklistEffect,
    trading_caution: input.tradingCaution,
    final_guidance: input.finalGuidance,
    driver_strength: input.driverStrength ?? null,
    driver_confidence: input.driverConfidence ?? null,
    driver_weight: input.driverWeight ?? null,
    driver_contribution: input.driverContribution ?? null,
    driver_category: input.driverCategory ?? null,
    confidence_explanation: input.confidenceExplanation ?? null,
    trend: input.trend ?? null,
    momentum: input.momentum ?? null,
    historical_change: input.historicalChange ?? null,
    economic_surprise: input.economicSurprise ?? null,
    driver_analysis_v2: input.driverAnalysisV2 ?? null
  };
}

function toCategoryScoreRow(input: NewGoldCategoryScoreInput, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    daily_report_id: input.dailyReportId,
    category_id: input.categoryId,
    category_title: input.categoryTitle,
    score: input.score,
    bias: input.bias,
    confidence: input.confidence,
    reason: input.reason,
    weight: input.weight,
    weighted_score: input.weightedScore,
    driver_contributions: input.driverContributions,
    alignment_score: input.alignmentScore,
    alignment_strength: input.alignmentStrength,
    has_conflict: input.hasConflict,
    driver_count: input.driverCount
  };
}

function toDecisionEngineRow(input: NewGoldDecisionEngineOutputInput, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    daily_report_id: input.dailyReportId,
    macro_score: input.macroScore,
    technical_score: input.technicalScore,
    institutional_score: input.institutionalScore,
    sentiment_score: input.sentimentScore,
    risk_score: input.riskScore,
    final_gold_score: input.finalGoldScore,
    overall_bias: input.overallBias,
    overall_confidence: input.overallConfidence,
    decision: input.decision,
    reasoning_summary: input.reasoningSummary,
    risk_warnings: input.riskWarnings,
    supporting_drivers: input.supportingDrivers,
    conflicting_drivers: input.conflictingDrivers,
    driver_alignment: input.driverAlignment,
    alignment_strength: input.alignmentStrength,
    category_scores_snapshot: input.categoryScoresSnapshot
  };
}

function fromReportV2Row(row: GoldResearchReportV2Row): GoldResearchReportV2Row {
  return { ...row };
}

function fromCategoryScoreRow(row: GoldCategoryScoreRow): GoldCategoryScoreRow {
  return { ...row };
}

function fromDecisionEngineRow(row: GoldDecisionEngineOutputRow): GoldDecisionEngineOutputRow {
  return { ...row };
}

export const goldResearchV2Repository: GoldResearchV2Repository = {
  async saveReportV2(userId: string, input: NewGoldResearchReportV2Input): Promise<string> {
    if (!isSupabaseConfigured || !supabase) {
      return crypto.randomUUID();
    }

    const row = toReportV2Row(input, userId);
    const { data, error } = await supabase
      .from("gold_research_reports")
      .insert(row)
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  },

  async getReportV2(id: string): Promise<GoldResearchReportV2Row | null> {
    if (!isSupabaseConfigured || !supabase) return null;

    const { data, error } = await supabase
      .from("gold_research_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return fromReportV2Row(data as GoldResearchReportV2Row);
  },

  async listReportsV2(userId: string, options?: { limit?: number; offset?: number }): Promise<GoldResearchReportV2Row[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    let query = supabase
      .from("gold_research_reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);

    const { data, error } = await query;
    if (error || !data) return [];
    return (data as GoldResearchReportV2Row[]).map(fromReportV2Row);
  },

  async saveCategoryScore(userId: string, input: NewGoldCategoryScoreInput): Promise<string> {
    if (!isSupabaseConfigured || !supabase) {
      return crypto.randomUUID();
    }

    const row = toCategoryScoreRow(input, userId);
    const { data, error } = await supabase
      .from("gold_category_scores")
      .insert(row)
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  },

  async getCategoryScoresByDailyReport(userId: string, dailyReportId: string): Promise<GoldCategoryScoreRow[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    const { data, error } = await supabase
      .from("gold_category_scores")
      .select("*")
      .eq("user_id", userId)
      .eq("daily_report_id", dailyReportId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return (data as GoldCategoryScoreRow[]).map(fromCategoryScoreRow);
  },

  async listCategoryScores(userId: string, options?: { limit?: number; offset?: number }): Promise<GoldCategoryScoreRow[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    let query = supabase
      .from("gold_category_scores")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);

    const { data, error } = await query;
    if (error || !data) return [];
    return (data as GoldCategoryScoreRow[]).map(fromCategoryScoreRow);
  },

  async deleteCategoryScoresByDailyReport(userId: string, dailyReportId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    await supabase
      .from("gold_category_scores")
      .delete()
      .eq("user_id", userId)
      .eq("daily_report_id", dailyReportId);
  },

  async saveDecisionEngineOutput(userId: string, input: NewGoldDecisionEngineOutputInput): Promise<string> {
    if (!isSupabaseConfigured || !supabase) {
      return crypto.randomUUID();
    }

    const row = toDecisionEngineRow(input, userId);
    const { data, error } = await supabase
      .from("gold_decision_engine_outputs")
      .insert(row)
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  },

  async getDecisionEngineOutput(userId: string, dailyReportId: string): Promise<GoldDecisionEngineOutputRow | null> {
    if (!isSupabaseConfigured || !supabase) return null;

    const { data, error } = await supabase
      .from("gold_decision_engine_outputs")
      .select("*")
      .eq("user_id", userId)
      .eq("daily_report_id", dailyReportId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return fromDecisionEngineRow(data as GoldDecisionEngineOutputRow);
  },

  async listDecisionEngineOutputs(userId: string, options?: { limit?: number; offset?: number }): Promise<GoldDecisionEngineOutputRow[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    let query = supabase
      .from("gold_decision_engine_outputs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);

    const { data, error } = await query;
    if (error || !data) return [];
    return (data as GoldDecisionEngineOutputRow[]).map(fromDecisionEngineRow);
  },

  async deleteDecisionEngineOutput(userId: string, id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    await supabase
      .from("gold_decision_engine_outputs")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);
  },

  async updateDailyReportV2(userId: string, dailyReportId: string, updates: {
    categoryScores?: CategoryScoreObject[];
    decisionEngine?: GoldDecisionEngineOutput;
    expandedSections?: unknown[];
    schemaVersion?: number;
  }): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    const updatePayload: Record<string, unknown> = {};

    if (updates.categoryScores !== undefined) {
      updatePayload.category_scores_json = updates.categoryScores;
    }
    if (updates.decisionEngine !== undefined) {
      updatePayload.decision_engine_json = updates.decisionEngine;
    }
    if (updates.expandedSections !== undefined) {
      updatePayload.expanded_sections_json = updates.expandedSections;
    }
    if (updates.schemaVersion !== undefined) {
      updatePayload.schema_version = updates.schemaVersion;
    }

    if (Object.keys(updatePayload).length === 0) return;

    await supabase
      .from("daily_gold_research_reports")
      .update(updatePayload)
      .eq("user_id", userId)
      .eq("id", dailyReportId);
  }
};
