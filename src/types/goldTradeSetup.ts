export type GoldTradeSetupMode = "Manual" | "Assisted";
export type GoldSetupVerdict = "Buy Setup" | "Sell Setup" | "Wait" | "Pending Confirmation";
export type GoldSetupConfidence = "Low" | "Medium" | "High";
export type GoldSetupStatus = "Planned" | "Used in Trade" | "Invalidated" | "Cancelled";

export interface GoldTradeSetupInputs {
  mode: GoldTradeSetupMode;
  setupDate: string;
  currentGoldPrice: string;
  buySideLiquidityLevel: string;
  buySideLiquidityReason: string;
  sellSideLiquidityLevel: string;
  sellSideLiquidityReason: string;
  keySupport: string;
  keyResistance: string;
  premiumDiscountArea: string;
  currentPriceLocation: string;
  higherTimeframeBias: string;
  marketStructure: string;
  liquiditySweepHappened: string;
  sweepType: string;
  marketStructureShiftHappened: string;
  breakOfStructureHappened: string;
  entryModel: string;
  setupTimeframe: string;
  entryTimeframe: string;
  possibleEntryPrice: string;
  stopLossPrice: string;
  takeProfit1: string;
  takeProfit2: string;
  minimumRiskReward: string;
}

export interface GoldTradeSetupResult {
  setupVerdict: GoldSetupVerdict;
  confidence: GoldSetupConfidence;
  currentGoldPrice: string;
  overallGoldBias: string;
  selectedStrategy: string;
  strategyReason: string;
  buySideLiquidity: string;
  sellSideLiquidity: string;
  liquidityTarget: string;
  entryArea: string;
  stopLossArea: string;
  takeProfitArea: string;
  riskRewardRatio: string;
  invalidationLevel: string;
  confirmationNeeded: string;
  mainRisk: string;
  finalGuidance: string;
}

export interface GoldTradeSetup extends GoldTradeSetupResult {
  id: string;
  userId: string;
  createdAt: string;
  researchReportId?: string;
  setupDate: string;
  status: GoldSetupStatus;
}

export interface NewGoldTradeSetupInput extends GoldTradeSetupResult {
  researchReportId?: string;
  setupDate: string;
  status: GoldSetupStatus;
}

export interface GoldTradeSetupResearchSummary {
  overallGoldBias: string;
  bullishDrivers: string[];
  bearishDrivers: string[];
  mixedDrivers: string[];
  strongestBullishDriver: string;
  strongestBearishDriver: string;
  mainRiskToday: string;
  preTradeVerdict: string;
  finalGuidance: string;
}

export const DEFAULT_GOLD_TRADE_SETUP_INPUTS: GoldTradeSetupInputs = {
  mode: "Manual",
  setupDate: "",
  currentGoldPrice: "",
  buySideLiquidityLevel: "",
  buySideLiquidityReason: "",
  sellSideLiquidityLevel: "",
  sellSideLiquidityReason: "",
  keySupport: "",
  keyResistance: "",
  premiumDiscountArea: "",
  currentPriceLocation: "Unknown",
  higherTimeframeBias: "Neutral",
  marketStructure: "Ranging",
  liquiditySweepHappened: "Not yet",
  sweepType: "None",
  marketStructureShiftHappened: "Not yet",
  breakOfStructureHappened: "Not yet",
  entryModel: "Sweep + MSS",
  setupTimeframe: "H1",
  entryTimeframe: "M15",
  possibleEntryPrice: "",
  stopLossPrice: "",
  takeProfit1: "",
  takeProfit2: "",
  minimumRiskReward: "2"
};
