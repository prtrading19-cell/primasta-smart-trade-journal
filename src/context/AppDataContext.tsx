"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session as SupabaseSession } from "@supabase/supabase-js";
import { calculateMetrics, type DashboardMetrics } from "@/lib/calculations";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { GoldDriverFields, GoldResearchReport, NewGoldResearchReportInput } from "@/types/goldResearch";
import type { LotMarginCalculation, NewLotMarginCalculationInput } from "@/types/lotMargin";
import {
  DEFAULT_CHECKLIST,
  DEFAULT_PLAN,
  type Checklist,
  type ClosingDetails,
  type NewTradeInput,
  type Trade,
  type TradingPlan
} from "@/types/trade";

interface JournalUser {
  id: string;
  email: string;
  name?: string;
}

interface AppDataContextValue {
  user: JournalUser | null;
  session: SupabaseSession | null;
  authLoading: boolean;
  dataLoading: boolean;
  authError: string | null;
  dataError: string | null;
  isCloudSync: boolean;
  trades: Trade[];
  goldResearchReports: GoldResearchReport[];
  lotMarginCalculations: LotMarginCalculation[];
  plan: TradingPlan | null;
  metrics: DashboardMetrics;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshData: () => Promise<void>;
  addTrade: (input: NewTradeInput) => Promise<Trade>;
  updateTrade: (id: string, updates: Partial<Trade>) => Promise<void>;
  closeTrade: (id: string, details: ClosingDetails) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  addGoldResearchReport: (input: NewGoldResearchReportInput) => Promise<GoldResearchReport>;
  deleteGoldResearchReport: (id: string) => Promise<void>;
  addLotMarginCalculation: (input: NewLotMarginCalculationInput) => Promise<LotMarginCalculation>;
  deleteLotMarginCalculation: (id: string) => Promise<void>;
  savePlan: (input: Omit<TradingPlan, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

const TRADE_STORAGE_KEY = "primasta-smart-trade-journal:trades";
const GOLD_RESEARCH_STORAGE_KEY = "primasta-smart-trade-journal:gold-research";
const LOT_MARGIN_STORAGE_KEY = "primasta-smart-trade-journal:lot-margin";
const PLAN_STORAGE_KEY = "primasta-smart-trade-journal:plan";
const DEMO_USER: JournalUser = { id: "demo-user", email: "demo@primasta.local", name: "Demo Trader" };

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<JournalUser | null>(null);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [goldResearchReports, setGoldResearchReports] = useState<GoldResearchReport[]>([]);
  const [lotMarginCalculations, setLotMarginCalculations] = useState<LotMarginCalculation[]>([]);
  const [plan, setPlan] = useState<TradingPlan | null>(null);

  const metrics = useMemo(() => calculateMetrics(trades), [trades]);

  const refreshData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    setDataError(null);

    try {
      if (isSupabaseConfigured && supabase) {
        const [{ data: tradeRows, error: tradeError }, { data: planRows, error: planError }] = await Promise.all([
          supabase.from("trades").select("*").eq("user_id", user.id).order("date", { ascending: false }),
          supabase.from("trading_plans").select("*").eq("user_id", user.id).limit(1)
        ]);

        if (tradeError) throw tradeError;
        if (planError) throw planError;

        setTrades((tradeRows ?? []).map(fromTradeRow));
        setPlan(planRows?.[0] ? fromPlanRow(planRows[0]) : createDefaultPlan(user.id));

        const { data: researchRows, error: researchError } = await supabase
          .from("gold_research_reports")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!researchError) {
          setGoldResearchReports((researchRows ?? []).map(fromGoldResearchRow));
        } else {
          setGoldResearchReports([]);
        }

        const { data: calculatorRows, error: calculatorError } = await supabase
          .from("lot_margin_calculations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!calculatorError) {
          setLotMarginCalculations((calculatorRows ?? []).map(fromLotMarginRow));
        } else {
          setLotMarginCalculations([]);
        }
      } else {
        setTrades(readLocalTrades());
        setGoldResearchReports(readLocalGoldResearchReports());
        setLotMarginCalculations(readLocalLotMarginCalculations());
        setPlan(readLocalPlan() ?? createDefaultPlan(user.id));
      }
    } catch (error) {
      setDataError(getErrorMessage(error));
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setUser(DEMO_USER);
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError(error.message);
      setSession(data.session);
      setUser(data.session?.user ? mapSupabaseUser(data.session.user) : null);
      setAuthLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ? mapSupabaseUser(nextSession.user) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      void refreshData();
    } else {
      setTrades([]);
      setGoldResearchReports([]);
      setLotMarginCalculations([]);
      setPlan(null);
    }
  }, [refreshData, user]);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);

    if (!isSupabaseConfigured || !supabase) {
      setUser({ ...DEMO_USER, email: email || DEMO_USER.email });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setAuthError(null);

    if (!isSupabaseConfigured || !supabase) {
      setUser({ id: "demo-user", email: email || DEMO_USER.email, name: name || DEMO_USER.name });
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) {
      setAuthError(error.message);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);

    if (!isSupabaseConfigured || !supabase) {
      setUser(DEMO_USER);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  }, []);

  const addTrade = useCallback(
    async (input: NewTradeInput) => {
      if (!user) throw new Error("You must be signed in to add trades.");
      const now = new Date().toISOString();
      const checklist = normalizeChecklist(input.smcChecklist ?? input.checklist);
      const trade: Trade = {
        ...input,
        id: makeId(),
        userId: user.id,
        checklist,
        smcChecklist: checklist,
        aPlusScore: input.aPlusScore ?? countChecklistScore(checklist),
        createdAt: now,
        updatedAt: now
      };

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from("trades").insert(toTradeRow(trade)).select("*").single();
        if (error) throw error;
        const savedTrade = fromTradeRow(data);
        setTrades((current) => [savedTrade, ...current]);
        return savedTrade;
      }

      const nextTrades = [trade, ...trades];
      setTrades(nextTrades);
      writeLocalTrades(nextTrades);
      return trade;
    },
    [trades, user]
  );

  const updateTrade = useCallback(
    async (id: string, updates: Partial<Trade>) => {
      if (!user) throw new Error("You must be signed in to update trades.");
      const updatedAt = new Date().toISOString();
      const nextTrade = trades.find((trade) => trade.id === id);
      if (!nextTrade) return;

      const checklist = normalizeChecklist(updates.smcChecklist ?? updates.checklist ?? nextTrade.smcChecklist ?? nextTrade.checklist);
      const mergedTrade: Trade = normalizeTrade({ ...nextTrade, ...updates, checklist, smcChecklist: checklist, updatedAt });

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from("trades").update(toTradeRow(mergedTrade)).eq("id", id).eq("user_id", user.id);
        if (error) throw error;
      }

      const nextTrades = trades.map((trade) => (trade.id === id ? mergedTrade : trade));
      setTrades(nextTrades);
      if (!isSupabaseConfigured) writeLocalTrades(nextTrades);
    },
    [trades, user]
  );

  const closeTrade = useCallback(
    async (id: string, details: ClosingDetails) => {
      await updateTrade(id, {
        ...details,
        status: "Closed"
      });
    },
    [updateTrade]
  );

  const deleteTrade = useCallback(
    async (id: string) => {
      if (!user) throw new Error("You must be signed in to delete trades.");
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from("trades").delete().eq("id", id).eq("user_id", user.id);
        if (error) throw error;
      }

      const nextTrades = trades.filter((trade) => trade.id !== id);
      setTrades(nextTrades);
      if (!isSupabaseConfigured) writeLocalTrades(nextTrades);
    },
    [trades, user]
  );

  const addGoldResearchReport = useCallback(
    async (input: NewGoldResearchReportInput) => {
      if (!user) throw new Error("You must be signed in to save Gold research.");
      const now = new Date().toISOString();
      const report: GoldResearchReport = {
        id: makeId(),
        userId: user.id,
        createdAt: now,
        updatedAt: now,
        reportDate: input.reportDate,
        driverName: input.driverName,
        inputHeadline: input.headline,
        inputSummary: input.summary,
        currentValue: input.currentValue,
        chartObservation: input.chartObservation,
        sourceLink: input.sourceLink,
        notes: input.notes,
        driverFields: input.driverFields,
        goldBias: input.goldBias,
        impactLevel: input.impactLevel,
        timeSensitivity: input.timeSensitivity,
        confidenceScore: input.confidenceScore,
        headlineSummary: input.headlineSummary,
        newsDriverSummary: input.newsDriverSummary,
        chartObservationInterpretation: input.chartObservationInterpretation,
        explanation: input.explanation,
        goldMeaning: input.goldMeaning,
        bullishGoldClues: input.bullishGoldClues,
        bearishGoldClues: input.bearishGoldClues,
        keyConflictOrRisk: input.keyConflictOrRisk,
        checklistEffect: input.checklistEffect,
        tradingCaution: input.tradingCaution,
        finalGuidance: input.finalGuidance
      };

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from("gold_research_reports").insert(toGoldResearchRow(report)).select("*").single();
        if (error) throw error;
        const savedReport = fromGoldResearchRow(data);
        setGoldResearchReports((current) => [savedReport, ...current]);
        return savedReport;
      }

      const nextReports = [report, ...goldResearchReports];
      setGoldResearchReports(nextReports);
      writeLocalGoldResearchReports(nextReports);
      return report;
    },
    [goldResearchReports, user]
  );

  const deleteGoldResearchReport = useCallback(
    async (id: string) => {
      if (!user) throw new Error("You must be signed in to delete Gold research.");

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from("gold_research_reports").delete().eq("id", id).eq("user_id", user.id);
        if (error) throw error;
      }

      const nextReports = goldResearchReports.filter((report) => report.id !== id);
      setGoldResearchReports(nextReports);
      if (!isSupabaseConfigured) writeLocalGoldResearchReports(nextReports);
    },
    [goldResearchReports, user]
  );

  const addLotMarginCalculation = useCallback(
    async (input: NewLotMarginCalculationInput) => {
      if (!user) throw new Error("You must be signed in to save calculations.");
      const calculation: LotMarginCalculation = {
        ...input,
        id: makeId(),
        userId: user.id,
        createdAt: new Date().toISOString()
      };

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from("lot_margin_calculations").insert(toLotMarginRow(calculation)).select("*").single();
        if (error) throw error;
        const savedCalculation = fromLotMarginRow(data);
        setLotMarginCalculations((current) => [savedCalculation, ...current]);
        return savedCalculation;
      }

      const nextCalculations = [calculation, ...lotMarginCalculations];
      setLotMarginCalculations(nextCalculations);
      writeLocalLotMarginCalculations(nextCalculations);
      return calculation;
    },
    [lotMarginCalculations, user]
  );

  const deleteLotMarginCalculation = useCallback(
    async (id: string) => {
      if (!user) throw new Error("You must be signed in to delete calculations.");

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from("lot_margin_calculations").delete().eq("id", id).eq("user_id", user.id);
        if (error) throw error;
      }

      const nextCalculations = lotMarginCalculations.filter((calculation) => calculation.id !== id);
      setLotMarginCalculations(nextCalculations);
      if (!isSupabaseConfigured) writeLocalLotMarginCalculations(nextCalculations);
    },
    [lotMarginCalculations, user]
  );

  const savePlan = useCallback(
    async (input: Omit<TradingPlan, "id" | "userId" | "createdAt" | "updatedAt">) => {
      if (!user) throw new Error("You must be signed in to save a trading plan.");
      const now = new Date().toISOString();
      const nextPlan: TradingPlan = {
        id: plan?.id ?? makeId(),
        userId: user.id,
        ...input,
        createdAt: plan?.createdAt ?? now,
        updatedAt: now
      };

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("trading_plans")
          .upsert(toPlanRow(nextPlan), { onConflict: "user_id" })
          .select("*")
          .single();

        if (error) throw error;
        setPlan(fromPlanRow(data));
        return;
      }

      setPlan(nextPlan);
      writeLocalPlan(nextPlan);
    },
    [plan, user]
  );

  const value = useMemo(
    () => ({
      user,
      session,
      authLoading,
      dataLoading,
      authError,
      dataError,
      isCloudSync: isSupabaseConfigured,
      trades,
      goldResearchReports,
      lotMarginCalculations,
      plan,
      metrics,
      signIn,
      signUp,
      signOut,
      refreshData,
      addTrade,
      updateTrade,
      closeTrade,
      deleteTrade,
      addGoldResearchReport,
      deleteGoldResearchReport,
      addLotMarginCalculation,
      deleteLotMarginCalculation,
      savePlan
    }),
    [
      user,
      session,
      authLoading,
      dataLoading,
      authError,
      dataError,
      trades,
      goldResearchReports,
      lotMarginCalculations,
      plan,
      metrics,
      signIn,
      signUp,
      signOut,
      refreshData,
      addTrade,
      updateTrade,
      closeTrade,
      deleteTrade,
      addGoldResearchReport,
      deleteGoldResearchReport,
      addLotMarginCalculation,
      deleteLotMarginCalculation,
      savePlan
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return context;
}

function mapSupabaseUser(user: SupabaseSession["user"]): JournalUser {
  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : undefined
  };
}

