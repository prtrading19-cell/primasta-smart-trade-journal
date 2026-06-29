import {
  DEFAULT_GOLD_RESEARCH_CHECKLIST,
  type GoldAnalysisInput,
  type GoldBias,
  type GoldBiasSummary,
  type GoldChecklistEffect,
  type GoldChecklistResult,
  type GoldDriverAnalysis,
  type GoldDriverName,
  type GoldImpactLevel,
  type GoldPreTradeVerdict,
  type GoldResearchChecklist,
  type GoldResearchReport,
  type GoldTimeSensitivity
} from "@/types/goldResearch";

export function analyzeGoldDriver(input: GoldAnalysisInput): GoldDriverAnalysis {
  const text = normalize(`${input.headline} ${input.summary} ${input.currentValue} ${input.chartObservation} ${input.notes}`);
  const dxyStrong = hasAny(text, ["strong dollar", "dxy rising", "dollar rising", "dxy breakout", "dxy strong", "usd strong", "rising dollar"]);
  const dxyWeak = hasAny(text, ["weaker dollar", "weak dollar", "dxy falling", "dollar falling", "rejecting resistance", "dxy rejection"]);

  let goldBias: GoldBias = "Neutral";
  let impactLevel: GoldImpactLevel = "Medium";
  let timeSensitivity: GoldTimeSensitivity = "Intraday";
  let confidenceScore = 55;
  let explanation = "The driver is not clearly one-sided from the current notes.";
  let goldMeaning = "Gold may need technical confirmation and liquidity alignment before any trade is justified.";

  const driver = input.driverName;

  if (driver === "DXY / US Dollar") {
    if (dxyWeak) {
      ({ goldBias, explanation, goldMeaning, confidenceScore } = bullish("Dollar weakness or DXY rejection reduces pressure on Gold."));
    } else if (dxyStrong) {
      ({ goldBias, explanation, goldMeaning, confidenceScore } = bearish("A strong Dollar or DXY breakout can pressure Gold lower."));
    }
  } else if (driver === "US Yields" || driver === "Real Yields") {
    if (hasAny(text, ["falling yields", "yields falling", "lower yields", "yield rejection", "real yields falling", "real yields lower"])) {
      ({ goldBias, explanation, goldMeaning, confidenceScore } = bullish("Falling yields reduce the opportunity cost of holding Gold."));
    } else if (hasAny(text, ["rising yields", "yields rising", "higher yields", "yield breakout", "real yields rising", "real yields higher"])) {
      ({ goldBias, explanation, goldMeaning, confidenceScore } = bearish("Rising yields can pull capital away from Gold and support USD pressure."));
    } else if (hasAny(text, ["mixed yields", "yields mixed", "sideways yields"])) {
      goldBias = "Mixed / Wait";
      explanation = "Yield signals are mixed or sideways.";
      goldMeaning = "Gold bias is not clean enough without strong technical confirmation.";
      confidenceScore = 58;
    }
  } else if (driver === "Fed Tone / FOMC") {
    if (hasAny(text, ["dovish", "rate cuts", "cut expectations", "pause", "weak economy", "slowing economy"])) {
      ({ goldBias, explanation, goldMeaning, confidenceScore } = bullish("Dovish Fed language or rate-cut expectations can support Gold."));
    } else if (hasAny(text, ["hawkish", "higher for longer", "rate hikes", "restrictive", "sticky inflation"])) {
      ({ goldBias, explanation, goldMeaning, confidenceScore } = bearish("Hawkish Fed tone can lift USD or yields and pressure Gold."));
    }
    timeSensitivity = hasAny(text, ["fomc", "powell", "fed decision", "minutes"]) ? "Immediate" : "This Week";
  } else if (driver === "CPI / PCE") {
    if (hasAny(text, ["soft inflation", "cooling inflation", "lower inflation", "below forecast", "disinflation"])) {
      ({ goldBias, explanation, goldMeaning, confidenceScore } = bullish("Softer inflation can support rate-cut expectations and Gold."));
    } else if (hasAny(text, ["hot inflation", "higher inflation", "above forecast", "sticky inflation", "inflation surprise"])) {
      ({ goldBias, explanation, goldMeaning, confidenceScore } = bearish("Hot inflation can strengthen USD/yields and pressure Gold."));
    } else if (hasAny(text, ["mixed inflation", "mixed cpi", "mixed pce"])) {
      goldBias = "Mixed / Wait";
      explanation = "Inflation data is mixed.";
      goldMeaning = "Wait for the Dollar/yields reaction and technical confirmation.";
      confidenceScore = 60;
    }
    timeSensitivity = "Immediate";
    impactLevel = "High";
  } else if (driver === "NFP / Jobs") {
    if (hasAny(text, ["weak jobs", "soft jobs", "missed forecast", "unemployment rising", "jobless claims rising", "slower hiring"])) {
      ({ goldBias, explanation, goldMeaning, confidenceScore } = bullish("Weak jobs data can support Gold if it increases rate-cut expectations or risk fear."));
    } else if (hasAny(text, ["strong jobs", "beats forecast", "low unemployment", "hot labor market", "strong payrolls"])) {
      ({ goldBias, explanation, goldMeaning, confidenceScore } = bearish("Strong jobs data can support USD/yields and pressure Gold."));
    } else if (hasAny(text, ["mixed jobs", "mixed labor", "mixed payrolls"])) {
      goldBias = "Mixed / Wait";
      explanation = "Jobs data is mixed.";
      goldMeaning = "Wait for market reaction before trusting a Gold bias.";
      confidenceScore = 58;
    }
    timeSensitivity = "Immediate";
    impactLevel = "High";
  } else if (driver === "Geopolitics") {
    if (hasAny(text, ["war", "risk", "fear", "uncertainty", "tension", "conflict", "safe haven", "escalation"])) {
      if (dxyStrong) {
        goldBias = "Mixed / Wait";
        explanation = "Geopolitical fear supports safe-haven Gold, but a strong Dollar can cap or reverse the move.";
        goldMeaning = "Wait for price structure to confirm whether safe-haven demand is stronger than USD pressure.";
        confidenceScore = 68;
      } else {
        ({ goldBias, explanation, goldMeaning, confidenceScore } = bullish("Geopolitical risk can create safe-haven demand for Gold."));
        confidenceScore = 72;
      }
      impactLevel = "High";
      timeSensitivity = "Immediate";
    }
  } else if (driver === "ETF / Central Bank Demand") {
    if (hasAny(text, ["etf inflows", "central bank buying", "gold demand", "reserve buying", "strong demand", "accumulation"])) {
      ({ goldBias, explanation, goldMeaning, confidenceScore } = bullish("ETF inflows or central-bank demand support a longer-term Gold bid."));
      timeSensitivity = "Longer-term";
    } else if (hasAny(text, ["etf outflows", "weak demand", "central bank selling", "redemptions", "outflow"])) {
      ({ goldBias, explanation, goldMeaning, confidenceScore } = bearish("ETF outflows or weak demand can reduce longer-term support for Gold."));
      timeSensitivity = "Longer-term";
    }
  } else if (driver === "Custom News") {
    if (hasAny(text, ["bullish gold", "supports gold", "safe haven", "weaker dollar", "falling yields", "rate cuts"])) {
      ({ goldBias, explanation, goldMeaning, confidenceScore } = bullish("The custom notes include Gold-supportive language."));
    } else if (hasAny(text, ["bearish gold", "pressures gold", "strong dollar", "rising yields", "hawkish"])) {
      ({ goldBias, explanation, goldMeaning, confidenceScore } = bearish("The custom notes include Gold-negative language."));
    }
  }

  if (hasAny(text, ["mixed", "unclear", "sideways", "choppy", "conflicting"])) {
    goldBias = goldBias === "Neutral" ? "Neutral" : "Mixed / Wait";
    confidenceScore = Math.min(confidenceScore, 64);
  }

  if (hasAny(text, ["breaking news", "fomc", "cpi", "nfp", "war", "spike", "high impact"])) {
    impactLevel = "High";
    timeSensitivity = "Immediate";
  } else if (hasAny(text, ["this week", "weekly", "trend", "central bank", "etf"])) {
    timeSensitivity = timeSensitivity === "Longer-term" ? "Longer-term" : "This Week";
  }

  return {
    driverName: driver,
    goldBias,
    impactLevel,
    timeSensitivity,
    confidenceScore: clamp(confidenceScore, 0, 100),
    explanation,
    goldMeaning,
    checklistEffect: getChecklistEffect(goldBias),
    tradingCaution: getTradingCaution(goldBias, impactLevel, timeSensitivity),
    finalGuidance: getFinalGuidance(goldBias)
  };
}

