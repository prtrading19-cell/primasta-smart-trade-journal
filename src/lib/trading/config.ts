import type { ExecutionMode, PositionSizingConfig, TradeValidationConfig } from "./types";

export const TRADING_CONFIG: {
  defaultMode: ExecutionMode;
  historyLimit: number;
  timelineLimit: number;
  validation: TradeValidationConfig;
  positionSizing: PositionSizingConfig;
  supportedBrokerTypes: string[];
} = {
  defaultMode: "paper",
  historyLimit: 1000,
  timelineLimit: 500,
  validation: {
    confidenceThreshold: 60,
    maxRiskLevel: "High",
    maxRiskScore: 80,
    maxPortfolioExposure: 100,
    maxRiskPerTradePercent: 2,
    maxPortfolioRiskPercent: 6,
    maxPositionsPerAsset: 1,
    requireHedgingReview: true,
    blockOnConflicts: true,
    allowLive: false,
  },
  positionSizing: {
    method: "fixed-risk",
    accountBalance: 100000,
    baseRiskPercent: 1,
    maxRiskPercent: 2,
    fixedLots: 1,
    kellyFraction: 0.25,
    atrMultiplier: 2,
    atrDistance: 50,
    portfolioPercent: 5,
    institutionalPercent: 3,
    contractSize: 100,
    minLot: 0.01,
    maxLot: 100,
    maxPortfolioRiskPercent: 6,
    maxRiskPerTradePercent: 2,
  },
  supportedBrokerTypes: [
    "mt5",
    "ctrader",
    "ib",
    "oanda",
    "alpaca",
    "binance",
    "bybit",
    "dxtrade",
    "tradelocker",
  ],
};