function createDefaultPlan(userId: string): TradingPlan {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    userId,
    ...DEFAULT_PLAN,
    createdAt: now,
    updatedAt: now
  };
}

function readLocalTrades() {
  if (typeof window === "undefined") return [];
  try {
    return (JSON.parse(window.localStorage.getItem(TRADE_STORAGE_KEY) ?? "[]") as Trade[]).map(normalizeTrade);
  } catch {
    return [];
  }
}

function writeLocalTrades(trades: Trade[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TRADE_STORAGE_KEY, JSON.stringify(trades));
  }
}

function readLocalGoldResearchReports() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(GOLD_RESEARCH_STORAGE_KEY) ?? "[]") as GoldResearchReport[];
  } catch {
    return [];
  }
}

function writeLocalGoldResearchReports(reports: GoldResearchReport[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(GOLD_RESEARCH_STORAGE_KEY, JSON.stringify(reports));
  }
}

function readLocalLotMarginCalculations() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOT_MARGIN_STORAGE_KEY) ?? "[]") as LotMarginCalculation[];
  } catch {
    return [];
  }
}

function writeLocalLotMarginCalculations(calculations: LotMarginCalculation[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOT_MARGIN_STORAGE_KEY, JSON.stringify(calculations));
  }
}

function readLocalPlan() {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(PLAN_STORAGE_KEY);
    return value ? (JSON.parse(value) as TradingPlan) : null;
  } catch {
    return null;
  }
}