export function buildGoldBiasSummary(reports: GoldResearchReport[]): GoldBiasSummary {
  const latestByDriver = Object.values(
    reports.reduce<Record<string, GoldResearchReport>>((acc, report) => {
      const current = acc[report.driverName];
      if (!current || new Date(report.createdAt).getTime() > new Date(current.createdAt).getTime()) {
        acc[report.driverName] = report;
      }
      return acc;
    }, {})
  );

  const bullish = latestByDriver.filter((report) => report.goldBias === "Bullish Gold");
  const bearish = latestByDriver.filter((report) => report.goldBias === "Bearish Gold");
  const mixed = latestByDriver.filter((report) => report.goldBias === "Mixed / Wait");
  const highRisk = latestByDriver.find((report) => report.impactLevel === "High" && report.timeSensitivity === "Immediate");
  const strongestBullish = [...bullish].sort((a, b) => b.confidenceScore - a.confidenceScore)[0];
  const strongestBearish = [...bearish].sort((a, b) => b.confidenceScore - a.confidenceScore)[0];

  let overallGoldBias: GoldBiasSummary["overallGoldBias"] = "Neutral";
  let preTradeVerdict: GoldPreTradeVerdict = "Trade only if setup confirms";

  if (highRisk) {
    overallGoldBias = "Wait";
    preTradeVerdict = "Avoid trading before news";
  } else if (mixed.length >= bullish.length + bearish.length && latestByDriver.length) {
    overallGoldBias = "Wait";
    preTradeVerdict = "Wait";
  } else if (bullish.length > bearish.length) {
    overallGoldBias = "Bullish";
  } else if (bearish.length > bullish.length) {
    overallGoldBias = "Bearish";
  } else if (latestByDriver.length) {
    overallGoldBias = "Neutral";
    preTradeVerdict = "Wait";
  }

  return {
    overallGoldBias,
    bullishDriversCount: bullish.length,
    bearishDriversCount: bearish.length,
    mixedDriversCount: mixed.length,
    strongestBullishDriver: strongestBullish?.driverName ?? "None yet",
    strongestBearishDriver: strongestBearish?.driverName ?? "None yet",
    mainRisk: highRisk ? `${highRisk.driverName}: ${highRisk.tradingCaution}` : mixed[0]?.driverName ? `${mixed[0].driverName} is mixed` : "No major research risk logged yet",
    bestSessionToWaitFor: highRisk ? "Wait until after the news reaction settles" : "London-New York Overlap",
    preTradeVerdict
  };
}

