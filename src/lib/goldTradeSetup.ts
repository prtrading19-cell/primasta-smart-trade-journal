import { GOLD_PERSONAL_RULE } from "@/types/goldResearch";
import type {
  GoldSetupConfidence,
  GoldSetupVerdict,
  GoldTradeSetupInputs,
  GoldTradeSetupResearchSummary,
  GoldTradeSetupResult
} from "@/types/goldTradeSetup";

export function calculateGoldSetupRiskReward(inputs: GoldTradeSetupInputs) {
  const entry = toNumber(inputs.possibleEntryPrice);
  const stop = toNumber(inputs.stopLossPrice);
  const target = toNumber(inputs.takeProfit1);
  if (!entry || !stop || !target || entry === stop) return { riskDistance: 0, rewardDistance: 0, ratio: null as number | null, passes: false };

  const likelyBuy = target > entry;
  const riskDistance = Math.abs(entry - stop);
  const rewardDistance = Math.abs(target - entry);
  const ratio = riskDistance ? rewardDistance / riskDistance : null;
  const minimum = toNumber(inputs.minimumRiskReward) || 2;
  const stopIsValid = likelyBuy ? stop < entry : stop > entry;
  return { riskDistance, rewardDistance, ratio, passes: Boolean(ratio && ratio >= minimum && stopIsValid) };
}

export function buildManualGoldTradeSetup(
  research: GoldTradeSetupResearchSummary,
  inputs: GoldTradeSetupInputs,
  strategies: string[]
): GoldTradeSetupResult {
  const rr = calculateGoldSetupRiskReward(inputs);
  const missingCore =
    !inputs.currentGoldPrice ||
    !inputs.buySideLiquidityLevel ||
    !inputs.sellSideLiquidityLevel ||
    !inputs.stopLossPrice ||
    !inputs.takeProfit1 ||
    !inputs.possibleEntryPrice;
  const selectedStrategy = matchGoldStrategy(inputs, strategies);
  const bullish = isBullish(research.overallGoldBias) || /bullish/i.test(inputs.higherTimeframeBias);
  const bearish = isBearish(research.overallGoldBias) || /bearish/i.test(inputs.higherTimeframeBias);
  const structureConfirmed = inputs.marketStructureShiftHappened === "Yes" || inputs.breakOfStructureHappened === "Yes";
  const liquidityConfirmed = inputs.liquiditySweepHappened === "Yes";
  const unclearStructure = inputs.marketStructure === "Ranging" || inputs.higherTimeframeBias === "Neutral";
  const mustWait =
    missingCore ||
    !rr.passes ||
    !selectedStrategy ||
    research.preTradeVerdict === "Avoid Before News" ||
    research.preTradeVerdict === "Wait" ||
    unclearStructure;

  let setupVerdict: GoldSetupVerdict = "Wait";
  if (!mustWait && bullish && inputs.sweepType !== "Buy-side sweep") setupVerdict = structureConfirmed && liquidityConfirmed ? "Buy Setup" : "Pending Confirmation";
  if (!mustWait && bearish && inputs.sweepType !== "Sell-side sweep") setupVerdict = structureConfirmed && liquidityConfirmed ? "Sell Setup" : "Pending Confirmation";

  const confidence = getConfidence(setupVerdict, rr.passes, structureConfirmed, liquidityConfirmed);
  const buySideLiquidity = joinLevelReason(inputs.buySideLiquidityLevel, inputs.buySideLiquidityReason);
  const sellSideLiquidity = joinLevelReason(inputs.sellSideLiquidityLevel, inputs.sellSideLiquidityReason);
  const target = setupVerdict === "Sell Setup" || (setupVerdict === "Pending Confirmation" && bearish) ? sellSideLiquidity : buySideLiquidity;
  const setupDirection = setupVerdict === "Sell Setup" || (setupVerdict === "Pending Confirmation" && bearish) ? "Sell" : setupVerdict === "Wait" ? "Wait" : "Buy";

  return normalizeGoldTradeSetupResult({
    setupVerdict,
    confidence,
    currentGoldPrice: inputs.currentGoldPrice || "Missing",
    overallGoldBias: research.overallGoldBias || "Mixed-Wait",
    selectedStrategy: selectedStrategy || "No matching strategy",
    strategyReason: getStrategyReason(setupVerdict, selectedStrategy, inputs),
    buySideLiquidity,
    sellSideLiquidity,
    liquidityTarget: setupVerdict === "Wait" ? "None until setup confirms" : target,
    entryArea: inputs.possibleEntryPrice ? `${inputs.possibleEntryPrice} (${inputs.entryModel} on ${inputs.entryTimeframe})` : "Entry area missing",
    stopLossArea: inputs.stopLossPrice || "Stop loss missing",
    takeProfitArea: [inputs.takeProfit1, inputs.takeProfit2].filter(Boolean).join(" / ") || "Take profit missing",
    riskRewardRatio: rr.ratio === null ? "Not ready" : `1:${rr.ratio.toFixed(2)}`,
    invalidationLevel: inputs.stopLossPrice || "No invalidation level set",
    confirmationNeeded: getConfirmationNeeded(inputs, setupDirection),
    mainRisk: getMainRisk(research, inputs, rr.passes),
    finalGuidance: getFinalGuidance(setupVerdict, rr.passes)
  });
}