function writeLocalPlan(plan: TradingPlan) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
  }
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function normalizeGoldDriverFields(value: unknown): GoldDriverFields | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return Object.fromEntries(Object.entries(value).map(([key, fieldValue]) => [key, String(fieldValue ?? "")]));
}

function normalizeGoldAnalysisResult(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  return {
    headlineSummary: typeof source.headlineSummary === "string" ? source.headlineSummary : undefined,
    newsDriverSummary: typeof source.newsDriverSummary === "string" ? source.newsDriverSummary : undefined,
    chartObservationInterpretation: typeof source.chartObservationInterpretation === "string" ? source.chartObservationInterpretation : undefined,
    bullishGoldClues: Array.isArray(source.bullishGoldClues) ? source.bullishGoldClues.map((item) => String(item)) : undefined,
    bearishGoldClues: Array.isArray(source.bearishGoldClues) ? source.bearishGoldClues.map((item) => String(item)) : undefined,
    keyConflictOrRisk: typeof source.keyConflictOrRisk === "string" ? source.keyConflictOrRisk : undefined
  };
}

function toGoldAnalysisResult(report: GoldResearchReport) {
  return {
    driverName: report.driverName,
    goldBias: report.goldBias,
    impactLevel: report.impactLevel,
    timeSensitivity: report.timeSensitivity,
    confidenceScore: report.confidenceScore,
    headlineSummary: report.headlineSummary,
    newsDriverSummary: report.newsDriverSummary,
    chartObservationInterpretation: report.chartObservationInterpretation,
    explanation: report.explanation,
    whatThisMeansForGold: report.goldMeaning,
    bullishGoldClues: report.bullishGoldClues,
    bearishGoldClues: report.bearishGoldClues,
    keyConflictOrRisk: report.keyConflictOrRisk,
    checklistEffect: report.checklistEffect,
    tradingCaution: report.tradingCaution,
    finalGuidance: report.finalGuidance
  };
}

