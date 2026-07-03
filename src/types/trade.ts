export type TradeType = "Buy" | "Sell";
export type TradeStatus = "Open" | "Closed";
export type TradeResult = "Win" | "Loss" | "Break-even";
export type Session = "Asian" | "London" | "New York" | "London/New York overlap";
export type Timeframe = "Daily" | "H4" | "H1" | "M15" | "M5";
export type Emotion = "Calm" | "Confident" | "Fearful" | "Greedy" | "Impatient" | "Revenge";
export type HtfBias = "Bullish" | "Bearish" | "Ranging" | "Unclear";
export type LiquiditySwept = "Buy-side Liquidity" | "Sell-side Liquidity" | "Asian High" | "Asian Low" | "Previous Day High" | "Previous Day Low" | "Equal Highs" | "Equal Lows" | "None";
export type EntryPoi = "FVG" | "Order Block" | "Breaker Block" | "Mitigation Block" | "Premium Zone" | "Discount Zone" | "Other";
export type ConfirmationTimeframe = "M1" | "M3" | "M5" | "M15" | "M30" | "H1" | "H4";
export type SetupGrade = "A+" | "A" | "B" | "C" | "No Trade";
export type NewsRisk = "No major news" | "News later today" | "News within 30 minutes" | "High-impact news active";
export type TradingRuleStatus = "Passed" | "Failed";

export const CHECKLIST_LABELS = {
  htfBiasClear: "Higher timeframe bias is clear",
  correctZone: "Price is in correct zone: discount for buy / premium for sell",
  keyLiquidityIdentified: "Key liquidity level has been identified",
  liquiditySwept: "Liquidity has been swept",
  strongDisplacement: "Strong displacement candle/move is present",
  mssChochConfirmation: "MSS / CHOCH confirmation is present",
  validFvgObBreaker: "Valid FVG, Order Block, or Breaker Block is identified",
  entryFromHighProbabilityPoi: "Entry is from a high-probability POI",
  stopLossBeyondInvalidation: "Stop loss is placed beyond invalidation/sweep",
  targetLiquidityDefined: "Target liquidity is clearly defined",
  rrAtLeastTwo: "Risk-to-reward is at least 1:2",
  noHighImpactNews: "No high-impact news is too close",
  notMiddleOfRange: "I am not trading in the middle of the range",
  noRevengeTrading: "I am emotionally calm and not revenge trading",
  followedTradingPlan: "I am following my trading plan"
} as const;

export type ChecklistKey = keyof typeof CHECKLIST_LABELS;
export type Checklist = Record<ChecklistKey, boolean>;

export const DEFAULT_CHECKLIST: Checklist = {
  htfBiasClear: false,
  correctZone: false,
  keyLiquidityIdentified: false,
  liquiditySwept: false,
  strongDisplacement: false,
  mssChochConfirmation: false,
  validFvgObBreaker: false,
  entryFromHighProbabilityPoi: false,
  stopLossBeyondInvalidation: false,
  targetLiquidityDefined: false,
  rrAtLeastTwo: false,
  noHighImpactNews: false,
  notMiddleOfRange: false,
  noRevengeTrading: false,
  followedTradingPlan: false
};

export const CRITICAL_A_PLUS_CHECKS: ChecklistKey[] = [
  "strongDisplacement",
  "mssChochConfirmation",
  "validFvgObBreaker",
  "entryFromHighProbabilityPoi",
  "stopLossBeyondInvalidation",
  "targetLiquidityDefined",
  "rrAtLeastTwo",
  "noHighImpactNews",
  "noRevengeTrading"
];