export function normalizeGoldTradeSetupResult(value: unknown): GoldTradeSetupResult {
  const source = isRecord(value) ? value : {};
  return {
    setupVerdict: normalizeVerdict(source.setupVerdict),
    confidence: normalizeConfidence(source.confidence),
    currentGoldPrice: stringValue(source.currentGoldPrice),
    overallGoldBias: stringValue(source.overallGoldBias),
    selectedStrategy: stringValue(source.selectedStrategy),
    strategyReason: stringValue(source.strategyReason),
    buySideLiquidity: stringValue(source.buySideLiquidity),
    sellSideLiquidity: stringValue(source.sellSideLiquidity),
    liquidityTarget: stringValue(source.liquidityTarget),
    entryArea: stringValue(source.entryArea),
    stopLossArea: stringValue(source.stopLossArea),
    takeProfitArea: stringValue(source.takeProfitArea),
    riskRewardRatio: stringValue(source.riskRewardRatio),
    invalidationLevel: stringValue(source.invalidationLevel),
    confirmationNeeded: stringValue(source.confirmationNeeded),
    mainRisk: stringValue(source.mainRisk),
    finalGuidance: stringValue(source.finalGuidance) || `Wait unless research, liquidity, technical structure, risk, and psychology agree. ${GOLD_PERSONAL_RULE}`
  };
}