function normalizeTrade(trade: Trade): Trade {
  const checklist = normalizeChecklist(trade.smcChecklist ?? trade.checklist);
  return {
    ...trade,
    checklist,
    smcChecklist: checklist,
    aPlusScore: trade.aPlusScore ?? countChecklistScore(checklist)
  };
}

function normalizeChecklist(value: Partial<Checklist> | Record<string, boolean> | undefined): Checklist {
  const source = value ?? {};
  const legacy = source as Record<string, boolean | undefined>;
  return {
    ...DEFAULT_CHECKLIST,
    htfBiasClear: Boolean(source.htfBiasClear),
    correctZone: Boolean(source.correctZone),
    keyLiquidityIdentified: Boolean(source.keyLiquidityIdentified),
    liquiditySwept: Boolean(source.liquiditySwept),
    strongDisplacement: Boolean(source.strongDisplacement),
    mssChochConfirmation: Boolean(source.mssChochConfirmation),
    validFvgObBreaker: Boolean(source.validFvgObBreaker),
    entryFromHighProbabilityPoi: Boolean(source.entryFromHighProbabilityPoi ?? legacy.matchedStrategy),
    stopLossBeyondInvalidation: Boolean(source.stopLossBeyondInvalidation ?? legacy.logicalStopLoss),
    targetLiquidityDefined: Boolean(source.targetLiquidityDefined),
    rrAtLeastTwo: Boolean(source.rrAtLeastTwo),
    noHighImpactNews: Boolean(source.noHighImpactNews),
    notMiddleOfRange: Boolean(source.notMiddleOfRange),
    noRevengeTrading: Boolean(source.noRevengeTrading),
    followedTradingPlan: Boolean(source.followedTradingPlan)
  };
}

