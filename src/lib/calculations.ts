import { DEFAULT_CHECKLIST, NO_TRADE_STRATEGY } from "@/types/trade";
import type { Checklist, Trade, TradeResult } from "@/types/trade";

export interface DashboardMetrics {
  openTradesCount: number;
  closedTradesCount: number;
  totalTrades: number;
  wins: number;
  losses: number;
  breakEvens: number;
  winRate: number;
  totalProfitLoss: number;
  totalR: number;
  averageR: number;
  profitFactor: number | null;
  currentDrawdown: number;
  bestStrategy: string;
  bestPair: string;
  mostCommonMistake: string;
  ruleFollowingPercentage: number;
}

export interface SMCPerformanceRow {
  name: string;
  trades: number;
  wins: number;
  winRate: number;
  averageRMultiple: number;
  averagePlannedRiskReward: number;
  profitLoss: number;
}

export function getClosedTrades(trades: Trade[]) {
  return trades.filter((trade) => trade.status === "Closed" && !isNoTradeObservation(trade));
}

export function isNoTradeObservation(trade: Pick<Trade, "strategy" | "setupGrade">) {
  return trade.strategy === NO_TRADE_STRATEGY || trade.setupGrade === "No Trade";
}

export function isRuleFollowed(checklist: Checklist) {
  return Object.keys(DEFAULT_CHECKLIST).every((key) => Boolean(checklist[key as keyof Checklist]));
}

export function getAPlusScore(trade: Pick<Trade, "aPlusScore" | "checklist">) {
  if (typeof trade.aPlusScore === "number") return trade.aPlusScore;
  return Object.keys(DEFAULT_CHECKLIST).filter((key) => Boolean(trade.checklist[key as keyof Checklist])).length;
}

export function getPlannedRiskReward(trade: Pick<Trade, "tradeType" | "entryPrice" | "stopLoss" | "takeProfit">) {
  const entry = Number(trade.entryPrice);
  const stop = Number(trade.stopLoss);
  const target = Number(trade.takeProfit);
  if (!entry || !stop || !target) return null;

  const risk = trade.tradeType === "Buy" ? entry - stop : stop - entry;
  const reward = trade.tradeType === "Buy" ? target - entry : entry - target;
  if (risk <= 0 || reward <= 0) return null;

  return reward / risk;
}

export function calculateMetrics(trades: Trade[]): DashboardMetrics {
  const closedTrades = getClosedTrades(trades);
  const tradeEntries = trades.filter((trade) => !isNoTradeObservation(trade));
  const openTrades = tradeEntries.filter((trade) => trade.status === "Open");
  const wins = closedTrades.filter((trade) => trade.finalResult === "Win").length;
  const losses = closedTrades.filter((trade) => trade.finalResult === "Loss").length;
  const breakEvens = closedTrades.filter((trade) => trade.finalResult === "Break-even").length;
  const grossProfit = closedTrades.reduce((sum, trade) => sum + Math.max(Number(trade.profitLoss ?? 0), 0), 0);
  const grossLoss = Math.abs(closedTrades.reduce((sum, trade) => sum + Math.min(Number(trade.profitLoss ?? 0), 0), 0));
  const totalProfitLoss = closedTrades.reduce((sum, trade) => sum + Number(trade.profitLoss ?? 0), 0);
  const totalR = closedTrades.reduce((sum, trade) => sum + Number(trade.rMultiple ?? 0), 0);
  const rulesFollowed = closedTrades.filter((trade) => isRuleFollowed(trade.checklist)).length;

  return {
    openTradesCount: openTrades.length,
    closedTradesCount: closedTrades.length,
    totalTrades: tradeEntries.length,
    wins,
    losses,
    breakEvens,
    winRate: closedTrades.length ? (wins / closedTrades.length) * 100 : 0,
    totalProfitLoss,
    totalR,
    averageR: closedTrades.length ? totalR / closedTrades.length : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
    currentDrawdown: calculateCurrentDrawdown(closedTrades),
    bestStrategy: bestByProfit(closedTrades, "strategy"),
    bestPair: bestByProfit(closedTrades, "pair"),
    mostCommonMistake: mostCommon(closedTrades.map((trade) => trade.mistakeMade).filter(Boolean) as string[]) || "None logged",
    ruleFollowingPercentage: closedTrades.length ? (rulesFollowed / closedTrades.length) * 100 : 0
  };
}