export function enforceGoldTradeSetupRules(
  result: GoldTradeSetupResult,
  research: GoldTradeSetupResearchSummary,
  inputs: GoldTradeSetupInputs,
  strategies: string[],
  options: { levelsFromMarketData?: boolean; liquidityLevelsConfirmed?: boolean } = {}
): GoldTradeSetupResult {
  const rr = calculateGoldSetupRiskReward(inputs);
  const selectedStrategy = strategies.includes(result.selectedStrategy) ? result.selectedStrategy : matchGoldStrategy(inputs, strategies);
  const buySideLiquidity = joinLevelReason(inputs.buySideLiquidityLevel, inputs.buySideLiquidityReason);
  const sellSideLiquidity = joinLevelReason(inputs.sellSideLiquidityLevel, inputs.sellSideLiquidityReason);
  const missingCurrentPrice = !inputs.currentGoldPrice;
  const missingLiquidity = !inputs.buySideLiquidityLevel || !inputs.sellSideLiquidityLevel;
  const missingSupportResistance = !inputs.keySupport || !inputs.keyResistance;
  const unclearStructure = inputs.marketStructure === "Ranging" || inputs.higherTimeframeBias === "Neutral";
  const missingChartContext = missingCurrentPrice || missingSupportResistance || unclearStructure;
  const mixedResearch = /mixed|wait|neutral/i.test(research.overallGoldBias);
  const rrNotReady = rr.ratio === null;
  const rrFailed = rr.ratio !== null && !rr.passes;
  const unconfirmedMarketLevels = Boolean(options.levelsFromMarketData && !options.liquidityLevelsConfirmed);

  let setupVerdict = result.setupVerdict;
  let confidence = result.confidence;
  let confirmationNeeded = result.confirmationNeeded;
  let finalGuidance = result.finalGuidance;
  let mainRisk = result.mainRisk;

  if (unconfirmedMarketLevels && setupVerdict !== "Wait") {
    setupVerdict = "Pending Confirmation";
    confidence = "Low";
    confirmationNeeded = "Confirm suggested liquidity, support, and resistance on your broker or TradingView chart.";
    mainRisk = "Liquidity levels are suggested from market data and are not chart-confirmed yet.";
    finalGuidance = "Pending confirmation. Tick the liquidity confirmation box only after checking the suggested levels on your chart.";
  }

  if (rrNotReady && setupVerdict !== "Wait") {
    setupVerdict = "Pending Confirmation";
    confidence = "Low";
    confirmationNeeded = "Enter entry, stop loss, and take profit before this can become a trade setup.";
    mainRisk = "Risk-to-reward is Not Ready because entry, stop loss, or take profit is missing.";
    finalGuidance = "Setup idea only. Enter entry, SL, and TP, then confirm at least 1:2 RR before any trade.";
  }

  if (missingChartContext && setupVerdict !== "Wait") {
    setupVerdict = "Pending Confirmation";
    confidence = "Low";
    confirmationNeeded = "Complete current price, support, resistance, and structure confirmation.";
    mainRisk = missingCurrentPrice
      ? "Current Gold/XAUUSD price requires manual chart confirmation."
      : missingSupportResistance
        ? "Support and resistance require manual chart confirmation."
        : "Technical structure requires manual chart confirmation.";
    finalGuidance = `${mainRisk} Treat this as Pending Confirmation until chart context is complete.`;
  }

  if (missingLiquidity || rrFailed || (mixedResearch && unclearStructure)) {
    setupVerdict = "Wait";
    confidence = "Low";
    mainRisk = missingLiquidity
      ? "Liquidity levels require manual chart confirmation."
      : rrFailed
        ? "Risk-to-reward is below 1:2."
        : "Drivers are mixed and technical structure is unclear.";
    confirmationNeeded = missingLiquidity
      ? "Enter and confirm buy-side and sell-side liquidity on your chart."
      : rrFailed
        ? "Improve risk-to-reward to at least 1:2 before considering any trade."
        : "Wait for clearer technical structure and driver alignment.";
    finalGuidance = `${mainRisk} WAIT until research, liquidity, technical structure, strategy, and risk align.`;
  }

  return normalizeGoldTradeSetupResult({
    ...result,
    setupVerdict,
    confidence,
    currentGoldPrice: inputs.currentGoldPrice || result.currentGoldPrice,
    overallGoldBias: research.overallGoldBias || result.overallGoldBias,
    selectedStrategy: selectedStrategy || "No matching strategy",
    buySideLiquidity,
    sellSideLiquidity,
    confirmationNeeded,
    riskRewardRatio: rr.ratio === null ? "Not Ready" : `1:${rr.ratio.toFixed(2)}`,
    mainRisk,
    finalGuidance
  });
}