function countChecklistScore(checklist: Checklist) {
  return Object.values(checklist).filter(Boolean).length;
}

function fromTradeRow(row: any): Trade {
  const checklist = normalizeChecklist(row.smc_checklist ?? row.checklist);
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    pair: row.pair,
    tradeType: row.trade_type,
    strategy: row.strategy,
    session: row.session,
    timeframe: row.timeframe,
    entryPrice: Number(row.entry_price),
    stopLoss: Number(row.stop_loss),
    takeProfit: Number(row.take_profit),
    lotSize: Number(row.lot_size),
    riskAmount: Number(row.risk_amount),
    entryReason: row.entry_reason ?? "",
    checklist,
    smcChecklist: checklist,
    htfBias: row.htf_bias ?? undefined,
    liquiditySwept: row.liquidity_swept ?? undefined,
    entryPoi: row.entry_poi ?? undefined,
    confirmationTimeframe: row.confirmation_timeframe ?? undefined,
    setupGrade: row.setup_grade ?? undefined,
    newsRisk: row.news_risk ?? undefined,
    tradingRuleStatus: row.trading_rule_status ?? undefined,
    aPlusScore: row.a_plus_score === null || row.a_plus_score === undefined ? countChecklistScore(checklist) : Number(row.a_plus_score),
    goldResearchReportId: row.gold_research_report_id ?? undefined,
    emotionBefore: row.emotion_before,
    screenshotBefore: row.screenshot_before ?? undefined,
    status: row.status,
    exitPrice: row.exit_price === null ? undefined : Number(row.exit_price),
    finalResult: row.final_result ?? undefined,
    profitLoss: row.profit_loss === null ? undefined : Number(row.profit_loss),
    rMultiple: row.r_multiple === null ? undefined : Number(row.r_multiple),
    exitReason: row.exit_reason ?? undefined,
    mistakeMade: row.mistake_made ?? undefined,
    lessonLearned: row.lesson_learned ?? undefined,
    screenshotAfter: row.screenshot_after ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toTradeRow(trade: Trade) {
  return {
    id: trade.id,
    user_id: trade.userId,
    date: trade.date,
    pair: trade.pair,
    trade_type: trade.tradeType,
    strategy: trade.strategy,
    session: trade.session,
    timeframe: trade.timeframe,
    entry_price: trade.entryPrice,
    stop_loss: trade.stopLoss,
    take_profit: trade.takeProfit,
    lot_size: trade.lotSize,
    risk_amount: trade.riskAmount,
    entry_reason: trade.entryReason,
    checklist: trade.checklist,
    smc_checklist: trade.smcChecklist ?? trade.checklist,
    htf_bias: trade.htfBias ?? null,
    liquidity_swept: trade.liquiditySwept ?? null,
    entry_poi: trade.entryPoi ?? null,
    confirmation_timeframe: trade.confirmationTimeframe ?? null,
    setup_grade: trade.setupGrade ?? null,
    news_risk: trade.newsRisk ?? null,
    trading_rule_status: trade.tradingRuleStatus ?? null,
    a_plus_score: trade.aPlusScore ?? countChecklistScore(trade.checklist),
    emotion_before: trade.emotionBefore,
    screenshot_before: trade.screenshotBefore ?? null,
    status: trade.status,
    exit_price: trade.exitPrice ?? null,
    final_result: trade.finalResult ?? null,
    profit_loss: trade.profitLoss ?? null,
    r_multiple: trade.rMultiple ?? null,
    exit_reason: trade.exitReason ?? null,
    mistake_made: trade.mistakeMade ?? null,
    lesson_learned: trade.lessonLearned ?? null,
    screenshot_after: trade.screenshotAfter ?? null,
    created_at: trade.createdAt,
    updated_at: trade.updatedAt,
    ...(trade.goldResearchReportId ? { gold_research_report_id: trade.goldResearchReportId } : {})
  };
}

function fromGoldResearchRow(row: any): GoldResearchReport {
  const analysisResult = normalizeGoldAnalysisResult(row.analysis_result);
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reportDate: row.report_date,
    driverName: row.driver_name,
    inputHeadline: row.news_headline ?? row.input_headline ?? "",
    inputSummary: row.news_summary ?? row.input_summary ?? "",
    currentValue: row.current_value ?? undefined,
    chartObservation: row.chart_observation ?? undefined,
    sourceLink: row.source_link ?? undefined,
    notes: row.notes ?? undefined,
    driverFields: normalizeGoldDriverFields(row.driver_specific_data ?? row.driver_fields),
    goldBias: row.gold_bias,
    impactLevel: row.impact_level,
    timeSensitivity: row.time_sensitivity,
    confidenceScore: Number(row.confidence_score ?? 0),
    headlineSummary: analysisResult.headlineSummary ?? row.news_headline ?? row.input_headline ?? "",
    newsDriverSummary: analysisResult.newsDriverSummary ?? row.news_summary ?? row.input_summary ?? "",
    chartObservationInterpretation: analysisResult.chartObservationInterpretation ?? row.chart_observation ?? "",
    explanation: row.explanation ?? "",
    goldMeaning: row.gold_meaning ?? "",
    bullishGoldClues: analysisResult.bullishGoldClues ?? [],
    bearishGoldClues: analysisResult.bearishGoldClues ?? [],
    keyConflictOrRisk: analysisResult.keyConflictOrRisk ?? row.trading_caution ?? "",
    checklistEffect: row.checklist_effect,
    tradingCaution: row.trading_caution ?? "",
    finalGuidance: row.final_guidance ?? ""
  };
}