export function getGoldChecklistResult(checklist: Partial<GoldResearchChecklist>) {
  const fullChecklist = { ...DEFAULT_GOLD_RESEARCH_CHECKLIST, ...checklist };
  const score = Object.values(fullChecklist).filter(Boolean).length;
  let result: GoldChecklistResult = "Not aligned";

  if (score >= 8) result = "Aligned";
  else if (score >= 5) result = "Mixed";
  if (!fullChecklist.willWaitIfMixed || !fullChecklist.notRevengeTrading) result = score >= 5 ? "Wait" : "Not aligned";

  return { score, total: Object.keys(DEFAULT_GOLD_RESEARCH_CHECKLIST).length, result };
}

function bullish(reason: string) {
  return {
    goldBias: "Bullish Gold" as GoldBias,
    explanation: reason,
    goldMeaning: "This supports Gold only if liquidity, structure, risk, and psychology also confirm.",
    confidenceScore: 72
  };
}

function bearish(reason: string) {
  return {
    goldBias: "Bearish Gold" as GoldBias,
    explanation: reason,
    goldMeaning: "This warns against long Gold unless technical structure clearly overrides the driver.",
    confidenceScore: 72
  };
}

function getChecklistEffect(goldBias: GoldBias): GoldChecklistEffect {
  if (goldBias === "Bullish Gold" || goldBias === "Bearish Gold") return "Supports trade";
  if (goldBias === "Mixed / Wait") return "Wait";
  return "Warns against trade";
}

function getTradingCaution(goldBias: GoldBias, impactLevel: GoldImpactLevel, timeSensitivity: GoldTimeSensitivity) {
  if (timeSensitivity === "Immediate" && impactLevel === "High") return "Avoid entries just before or during the news spike.";
  if (goldBias === "Mixed / Wait") return "Do not force a trade while drivers conflict.";
  if (goldBias === "Neutral") return "Treat this as background context, not a trade trigger.";
  return "Trade only after clean liquidity sweep, structure confirmation, and controlled risk.";
}

function getFinalGuidance(goldBias: GoldBias) {
  if (goldBias === "Mixed / Wait" || goldBias === "Neutral") return "Wait";
  return "Trade allowed only if technical setup confirms";
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