export function matchGoldStrategy(inputs: GoldTradeSetupInputs, strategies: string[]) {
  const text = `${inputs.entryModel} ${inputs.sweepType} ${inputs.marketStructureShiftHappened} ${inputs.breakOfStructureHappened}`.toLowerCase();
  const allowed = strategies.filter((strategy) => !/no trade/i.test(strategy));
  if (/sweep|mss|liquidity grab/.test(text)) return findStrategy(allowed, ["sweep", "mss", "liquidity"]) ?? allowed[0] ?? "";
  if (/bos|breakout/.test(text)) return findStrategy(allowed, ["break", "retest"]) ?? allowed[0] ?? "";
  if (/fvg/.test(text)) return findStrategy(allowed, ["fvg"]) ?? allowed[0] ?? "";
  if (/order block|ob/.test(text)) return findStrategy(allowed, ["order block", "ob"]) ?? allowed[0] ?? "";
  return allowed[0] ?? "";
}

function findStrategy(strategies: string[], terms: string[]) {
  return strategies.find((strategy) => terms.some((term) => strategy.toLowerCase().includes(term)));
}

function getConfidence(verdict: GoldSetupVerdict, rrPasses: boolean, structureConfirmed: boolean, liquidityConfirmed: boolean): GoldSetupConfidence {
  if (verdict === "Wait" || !rrPasses) return "Low";
  if (structureConfirmed && liquidityConfirmed) return "High";
  return "Medium";
}

function getStrategyReason(verdict: GoldSetupVerdict, strategy: string, inputs: GoldTradeSetupInputs) {
  if (verdict === "Wait") return "Conditions are not aligned enough for a trade setup.";
  return `${strategy} matches ${inputs.entryModel} with ${inputs.sweepType}. Technical confirmation is still required before entry.`;
}

function getConfirmationNeeded(inputs: GoldTradeSetupInputs, direction: string) {
  const items = [];
  if (inputs.liquiditySweepHappened !== "Yes") items.push("liquidity sweep");
  if (inputs.marketStructureShiftHappened !== "Yes") items.push("market structure shift");
  if (inputs.breakOfStructureHappened !== "Yes") items.push("break of structure or retest");
  if (!items.length) return `${direction} confirmation present. Still wait for clean entry execution.`;
  return `Wait for ${items.join(", ")} before considering ${direction === "Wait" ? "any" : direction.toLowerCase()} entry.`;
}

function getMainRisk(research: GoldTradeSetupResearchSummary, inputs: GoldTradeSetupInputs, rrPasses: boolean) {
  if (!rrPasses) return "Risk-to-reward is below the trading plan minimum or risk inputs are incomplete.";
  if (!inputs.buySideLiquidityLevel || !inputs.sellSideLiquidityLevel) return "Liquidity levels require manual chart confirmation.";
  return research.mainRiskToday || "Main risk is unclear. Confirm news timing and chart structure.";
}

function getFinalGuidance(verdict: GoldSetupVerdict, rrPasses: boolean) {
  if (!rrPasses) return "WAIT. Do not trade if risk-to-reward is below 1:2 or risk levels are incomplete.";
  if (verdict === "Wait") return `WAIT. This is not a guaranteed signal. ${GOLD_PERSONAL_RULE}`;
  if (verdict === "Pending Confirmation") return "Pending confirmation. Do not enter immediately. Wait for liquidity sweep, MSS/BOS, and retest confirmation.";
  return "This is not a guaranteed signal. Only enter after technical confirmation, confirmed liquidity, no major news conflict, and at least 1:2 RR.";
}

function joinLevelReason(level: string, reason: string) {
  return [level, reason].filter(Boolean).join(" - ") || "Liquidity levels require manual chart confirmation.";
}

function isBullish(value: string) {
  return /bullish/i.test(value) && !/bearish/i.test(value);
}

function isBearish(value: string) {
  return /bearish/i.test(value);
}

function normalizeVerdict(value: unknown): GoldSetupVerdict {
  if (value === "Buy Setup" || value === "Sell Setup" || value === "Wait" || value === "Pending Confirmation") return value;
  return "Wait";
}

function normalizeConfidence(value: unknown): GoldSetupConfidence {
  if (value === "Low" || value === "Medium" || value === "High") return value;
  return "Low";
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value).trim() : "";
}

function toNumber(value: string) {
  return Number(String(value).replace("1:", "") || 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