function toGoldResearchRow(report: GoldResearchReport) {
  return {
    id: report.id,
    user_id: report.userId,
    created_at: report.createdAt,
    updated_at: report.updatedAt,
    report_date: report.reportDate,
    driver_name: report.driverName,
    input_headline: report.inputHeadline,
    input_summary: report.inputSummary,
    news_headline: report.inputHeadline,
    news_summary: report.inputSummary,
    current_value: report.currentValue ?? null,
    chart_observation: report.chartObservation ?? null,
    source_link: report.sourceLink ?? null,
    notes: report.notes ?? null,
    driver_fields: report.driverFields ?? null,
    driver_specific_data: report.driverFields ?? null,
    analysis_result: toGoldAnalysisResult(report),
    gold_bias: report.goldBias,
    impact_level: report.impactLevel,
    time_sensitivity: report.timeSensitivity,
    confidence_score: report.confidenceScore,
    explanation: report.explanation,
    gold_meaning: report.goldMeaning,
    checklist_effect: report.checklistEffect,
    trading_caution: report.tradingCaution,
    final_guidance: report.finalGuidance
  };
}

function fromLotMarginRow(row: any): LotMarginCalculation {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    accountBalance: Number(row.account_balance ?? 0),
    accountCurrency: row.account_currency ?? "USD",
    riskType: row.risk_type ?? "Percentage",
    riskPercentage: Number(row.risk_percentage ?? 0),
    fixedRiskAmount: Number(row.fixed_risk_amount ?? 0),
    symbol: row.symbol ?? "XAUUSD",
    tradeType: row.trade_type ?? "Buy",
    entryPrice: Number(row.entry_price ?? 0),
    stopLossPrice: Number(row.stop_loss_price ?? 0),
    takeProfitPrice: row.take_profit_price === null || row.take_profit_price === undefined ? undefined : Number(row.take_profit_price),
    leverage: Number(row.leverage ?? 0),
    contractSize: Number(row.contract_size ?? 0),
    pipSize: Number(row.pip_size ?? 0),
    pipValuePerLot: Number(row.pip_value_per_lot ?? 0),
    lotStep: Number(row.lot_step ?? 0),
    minLot: Number(row.min_lot ?? 0),
    maxLot: Number(row.max_lot ?? 0),
    currentMarketPrice: row.current_market_price === null || row.current_market_price === undefined ? undefined : Number(row.current_market_price),
    conversionRate: Number(row.conversion_rate ?? 1),
    notes: row.notes ?? "",
    calculatedLotSize: Number(row.calculated_lot_size ?? 0),
    rawLotSize: Number(row.raw_lot_size ?? row.calculated_lot_size ?? 0),
    riskAmount: Number(row.risk_amount ?? 0),
    stopDistance: Number(row.stop_distance ?? 0),
    stopDistanceInPips: row.stop_distance_in_pips === null || row.stop_distance_in_pips === undefined ? null : Number(row.stop_distance_in_pips),
    riskPerLot: Number(row.risk_per_lot ?? 0),
    estimatedLoss: Number(row.estimated_loss ?? row.risk_amount ?? 0),
    estimatedProfit: row.estimated_profit === null || row.estimated_profit === undefined ? null : Number(row.estimated_profit),
    riskRewardRatio: row.risk_reward_ratio === null || row.risk_reward_ratio === undefined ? null : Number(row.risk_reward_ratio),
    notionalValue: Number(row.notional_value ?? 0),
    marginRequired: Number(row.margin_required ?? 0),
    marginUsedPercentage: Number(row.margin_used_percentage ?? 0),
    estimatedFreeBalanceAfterMargin: Number(row.estimated_free_balance_after_margin ?? 0),
    finalRiskStatus: row.final_risk_status ?? "Invalid Trade",
    guidance: row.guidance ?? "",
    warnings: normalizeStringArray(row.warnings),
    isValid: Boolean(row.is_valid ?? row.final_risk_status !== "Invalid Trade")
  };
}

