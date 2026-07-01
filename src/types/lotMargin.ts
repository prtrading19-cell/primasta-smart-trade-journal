import type { TradeType } from "@/types/trade";

export type AccountCurrency = "USD" | "ZAR" | "EUR" | "GBP" | "Custom";
export type CalculatorRiskType = "Percentage" | "Fixed Amount";
export type CalculatorSymbol = "XAUUSD" | "EURUSD" | "GBPUSD" | "USDJPY" | "GBPJPY" | "US100" | "BTCUSD" | "Custom";
export type CalculatorRiskStatus = "Safe" | "Caution" | "High Risk" | "Invalid Trade";

export interface LotMarginInput {
  accountBalance: number;
  accountCurrency: AccountCurrency;
  riskType: CalculatorRiskType;
  riskPercentage: number;
  fixedRiskAmount: number;
  symbol: CalculatorSymbol | string;
  tradeType: TradeType;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice?: number;
  leverage: number;
  contractSize: number;
  pipSize: number;
  pipValuePerLot: number;
  lotStep: number;
  minLot: number;
  maxLot: number;
  currentMarketPrice?: number;
  conversionRate: number;
  notes?: string;
}

export interface LotMarginResult {
  calculatedLotSize: number;
  rawLotSize: number;
  riskAmount: number;
  stopDistance: number;
  stopDistanceInPips: number | null;
  riskPerLot: number;
  estimatedLoss: number;
  estimatedProfit: number | null;
  riskRewardRatio: number | null;
  notionalValue: number;
  marginRequired: number;
  marginUsedPercentage: number;
  estimatedFreeBalanceAfterMargin: number;
  finalRiskStatus: CalculatorRiskStatus;
  guidance: string;
  warnings: string[];
  isValid: boolean;
}

export interface LotMarginCalculation extends LotMarginInput, LotMarginResult {
  id: string;
  userId: string;
  createdAt: string;
}

export type NewLotMarginCalculationInput = LotMarginInput & LotMarginResult;