export interface Trade {
  id: string;
  userId: string;
  date: string;
  pair: string;
  tradeType: TradeType;
  strategy: string;
  session: Session;
  timeframe: Timeframe;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  riskAmount: number;
  entryReason: string;
  checklist: Checklist;
  smcChecklist?: Checklist;
  htfBias?: HtfBias;
  liquiditySwept?: LiquiditySwept;
  entryPoi?: EntryPoi;
  confirmationTimeframe?: ConfirmationTimeframe;
  setupGrade?: SetupGrade;
  newsRisk?: NewsRisk;
  tradingRuleStatus?: TradingRuleStatus;
  aPlusScore?: number;
  goldResearchReportId?: string;
  goldTradeSetupId?: string;
  emotionBefore: Emotion;
  screenshotBefore?: string;
  status: TradeStatus;
  exitPrice?: number;
  finalResult?: TradeResult;
  profitLoss?: number;
  rMultiple?: number;
  exitReason?: string;
  mistakeMade?: string;
  lessonLearned?: string;
  screenshotAfter?: string;
  createdAt: string;
  updatedAt: string;
}

export type NewTradeInput = Omit<
  Trade,
  | "id"
  | "userId"
  | "createdAt"
  | "updatedAt"
  | "exitPrice"
  | "finalResult"
  | "profitLoss"
  | "rMultiple"
  | "exitReason"
  | "mistakeMade"
  | "lessonLearned"
  | "screenshotAfter"
> &
  Partial<
    Pick<
      Trade,
      | "exitPrice"
      | "finalResult"
      | "profitLoss"
      | "rMultiple"
      | "exitReason"
      | "mistakeMade"
      | "lessonLearned"
      | "screenshotAfter"
    >
  >;

export type ClosingDetails = Required<
  Pick<Trade, "exitPrice" | "finalResult" | "profitLoss" | "rMultiple">
> &
  Pick<Trade, "exitReason" | "mistakeMade" | "lessonLearned" | "screenshotAfter">;