function toLotMarginRow(calculation: LotMarginCalculation) {
  return {
    id: calculation.id,
    user_id: calculation.userId,
    created_at: calculation.createdAt,
    account_balance: calculation.accountBalance,
    account_currency: calculation.accountCurrency,
    risk_type: calculation.riskType,
    risk_percentage: calculation.riskPercentage,
    fixed_risk_amount: calculation.fixedRiskAmount,
    symbol: calculation.symbol,
    trade_type: calculation.tradeType,
    entry_price: calculation.entryPrice,
    stop_loss_price: calculation.stopLossPrice,
    take_profit_price: calculation.takeProfitPrice ?? null,
    leverage: calculation.leverage,
    contract_size: calculation.contractSize,
    pip_size: calculation.pipSize,
    pip_value_per_lot: calculation.pipValuePerLot,
    lot_step: calculation.lotStep,
    min_lot: calculation.minLot,
    max_lot: calculation.maxLot,
    current_market_price: calculation.currentMarketPrice ?? null,
    conversion_rate: calculation.conversionRate,
    calculated_lot_size: calculation.calculatedLotSize,
    raw_lot_size: calculation.rawLotSize,
    risk_amount: calculation.riskAmount,
    stop_distance: calculation.stopDistance,
    stop_distance_in_pips: calculation.stopDistanceInPips,
    risk_per_lot: calculation.riskPerLot,
    estimated_loss: calculation.estimatedLoss,
    estimated_profit: calculation.estimatedProfit,
    risk_reward_ratio: calculation.riskRewardRatio,
    notional_value: calculation.notionalValue,
    margin_required: calculation.marginRequired,
    margin_used_percentage: calculation.marginUsedPercentage,
    estimated_free_balance_after_margin: calculation.estimatedFreeBalanceAfterMargin,
    final_risk_status: calculation.finalRiskStatus,
    guidance: calculation.guidance,
    warnings: calculation.warnings,
    is_valid: calculation.isValid,
    notes: calculation.notes ?? null
  };
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function fromPlanRow(row: any): TradingPlan {
  return {
    id: row.id,
    userId: row.user_id,
    mainMarket: row.main_market,
    allowedPairs: row.allowed_pairs,
    maxTradesPerDay: Number(row.max_trades_per_day),
    riskPerTrade: row.risk_per_trade,
    minimumRiskReward: row.minimum_risk_reward,
    stopAfterLosses: Number(row.stop_after_losses),
    mainStrategy: row.main_strategy,
    personalRules: row.personal_rules,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toPlanRow(plan: TradingPlan) {
  return {
    id: plan.id,
    user_id: plan.userId,
    main_market: plan.mainMarket,
    allowed_pairs: plan.allowedPairs,
    max_trades_per_day: plan.maxTradesPerDay,
    risk_per_trade: plan.riskPerTrade,
    minimum_risk_reward: plan.minimumRiskReward,
    stop_after_losses: plan.stopAfterLosses,
    main_strategy: plan.mainStrategy,
    personal_rules: plan.personalRules,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt
  };
}
