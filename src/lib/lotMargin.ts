import type { CalculatorSymbol, LotMarginInput, LotMarginResult } from "@/types/lotMargin";

export const CALCULATOR_SYMBOLS: CalculatorSymbol[] = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "GBPJPY", "US100", "BTCUSD", "Custom"];
export const ACCOUNT_CURRENCIES = ["USD", "ZAR", "EUR", "GBP", "Custom"] as const;
export const RISK_PERCENTAGE_OPTIONS = ["0.25", "0.5", "1", "Custom"] as const;

export const SYMBOL_PRESETS: Record<CalculatorSymbol, Pick<LotMarginInput, "contractSize" | "pipSize" | "pipValuePerLot" | "lotStep" | "minLot" | "maxLot" | "leverage">> = {
  XAUUSD: { contractSize: 100, pipSize: 0.01, pipValuePerLot: 1, lotStep: 0.01, minLot: 0.01, maxLot: 100, leverage: 500 },
  EURUSD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10, lotStep: 0.01, minLot: 0.01, maxLot: 100, leverage: 500 },
  GBPUSD: { contractSize: 100000, pipSize: 0.0001, pipValuePerLot: 10, lotStep: 0.01, minLot: 0.01, maxLot: 100, leverage: 500 },
  USDJPY: { contractSize: 100000, pipSize: 0.01, pipValuePerLot: 9, lotStep: 0.01, minLot: 0.01, maxLot: 100, leverage: 500 },
  GBPJPY: { contractSize: 100000, pipSize: 0.01, pipValuePerLot: 9, lotStep: 0.01, minLot: 0.01, maxLot: 100, leverage: 500 },
  US100: { contractSize: 1, pipSize: 1, pipValuePerLot: 1, lotStep: 0.01, minLot: 0.01, maxLot: 100, leverage: 100 },
  BTCUSD: { contractSize: 1, pipSize: 1, pipValuePerLot: 1, lotStep: 0.01, minLot: 0.01, maxLot: 100, leverage: 50 },
  Custom: { contractSize: 1, pipSize: 1, pipValuePerLot: 1, lotStep: 0.01, minLot: 0.01, maxLot: 100, leverage: 100 }
};