export interface TradingPlan {
  id: string;
  userId: string;
  mainMarket: string;
  allowedPairs: string;
  maxTradesPerDay: number;
  riskPerTrade: string;
  minimumRiskReward: string;
  stopAfterLosses: number;
  mainStrategy: string;
  personalRules: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PLAN: Omit<TradingPlan, "id" | "userId" | "createdAt" | "updatedAt"> = {
  mainMarket: "Forex",
  allowedPairs: "EURUSD, GBPUSD, USDJPY, XAUUSD",
  maxTradesPerDay: 2,
  riskPerTrade: "0.25% to 0.5%",
  minimumRiskReward: "1:2",
  stopAfterLosses: 2,
  mainStrategy: "Primasta setup",
  personalRules:
    "No revenge trading\nNo overtrading\nNo moving stop loss\nNo trading without a stop loss\nNo trading without a clear setup"
};

export const PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD", "EURJPY", "GBPJPY", "XAUUSD"];
export const NO_TRADE_STRATEGY = "No Trade / Setup Not Confirmed";
export const STRATEGIES = [
  "A+ Bullish Liquidity Sweep + MSS + FVG",
  "A+ Bearish Liquidity Sweep + MSS + FVG",
  "A+ Bullish Order Block Retest",
  "A+ Bearish Order Block Retest",
  "A+ Asian Range Sweep Buy Setup",
  "A+ Asian Range Sweep Sell Setup",
  "A+ Higher Timeframe POI + Lower Timeframe Confirmation",
  "A+ Bullish Breaker Block Retest",
  "A+ Bearish Breaker Block Retest",
  "SH+BMS + RTO",
  "Liquidity Sweep + Market Structure Shift",
  "Break of Structure Retest",
  "Fair Value Gap Retest",
  "Order Block Retest",
  "Support/Resistance Rejection",
  "Trend Continuation Pullback",
  "London/New York Overlap Momentum Setup",
  "News Spike Wait-and-Retest Setup",
  "Breakout and Retest",
  "Range Liquidity Sweep Reversal",
  NO_TRADE_STRATEGY
];
export const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  "A+ Bullish Liquidity Sweep + MSS + FVG":
    "Price sweeps sell-side liquidity, shows strong bullish displacement, confirms MSS, then retraces into a bullish FVG or OB in discount.",
  "A+ Bearish Liquidity Sweep + MSS + FVG":
    "Price sweeps buy-side liquidity, shows strong bearish displacement, confirms MSS, then retraces into a bearish FVG or OB in premium.",
  "A+ Bullish Order Block Retest":
    "Price takes liquidity, creates bullish displacement, breaks structure, then returns to a valid bullish order block for continuation.",
  "A+ Bearish Order Block Retest":
    "Price takes liquidity, creates bearish displacement, breaks structure, then returns to a valid bearish order block for continuation.",
  "A+ Asian Range Sweep Buy Setup":
    "Asian low is swept during London or New York session, followed by bullish MSS and entry from FVG/OB toward buy-side liquidity.",
  "A+ Asian Range Sweep Sell Setup":
    "Asian high is swept during London or New York session, followed by bearish MSS and entry from FVG/OB toward sell-side liquidity.",
  "A+ Higher Timeframe POI + Lower Timeframe Confirmation":
    "Price reaches a Daily/4H POI, then lower timeframe confirms liquidity sweep, displacement, MSS, and refined entry.",
  "A+ Bullish Breaker Block Retest": "A bearish order block fails, price breaks above it, then retests it as support for bullish continuation.",
  "A+ Bearish Breaker Block Retest": "A bullish order block fails, price breaks below it, then retests it as resistance for bearish continuation.",
  "SH+BMS + RTO": "Price performs a stop hunt at a key liquidity level, confirms a break of market structure, then returns to a valid order block for entry.",
  "Liquidity Sweep + Market Structure Shift": "Price sweeps buy-side or sell-side liquidity, then confirms direction with a market structure shift before entry.",
  "Break of Structure Retest": "Price breaks structure, then retests the broken level before continuation.",
  "Fair Value Gap Retest": "Price creates displacement, leaves an FVG, then returns to the imbalance for a refined entry.",
  "Order Block Retest": "Price returns to a valid order block after displacement and structure confirmation.",
  "Support/Resistance Rejection": "Price reacts from a confirmed support or resistance area with clear rejection and risk control.",
  "Trend Continuation Pullback": "Price pulls back inside an established trend and resumes with confirmation.",
  "London/New York Overlap Momentum Setup": "Momentum continuation setup during the high-liquidity London and New York overlap.",
  "News Spike Wait-and-Retest Setup": "Wait for a news spike to settle, then trade only after retest and structure confirmation.",
  "Breakout and Retest": "Price breaks a key level, retests it, then confirms continuation.",
  "Range Liquidity Sweep Reversal": "Price sweeps range liquidity at one side and reverses only after confirmation.",
  [NO_TRADE_STRATEGY]: "Use this when the setup does not meet A+ requirements or the market is unclear."
};
export const SESSIONS: Session[] = ["Asian", "London", "New York", "London/New York overlap"];
export const TIMEFRAMES: Timeframe[] = ["Daily", "H4", "H1", "M15", "M5"];
export const EMOTIONS: Emotion[] = ["Calm", "Confident", "Fearful", "Greedy", "Impatient", "Revenge"];
export const HTF_BIASES: HtfBias[] = ["Bullish", "Bearish", "Ranging", "Unclear"];
export const LIQUIDITY_SWEPT_OPTIONS: LiquiditySwept[] = ["Buy-side Liquidity", "Sell-side Liquidity", "Asian High", "Asian Low", "Previous Day High", "Previous Day Low", "Equal Highs", "Equal Lows", "None"];
export const ENTRY_POIS: EntryPoi[] = ["FVG", "Order Block", "Breaker Block", "Mitigation Block", "Premium Zone", "Discount Zone", "Other"];
export const CONFIRMATION_TIMEFRAMES: ConfirmationTimeframe[] = ["M1", "M3", "M5", "M15", "M30", "H1", "H4"];
export const SETUP_GRADES: SetupGrade[] = ["A+", "A", "B", "C", "No Trade"];
export const NEWS_RISKS: NewsRisk[] = ["No major news", "News later today", "News within 30 minutes", "High-impact news active"];
export const TRADING_RULE_STATUSES: TradingRuleStatus[] = ["Passed", "Failed"];