export function calculateCurrentDrawdown(closedTrades: Trade[]) {
  const sorted = [...closedTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let equity = 0;
  let peak = 0;

  sorted.forEach((trade) => {
    equity += Number(trade.profitLoss ?? 0);
    peak = Math.max(peak, equity);
  });

  return Math.max(peak - equity, 0);
}

export function getEquityCurve(trades: Trade[]) {
  let runningTotal = 0;

  return getClosedTrades(trades)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((trade) => {
      runningTotal += Number(trade.profitLoss ?? 0);
      return {
        date: trade.date,
        equity: Number(runningTotal.toFixed(2)),
        result: trade.finalResult,
        profitLoss: Number(trade.profitLoss ?? 0)
      };
    });
}

export function getWinLossChart(trades: Trade[]) {
  const metrics = calculateMetrics(trades);
  return [
    { name: "Wins", value: metrics.wins, fill: "#16C784" },
    { name: "Losses", value: metrics.losses, fill: "#EA3943" },
    { name: "Break-even", value: metrics.breakEvens, fill: "#D4AF37" }
  ];
}

export function getStrategyPerformance(trades: Trade[]) {
  const grouped = groupClosedBy(trades, "strategy");
  return Object.entries(grouped)
    .map(([strategy, items]) => ({
      strategy,
      profitLoss: sum(items, "profitLoss"),
      totalR: sum(items, "rMultiple"),
      trades: items.length
    }))
    .sort((a, b) => b.profitLoss - a.profitLoss);
}

export function getMonthlyPerformance(trades: Trade[]) {
  const grouped = getClosedTrades(trades).reduce<Record<string, Trade[]>>((acc, trade) => {
    const month = trade.date.slice(0, 7);
    acc[month] = acc[month] ? [...acc[month], trade] : [trade];
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([month, items]) => ({
      month,
      profitLoss: sum(items, "profitLoss"),
      totalR: sum(items, "rMultiple"),
      trades: items.length
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function buildSummary(trades: Trade[]) {
  const closedTrades = getClosedTrades(trades);
  const byPair = rankByProfit(closedTrades, "pair");
  const byStrategy = rankByProfit(closedTrades, "strategy");
  const bySession = rankByProfit(closedTrades, "session");
  const bySetupGrade = rankByProfit(closedTrades, "setupGrade");
  const metrics = calculateMetrics(trades);
  const followed = closedTrades.filter((trade) => isRuleFollowed(trade.checklist));
  const broken = closedTrades.filter((trade) => !isRuleFollowed(trade.checklist));
  const tradeEntries = trades.filter((trade) => !isNoTradeObservation(trade));
  const highAPlusScore = tradeEntries.filter((trade) => getAPlusScore(trade) >= 13).length;
  const lowAPlusScore = tradeEntries.filter((trade) => getAPlusScore(trade) < 9).length;

  return {
    bestPair: byPair[0]?.name ?? "No closed trades yet",
    worstPair: byPair.at(-1)?.name ?? "No closed trades yet",
    bestStrategy: byStrategy[0]?.name ?? "No closed trades yet",
    worstStrategy: byStrategy.at(-1)?.name ?? "No closed trades yet",
    bestSmcSetup: byStrategy[0]?.name ?? "No closed trades yet",
    worstSmcSetup: byStrategy.at(-1)?.name ?? "No closed trades yet",
    bestSession: bySession[0]?.name ?? "No closed trades yet",
    worstSession: bySession.at(-1)?.name ?? "No closed trades yet",
    bestSetupGrade: bySetupGrade[0]?.name ?? "No closed trades yet",
    worstSetupGrade: bySetupGrade.at(-1)?.name ?? "No closed trades yet",
    mostCommonMistake: metrics.mostCommonMistake,
    totalRuleViolations: broken.length,
    winRateRulesFollowed: getWinRate(followed),
    winRateRulesBroken: getWinRate(broken),
    strategyStats: getSMCPerformanceBy(trades, "strategy"),
    setupGradeStats: getSMCPerformanceBy(trades, "setupGrade"),
    aPlusScore13OrHigher: highAPlusScore,
    aPlusScoreBelow9: lowAPlusScore,
    monthly: getMonthlyPerformance(trades),
    insights: [
      `Your best strategy is ${metrics.bestStrategy}.`,
      `Your best performing SMC setup is ${byStrategy[0]?.name ?? "not established yet"}.`,
      `You have ${highAPlusScore} trades with an A+ score of 13 or higher and ${lowAPlusScore} below 9.`,
      `Most losses happen during ${worstLossSession(closedTrades)} session.`,
      `Your most common mistake is ${metrics.mostCommonMistake}.`,
      ruleProfitComparison(followed, broken),
      `Your current win rate is ${metrics.winRate.toFixed(1)}%.`,
      `Your total R-multiple is ${metrics.totalR.toFixed(2)}.`,
      metrics.ruleFollowingPercentage < 90
        ? "You should not increase lot size yet if your rule-following percentage is below 90%."
        : "Your rule-following percentage is above 90%; keep position sizing controlled and consistent.",
      `You currently have ${metrics.openTradesCount} open trades that are not yet included in performance calculations.`
    ]
  };
}

function sum<T extends "profitLoss" | "rMultiple">(items: Trade[], field: T) {
  return Number(items.reduce((total, item) => total + Number(item[field] ?? 0), 0).toFixed(2));
}

function getWinRate(trades: Trade[]) {
  return trades.length ? (trades.filter((trade) => trade.finalResult === "Win").length / trades.length) * 100 : 0;
}

export function getSMCPerformanceBy(trades: Trade[], key: keyof Pick<Trade, "strategy" | "setupGrade">): SMCPerformanceRow[] {
  return Object.entries(groupClosedBy(trades, key))
    .map(([name, items]) => {
      const plannedRatios = items.map(getPlannedRiskReward).filter((value): value is number => value !== null);
      return {
        name,
        trades: items.length,
        wins: items.filter((trade) => trade.finalResult === "Win").length,
        winRate: getWinRate(items),
        averageRMultiple: items.length ? sum(items, "rMultiple") / items.length : 0,
        averagePlannedRiskReward: plannedRatios.length ? plannedRatios.reduce((total, value) => total + value, 0) / plannedRatios.length : 0,
        profitLoss: sum(items, "profitLoss")
      };
    })
    .sort((a, b) => b.profitLoss - a.profitLoss);
}

function groupClosedBy(trades: Trade[], key: keyof Pick<Trade, "strategy" | "pair" | "session" | "setupGrade">) {
  return getClosedTrades(trades).reduce<Record<string, Trade[]>>((acc, trade) => {
    const value = String(trade[key] || "Unknown");
    acc[value] = acc[value] ? [...acc[value], trade] : [trade];
    return acc;
  }, {});
}

function rankByProfit(trades: Trade[], key: keyof Pick<Trade, "strategy" | "pair" | "session" | "setupGrade">) {
  return Object.entries(groupClosedBy(trades, key))
    .map(([name, items]) => ({ name, profitLoss: sum(items, "profitLoss"), trades: items.length }))
    .sort((a, b) => b.profitLoss - a.profitLoss);
}

function bestByProfit(trades: Trade[], key: keyof Pick<Trade, "strategy" | "pair">) {
  return rankByProfit(trades, key)[0]?.name ?? "No closed trades yet";
}

function mostCommon(values: string[]) {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    const clean = value.trim();
    if (!clean || clean.toLowerCase() === "none") return acc;
    acc[clean] = (acc[clean] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
}

function worstLossSession(trades: Trade[]) {
  const losses = trades.filter((trade) => trade.finalResult === "Loss");
  const ranked = Object.entries(groupBy(losses, "session"))
    .map(([session, items]) => ({ session, losses: items.length }))
    .sort((a, b) => b.losses - a.losses);

  return ranked[0]?.session ?? "no specific";
}

function groupBy(trades: Trade[], key: keyof Pick<Trade, "session">) {
  return trades.reduce<Record<string, Trade[]>>((acc, trade) => {
    const value = String(trade[key] || "Unknown");
    acc[value] = acc[value] ? [...acc[value], trade] : [trade];
    return acc;
  }, {});
}

function ruleProfitComparison(followed: Trade[], broken: Trade[]) {
  const followedProfit = sum(followed, "profitLoss");
  const brokenProfit = sum(broken, "profitLoss");

  if (!followed.length && !broken.length) {
    return "Close trades to compare checklist-following performance.";
  }

  return followedProfit >= brokenProfit
    ? "You are more profitable when you follow your checklist."
    : "Your broken-rule trades are currently outperforming, but review sample size before changing rules.";
}

export function resultTone(result?: TradeResult) {
  if (result === "Win") return "text-profit";
  if (result === "Loss") return "text-loss";
  return "text-warning";
}