export function calculateLotMargin(input: LotMarginInput): LotMarginResult {
  const warnings: string[] = [];
  const accountBalance = safeNumber(input.accountBalance);
  const leverage = safeNumber(input.leverage);
  const contractSize = safeNumber(input.contractSize);
  const pipSize = safeNumber(input.pipSize);
  const pipValuePerLot = safeNumber(input.pipValuePerLot);
  const lotStep = safeNumber(input.lotStep);
  const minLot = safeNumber(input.minLot);
  const maxLot = safeNumber(input.maxLot);
  const entryPrice = safeNumber(input.entryPrice);
  const stopLossPrice = safeNumber(input.stopLossPrice);
  const takeProfitPrice = safeOptionalNumber(input.takeProfitPrice);
  const currentMarketPrice = safeOptionalNumber(input.currentMarketPrice) || entryPrice;
  const conversionRate = safeOptionalNumber(input.conversionRate) || 1;
  const riskAmount = input.riskType === "Percentage" ? accountBalance * safeNumber(input.riskPercentage) / 100 : safeNumber(input.fixedRiskAmount);
  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  const forexMode = isForexSymbol(input.symbol);
  const stopDistanceInPips = forexMode && pipSize > 0 ? stopDistance / pipSize : null;
  const riskPerLot = forexMode ? (stopDistanceInPips ?? 0) * pipValuePerLot : stopDistance * contractSize;

  if (accountBalance <= 0) warnings.push("Account balance must be greater than 0.");
  if (riskAmount <= 0) warnings.push("Risk amount must be greater than 0.");
  if (entryPrice <= 0) warnings.push("Entry price must be greater than 0.");
  if (stopLossPrice <= 0 || stopLossPrice === entryPrice) warnings.push("Stop loss is invalid.");
  if (contractSize <= 0) warnings.push("Contract size must be greater than 0.");
  if (leverage <= 0) warnings.push("Leverage must be greater than 0.");
  if (lotStep <= 0) warnings.push("Lot step must be greater than 0.");
  if (forexMode && pipValuePerLot <= 0) warnings.push("Pip value per standard lot must be greater than 0.");
  if (riskPerLot <= 0) warnings.push("Risk per 1 lot could not be calculated.");

  const rawLotSize = riskPerLot > 0 ? riskAmount / riskPerLot : 0;
  const calculatedLotSize = roundDownToStep(rawLotSize, lotStep);
  const estimatedLoss = calculatedLotSize * riskPerLot;
  const rewardDistance = takeProfitPrice ? Math.abs(takeProfitPrice - entryPrice) : 0;
  const riskRewardRatio = takeProfitPrice && stopDistance > 0 ? rewardDistance / stopDistance : null;
  const estimatedProfit = riskRewardRatio === null ? null : estimatedLoss * riskRewardRatio;
  const notionalValue = calculatedLotSize * contractSize * currentMarketPrice;
  const marginRequired = leverage > 0 ? notionalValue / leverage * conversionRate : 0;
  const estimatedFreeBalanceAfterMargin = accountBalance - marginRequired;
  const marginUsedPercentage = accountBalance > 0 ? marginRequired / accountBalance * 100 : 0;

  if (rawLotSize > 0 && calculatedLotSize < minLot) warnings.push("Calculated lot is below broker minimum. Reduce risk, widen account size, or skip trade.");
  if (maxLot > 0 && calculatedLotSize > maxLot) warnings.push("Calculated lot is above broker maximum.");
  if (riskRewardRatio !== null && riskRewardRatio < 2) warnings.push("Risk-to-reward is below your trading plan minimum of 1:2.");
  if (marginUsedPercentage > 20 && marginUsedPercentage <= 50) warnings.push("Margin usage is above 20%. Use caution.");
  if (marginUsedPercentage > 50) warnings.push("Margin usage is above 50%. This is high risk.");
  if (marginRequired > accountBalance && accountBalance > 0) warnings.push("Insufficient margin. Reduce lot size or increase leverage/account balance.");

  const isValid = warnings.every((warning) => !["Account balance must be greater than 0.", "Risk amount must be greater than 0.", "Entry price must be greater than 0.", "Stop loss is invalid.", "Contract size must be greater than 0.", "Leverage must be greater than 0.", "Lot step must be greater than 0.", "Risk per 1 lot could not be calculated."].includes(warning));
  const finalRiskStatus = getRiskStatus(isValid, calculatedLotSize, rawLotSize, minLot, marginUsedPercentage, marginRequired, accountBalance);

  return {
    calculatedLotSize,
    rawLotSize,
    riskAmount,
    stopDistance,
    stopDistanceInPips,
    riskPerLot,
    estimatedLoss,
    estimatedProfit,
    riskRewardRatio,
    notionalValue,
    marginRequired,
    marginUsedPercentage,
    estimatedFreeBalanceAfterMargin,
    finalRiskStatus,
    guidance: getGuidance(finalRiskStatus, riskRewardRatio, marginUsedPercentage, marginRequired, accountBalance),
    warnings,
    isValid: finalRiskStatus !== "Invalid Trade"
  };
}

export function isForexSymbol(symbol: string) {
  return ["EURUSD", "GBPUSD", "USDJPY", "GBPJPY"].includes(symbol.toUpperCase());
}

export function roundDownToStep(value: number, step: number) {
  if (!Number.isFinite(value) || value <= 0 || step <= 0) return 0;
  return Number((Math.floor(value / step) * step).toFixed(8));
}

function getRiskStatus(isValid: boolean, lot: number, rawLot: number, minLot: number, marginUsed: number, marginRequired: number, accountBalance: number): LotMarginResult["finalRiskStatus"] {
  if (!isValid || lot <= 0 || (rawLot > 0 && lot < minLot) || marginRequired > accountBalance) return "Invalid Trade";
  if (marginUsed > 50) return "High Risk";
  if (marginUsed > 20) return "Caution";
  return "Safe";
}

function getGuidance(status: LotMarginResult["finalRiskStatus"], rr: number | null, marginUsed: number, marginRequired: number, accountBalance: number) {
  if (marginRequired > accountBalance && accountBalance > 0) return "Insufficient margin. Reduce lot size or increase leverage/account balance.";
  if (status === "Invalid Trade") return "Stop loss or lot size is invalid. Adjust the setup before trading.";
  if (rr !== null && rr < 2) return "RR is below 1:2. Wait or adjust setup.";
  if (marginUsed > 50) return "Margin usage is too high. Reduce lot size.";
  if (marginUsed > 20) return "Trade may fit risk, but margin usage needs caution.";
  return "Trade fits your risk plan.";
}

function safeNumber(value: number | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function safeOptionalNumber(value: number | undefined) {
  return value === undefined || value === null || value === 0 ? undefined : safeNumber(value);
}
