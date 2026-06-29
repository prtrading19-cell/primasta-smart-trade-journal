import {
  DEFAULT_GOLD_RESEARCH_CHECKLIST,
  GOLD_PERSONAL_RULE,
  type GoldAnalysisInput,
  type GoldBias,
  type GoldBiasSummary,
  type GoldChecklistEffect,
  type GoldChecklistResult,
  type GoldDriverAnalysis,
  type GoldImpactLevel,
  type GoldPreTradeVerdict,
  type GoldResearchChecklist,
  type GoldResearchReport,
  type GoldTimeSensitivity
} from "@/types/goldResearch";

interface ScoreState {
  score: number;
  bullishSignals: string[];
  bearishSignals: string[];
  neutralSignals: string[];
  forceMixed: boolean;
  highImpact: boolean;
}

interface DriverMessages {
  bullishExplanation: string;
  bearishExplanation: string;
  neutralExplanation: string;
  mixedExplanation: string;
  bullishMeaning: string;
  bearishMeaning: string;
  neutralMeaning: string;
  mixedMeaning: string;
  timeSensitivity: GoldTimeSensitivity;
  caution?: string;
  finalGuidance?: string;
}

export function analyzeGoldDriver(input: GoldAnalysisInput): GoldDriverAnalysis {
  switch (input.driverName) {
    case "DXY / US Dollar":
      return analyzeDxyDriver(input);
    case "US Yields":
      return analyzeUsYieldsDriver(input);
    case "Real Yields":
      return analyzeRealYieldsDriver(input);
    case "Fed Tone / FOMC":
      return analyzeFedToneDriver(input);
    case "CPI / PCE":
      return analyzeCpiPceDriver(input);
    case "NFP / Jobs":
      return analyzeJobsDriver(input);
    case "Geopolitics":
      return analyzeGeopoliticsDriver(input);
    case "ETF / Central Bank Demand":
      return analyzeEtfCentralBankDriver(input);
    case "Custom News":
      return analyzeCustomNewsDriver(input);
  }
}

export function analyzeDxyDriver(input: GoldAnalysisInput): GoldDriverAnalysis {
  const state = createScoreState(input);
  const direction = lowerField(input, "dxyDirection");
  const text = driverText(input);

  if (direction === "falling") addSignal(state, 2, "DXY is falling");
  if (direction === "rejecting resistance") addSignal(state, 2, "DXY is rejecting resistance");
  if (direction === "breaking support") addSignal(state, 2, "DXY is breaking support");
  if (direction === "rising") addSignal(state, -2, "DXY is rising");
  if (direction === "breaking resistance") addSignal(state, -2, "DXY is breaking resistance");
  if (direction === "sideways") addSignal(state, 0, "DXY is sideways");

  if (hasAny(text, ["weaker dollar", "weak dollar", "dollar falls", "dollar falling", "dxy falling", "dollar slips"])) {
    addSignal(state, 2, "news points to a weaker Dollar");
  }
  if (hasAny(text, ["rate cuts", "cuts expected", "rate cut", "dovish fed", "policy easing"])) {
    addSignal(state, 1, "text mentions cuts or dovish policy");
  }
  if (hasAny(text, ["strong dollar", "dollar strength", "hawkish fed", "higher yields", "dxy breakout", "usd strong"])) {
    addSignal(state, -2, "text mentions Dollar strength, hawkish Fed, or higher yields");
  }

  return finalizeDriver(input, state, {
    timeSensitivity: "Intraday",
    bullishExplanation: "DXY is giving a Gold-supportive clue because Dollar pressure is weakening.",
    bearishExplanation: "DXY is applying bearish pressure on Gold because Dollar strength can cap upside or push Gold lower.",
    neutralExplanation: "DXY is not giving a clean directional read yet.",
    mixedExplanation: "DXY inputs conflict, so the Dollar driver is not clean enough to trust by itself.",
    bullishMeaning: "If DXY is falling, rejecting resistance, or breaking support, Gold has more room to push higher if structure confirms.",
    bearishMeaning: "If DXY is rising or breaking resistance, Gold longs need extra caution because USD strength can pressure price.",
    neutralMeaning: "Wait for DXY to break, reject, or align with Gold price structure before using this driver.",
    mixedMeaning: "Do not force a Gold trade while DXY signals and news are pulling in opposite directions."
  });
}

export function analyzeUsYieldsDriver(input: GoldAnalysisInput): GoldDriverAnalysis {
  const state = createScoreState(input);
  const tenYear = lowerField(input, "tenYearYieldDirection");
  const twoYear = lowerField(input, "twoYearYieldDirection");
  const text = driverText(input);

  scoreYieldDirection(state, tenYear, "10Y yield");
  scoreYieldDirection(state, twoYear, "2Y yield");

  if ((isYieldBullish(tenYear) && isYieldBearish(twoYear)) || (isYieldBearish(tenYear) && isYieldBullish(twoYear))) {
    state.forceMixed = true;
    addSignal(state, 0, "10Y and 2Y yields are not aligned");
  }

  if (hasAny(text, ["yields pull back", "bond yields fall", "yields fall", "yields falling", "rate cuts priced in", "treasury yields drop"])) {
    addSignal(state, 2, "text says yields are pulling back or cuts are being priced in");
  }
  if (hasAny(text, ["yields rise", "treasury yields jump", "bond yields rise", "higher for longer", "yields breaking higher", "yields surge"])) {
    addSignal(state, -2, "text says yields are rising or policy is higher for longer");
  }

  return finalizeDriver(input, state, {
    timeSensitivity: "Intraday",
    bullishExplanation: "US yields are easing, which reduces pressure on non-yielding Gold.",
    bearishExplanation: "US yields are rising, which increases pressure on non-yielding Gold and can support USD strength.",
    neutralExplanation: "US yields are not giving a clean Gold driver yet.",
    mixedExplanation: "The 10Y and 2Y yield signals are mixed, so Gold needs DXY and price confirmation first.",
    bullishMeaning: "Falling or rejected yields are a bullish Gold clue, especially if DXY also weakens.",
    bearishMeaning: "Rising or breaking-higher yields are a bearish Gold clue, especially if DXY also strengthens.",
    neutralMeaning: "Wait for yields to choose direction before treating this as a trade filter.",
    mixedMeaning: "Yield conflict makes the Gold bias unreliable until the bond market reaction becomes clear."
  });
}

export function analyzeRealYieldsDriver(input: GoldAnalysisInput): GoldDriverAnalysis {
  const state = createScoreState(input);
  const realYieldDirection = lowerField(input, "realYieldsDirection");
  const inflationExpectationDirection = lowerField(input, "inflationExpectationDirection");
  const text = driverText(input);

  scoreYieldDirection(state, realYieldDirection, "real yields");

  if (inflationExpectationDirection === "rising" && hasAny(text, ["nominal yields fall", "nominal yields falling", "yields fall", "yields falling"])) {
    addSignal(state, 1, "inflation expectations rise while nominal yields fall");
  }
  if (inflationExpectationDirection === "falling" && isYieldBearish(realYieldDirection)) {
    addSignal(state, -1, "falling inflation expectations with rising real yields");
  }
  if (inflationExpectationDirection === "stable") addSignal(state, 0, "inflation expectations are stable");
  if (hasAny(text, ["real yields rise", "real yields rising", "real yields jump", "real yield breakout"])) {
    addSignal(state, -2, "text says real yields are rising strongly");
  }
  if (hasAny(text, ["real yields fall", "real yields falling", "real yields pull back", "real yield rejection"])) {
    addSignal(state, 2, "text says real yields are falling or rejecting highs");
  }

  return finalizeDriver(input, state, {
    timeSensitivity: "This Week",
    bullishExplanation: "Real yields are easing, which improves the backdrop for Gold.",
    bearishExplanation: "Real yields are rising, which is one of the stronger bearish pressures on Gold.",
    neutralExplanation: "Real yields are stable or unclear, so this driver is not pushing Gold strongly yet.",
    mixedExplanation: "Real-yield and inflation-expectation signals conflict, so this driver needs confirmation.",
    bullishMeaning: "Lower real yields reduce the opportunity cost of holding Gold and can support upside.",
    bearishMeaning: "Rising real yields can pressure Gold even when other headlines look mixed.",
    neutralMeaning: "Treat real yields as background context until they clearly rise, fall, reject, or break.",
    mixedMeaning: "Wait for real yields to align with inflation expectations and Gold structure."
  });
}

export function analyzeFedToneDriver(input: GoldAnalysisInput): GoldDriverAnalysis {
  const state = createScoreState(input);
  const fedTone = lowerField(input, "fedTone");
  const rateExpectation = lowerField(input, "rateExpectation");
  const text = driverText(input);

  if (fedTone === "dovish") addSignal(state, 2, "Fed tone is dovish");
  if (fedTone === "hawkish") addSignal(state, -2, "Fed tone is hawkish");
  if (fedTone === "neutral") addSignal(state, 0, "Fed tone is neutral");
  if (fedTone === "mixed") {
    state.forceMixed = true;
    addSignal(state, 0, "Fed tone is mixed");
  }

  if (rateExpectation === "cuts expected") addSignal(state, 2, "rate cuts are expected");
  if (rateExpectation === "hike expected") addSignal(state, -2, "a rate hike is expected");
  if (rateExpectation === "higher for longer") addSignal(state, -2, "policy is expected to stay higher for longer");
  if (rateExpectation === "hold expected") addSignal(state, 0, "market expects a hold");

  if (hasAny(text, ["dot plot moved higher", "removed easing bias", "fewer cuts", "restrictive policy", "sticky inflation"])) {
    addSignal(state, -2, "Fed message points to tighter policy");
  }
  if (hasAny(text, ["fed signals cuts", "signals cuts", "slowing economy", "policy easing", "dovish", "rate cuts"])) {
    addSignal(state, 2, "Fed message points to cuts or easing");
  }

  return finalizeDriver(input, state, {
    timeSensitivity: hasAny(text, ["fomc", "powell", "fed decision", "minutes", "rate decision"]) ? "Immediate" : "This Week",
    caution: "Fed headlines can reverse Gold quickly. Wait for the first reaction candle to settle before entering.",
    bullishExplanation: "The Fed tone is Gold-supportive because it points toward cuts, easing, or a softer policy path.",
    bearishExplanation: "The Fed tone is hawkish because the market is pricing fewer cuts or higher-for-longer policy.",
    neutralExplanation: "Fed tone is not decisive enough to drive a clean Gold bias yet.",
    mixedExplanation: "Fed signals are mixed, so Gold needs confirmation from DXY, yields, and structure.",
    bullishMeaning: "A dovish Fed can pressure USD/yields and support Gold upside if liquidity and structure agree.",
    bearishMeaning: "A hawkish Fed can support USD/yields and pressure Gold unless safe-haven demand overrides it.",
    neutralMeaning: "Wait for rate expectations and market reaction to become clearer.",
    mixedMeaning: "Avoid forcing Gold trades when Fed language and rate expectations do not agree."
  });
}

export function analyzeCpiPceDriver(input: GoldAnalysisInput): GoldDriverAnalysis {
  const state = createScoreState(input);
  const inflationResult = lowerField(input, "inflationResult");
  const text = driverText(input);
  state.highImpact = true;

  if (inflationResult === "softer than expected") addSignal(state, 2, "inflation is softer than expected");
  if (inflationResult === "hotter than expected") addSignal(state, -2, "inflation is hotter than expected");
  if (inflationResult === "in line") addSignal(state, 0, "inflation is in line");
  if (inflationResult === "mixed") {
    state.forceMixed = true;
    addSignal(state, 0, "inflation data is mixed");
  }

  if (hasAny(text, ["supports rate cuts", "rate cuts", "yields fall", "dxy fall", "dxy falling", "weaker dollar"])) {
    addSignal(state, 1, "market reaction supports cuts or weaker USD/yields");
  }
  if (hasAny(text, ["strengthens usd", "yields jump", "yields rise", "strong dollar", "delays cuts", "higher for longer"])) {
    addSignal(state, -2, "market reaction strengthens USD/yields or delays cuts");
  }
  if (inflationResult === "hotter than expected" && hasAny(text, ["cuts priced", "still prices cuts", "market prices cuts"])) {
    state.forceMixed = true;
    addSignal(state, 1, "hot inflation conflicts with market still pricing cuts");
  }

  return finalizeDriver(input, state, {
    timeSensitivity: "Immediate",
    caution: "Avoid trading immediately before or during the CPI/PCE spike. Let spreads, liquidity, and structure normalize first.",
    finalGuidance: "Avoid trading before the news spike; trade only after the reaction and technical setup confirm.",
    bullishExplanation: "Inflation is softer, which can support rate-cut expectations and help Gold.",
    bearishExplanation: "Inflation is hot, which can delay rate cuts, strengthen yields and the Dollar, and pressure Gold.",
    neutralExplanation: "Inflation is in line, so the first DXY/yields reaction matters more than the headline.",
    mixedExplanation: "Inflation signals are mixed or the market reaction conflicts with the data.",
    bullishMeaning: "Softer CPI/PCE is a bullish Gold clue if yields and DXY also fall.",
    bearishMeaning: "Hot CPI/PCE is a bearish Gold clue and a reason to be very cautious around the release.",
    neutralMeaning: "Wait for the post-news reaction before using CPI/PCE as a trade driver.",
    mixedMeaning: "Do not trade the headline alone; wait for DXY, yields, and Gold structure to align."
  });
}

export function analyzeJobsDriver(input: GoldAnalysisInput): GoldDriverAnalysis {
  const state = createScoreState(input);
  const jobsResult = lowerField(input, "jobsResult");
  const unemployment = lowerField(input, "unemploymentRate");
  const wages = lowerField(input, "wageGrowth");
  const text = driverText(input);
  state.highImpact = true;

  if (jobsResult === "weaker than expected") addSignal(state, 2, "jobs data is weaker than expected");
  if (jobsResult === "stronger than expected") addSignal(state, -2, "jobs data is stronger than expected");
  if (jobsResult === "in line") addSignal(state, 0, "jobs data is in line");
  if (jobsResult === "mixed") {
    state.forceMixed = true;
    addSignal(state, 0, "jobs data is mixed");
  }

  if (hasAny(`${unemployment} ${text}`, ["unemployment rising", "higher unemployment", "jobless rate rises", "unemployment up"])) {
    addSignal(state, 1, "unemployment is rising");
  }
  if (hasAny(`${unemployment} ${wages} ${text}`, ["lower unemployment", "unemployment falls", "strong wages", "wage growth hot", "wages accelerate"])) {
    addSignal(state, -1, "low unemployment or strong wages keep Fed pressure alive");
  }
  if (jobsResult === "stronger than expected" && hasAny(wages, ["weak", "cooling", "falling", "soft"])) {
    state.forceMixed = true;
    addSignal(state, 1, "strong jobs conflict with weaker wage growth");
  }
  if (jobsResult === "weaker than expected" && hasAny(wages, ["hot", "strong", "rising", "accelerating"])) {
    state.forceMixed = true;
    addSignal(state, -1, "weak NFP conflicts with hot wages");
  }
  if (hasAny(text, ["rate cuts", "risk fear", "slower hiring", "missed forecast", "weak jobs"])) addSignal(state, 1, "text supports cuts or risk fear");
  if (hasAny(text, ["strong payrolls", "beats forecast", "hot labor market", "higher for longer", "strong jobs"])) addSignal(state, -1, "text supports USD/yields through strong labor data");

  return finalizeDriver(input, state, {
    timeSensitivity: "Immediate",
    caution: "NFP can create fast fake moves. Avoid entries before the release and wait for direction to settle.",
    bullishExplanation: "Jobs data is soft enough to support rate-cut expectations or risk fear.",
    bearishExplanation: "Jobs data is strong enough to support USD/yields and pressure Gold.",
    neutralExplanation: "Jobs data is not far enough from expectations to create a clean Gold bias.",
    mixedExplanation: "Jobs, unemployment, and wage signals are conflicting.",
    bullishMeaning: "Weak jobs can support Gold if DXY and yields fall after the release.",
    bearishMeaning: "Strong jobs can pressure Gold if yields and USD strengthen after the release.",
    neutralMeaning: "Wait for the market reaction instead of trading the jobs headline alone.",
    mixedMeaning: "Mixed labor data often creates choppy Gold; wait for structure and driver alignment."
  });
}

export function analyzeGeopoliticsDriver(input: GoldAnalysisInput): GoldDriverAnalysis {
  const state = createScoreState(input);
  const riskLevel = lowerField(input, "geopoliticalRiskLevel");
  const dxyReaction = lowerField(input, "dxyReaction");
  const eventType = lowerField(input, "eventType");
  const text = driverText(input);

  if (riskLevel === "extreme") {
    addSignal(state, 2, "geopolitical risk is extreme");
    state.highImpact = true;
  }
  if (riskLevel === "high") {
    addSignal(state, 2, "geopolitical risk is high");
    state.highImpact = true;
  }
  if (riskLevel === "medium") addSignal(state, 1, "geopolitical risk is medium");
  if (riskLevel === "low") addSignal(state, 0, "geopolitical risk is low");

  if (dxyReaction === "falling" || dxyReaction === "stable") addSignal(state, 1, "DXY is not fighting the safe-haven Gold bid");
  if (dxyReaction === "rising") {
    addSignal(state, -2, "DXY is rising against the safe-haven Gold bid");
    if (riskLevel === "high" || riskLevel === "extreme") state.forceMixed = true;
  }
  if (dxyReaction === "unknown") addSignal(state, 0, "DXY reaction is unknown");
  if (hasAny(`${eventType} ${text}`, ["war", "conflict", "sanctions", "banking risk", "global uncertainty", "escalation", "safe haven"])) {
    addSignal(state, 1, "event carries safe-haven risk");
    state.highImpact = true;
  }

  return finalizeDriver(input, state, {
    timeSensitivity: riskLevel === "extreme" || riskLevel === "high" ? "Immediate" : "This Week",
    caution: "Safe-haven moves can reverse if DXY spikes. Wait for Gold structure to confirm demand.",
    bullishExplanation: "Geopolitical risk is supporting safe-haven demand for Gold.",
    bearishExplanation: "Geopolitical inputs are not supporting Gold because USD pressure is dominating the risk story.",
    neutralExplanation: "Geopolitical risk is low or not strong enough to drive Gold right now.",
    mixedExplanation: "Geopolitical fear supports Gold, but the DXY reaction conflicts with the safe-haven signal.",
    bullishMeaning: "High fear with stable or falling DXY can create a strong bullish Gold backdrop.",
    bearishMeaning: "If DXY rises strongly, safe-haven Gold demand can be capped or delayed.",
    neutralMeaning: "Treat geopolitics as background unless risk rises or Gold reacts clearly.",
    mixedMeaning: "Wait until it is clear whether safe-haven Gold demand or Dollar strength is leading."
  });
}

export function analyzeEtfCentralBankDriver(input: GoldAnalysisInput): GoldDriverAnalysis {
  const state = createScoreState(input);
  const etfFlow = lowerField(input, "etfFlowDirection");
  const centralBankDemand = lowerField(input, "centralBankDemand");
  const text = driverText(input);

  if (etfFlow === "inflows") addSignal(state, 2, "Gold ETF flows show inflows");
  if (etfFlow === "outflows") addSignal(state, -1, "Gold ETF flows show outflows");
  if (etfFlow === "flat") addSignal(state, 0, "Gold ETF flows are flat");
  if (etfFlow === "unknown") addSignal(state, 0, "Gold ETF flows are unknown");

  if (centralBankDemand === "strong buying") addSignal(state, 2, "central banks show strong buying");
  if (centralBankDemand === "weak buying") addSignal(state, 1, "central banks show weak buying");
  if (centralBankDemand === "selling") addSignal(state, -2, "central banks are selling");
  if (centralBankDemand === "unknown") addSignal(state, 0, "central bank demand is unknown");

  if (hasAny(text, ["etf inflows", "strong central bank buying", "reserve buying", "gold demand rises", "accumulation"])) {
    addSignal(state, 1, "text confirms stronger Gold demand");
  }
  if (hasAny(text, ["asia inflows", "asia has recorded", "asian inflows", "central bank annual target", "700-900t", "700–900t", "reserve asset", "surpassed us treasuries"])) {
    addSignal(state, 2, "Asia or central-bank reserve demand provides a longer-term floor");
  }
  if (hasAny(text, ["etf outflows", "outflows of", "central bank selling", "redemptions", "gold demand weakens", "western etfs bearish", "western etf demand is weak"])) {
    addSignal(state, -2, "Western ETF flows are weak or showing outflows");
  }
  if (hasAny(text, ["underwater", "trapped longs", "overhead supply", "supply wall", "supply ceiling", "structural ceiling", "4000-4500", "4,000-4,500", "4,000–4,500"])) {
    addSignal(state, -2, "trapped ETF longs or overhead supply can cap rallies");
  }
  if (hasAny(text, ["lowered december gold forecast", "lowered forecast", "forecast cut", "goldman sachs lowered"])) {
    addSignal(state, -1, "a lowered Gold forecast adds demand-side caution");
  }

  if (state.bullishSignals.length && state.bearishSignals.length) {
    state.forceMixed = true;
  }

  return finalizeDriver(input, state, {
    timeSensitivity: "Longer-term",
    bullishExplanation: "ETF flows or central-bank demand are supporting a longer-term Gold bid.",
    bearishExplanation: "ETF outflows or central-bank selling are weakening longer-term Gold demand.",
    neutralExplanation: "ETF and central-bank data are flat or unknown, so this is not a trade trigger.",
    mixedExplanation: "ETF and central-bank demand are split between short-term overhead supply and longer-term physical demand support.",
    bullishMeaning: "Demand data supports the bigger Gold backdrop, but intraday entries still need structure.",
    bearishMeaning: "Weak demand can reduce longer-term support for Gold, especially if macro drivers also turn bearish.",
    neutralMeaning: "Use this as background context until demand data becomes clearer.",
    mixedMeaning: "Western ETF outflows or trapped longs can limit upside, while Asia and central banks may provide a floor rather than automatic buy confirmation.",
    caution: "Do not chase Gold longs into a known supply zone unless price structure, DXY, yields, and liquidity confirm continuation.",
    finalGuidance: "Wait for technical confirmation. Do not chase Gold longs into the $4,000-$4,500 supply zone unless price structure, DXY, yields, and liquidity confirm continuation. Treat Asia and central-bank demand as a floor, not automatic buy confirmation."
  });
}

export function analyzeCustomNewsDriver(input: GoldAnalysisInput): GoldDriverAnalysis {
  const state = createScoreState(input);
  const category = lowerField(input, "newsCategory");
  const text = driverText(input);
  const detectedDriver = detectCustomNewsDriver(category, text);

  if (hasAny(text, ["weaker dollar", "falling dxy", "dxy falling", "falling yields", "yields pull back", "rate cuts", "dovish fed", "safe haven", "risk fear", "etf inflows", "central bank buying"])) {
    addSignal(state, 2, `custom news appears Gold-supportive through ${detectedDriver}`);
  }
  if (hasAny(text, ["strong dollar", "rising dxy", "dxy rising", "rising yields", "treasury yields jump", "hawkish fed", "higher for longer", "hot inflation", "strong jobs", "etf outflows", "central bank selling"])) {
    addSignal(state, -2, `custom news appears Gold-negative through ${detectedDriver}`);
  }
  if (hasAny(text, ["mixed", "unclear", "conflicting", "choppy", "two-sided"])) {
    state.forceMixed = true;
    addSignal(state, 0, "custom news is described as mixed or unclear");
  }
  if (!state.bullishSignals.length && !state.bearishSignals.length) {
    state.forceMixed = true;
    addSignal(state, 0, `custom news category is ${detectedDriver}, but direction is unclear`);
  }

  return finalizeDriver(input, state, {
    timeSensitivity: category === "gold demand" ? "Longer-term" : "Intraday",
    bullishExplanation: `Custom news is leaning Gold-supportive through the ${detectedDriver} driver.`,
    bearishExplanation: `Custom news is leaning Gold-negative through the ${detectedDriver} driver.`,
    neutralExplanation: `Custom news is logged under ${detectedDriver}, but the Gold effect is still neutral.`,
    mixedExplanation: `Custom news is not clear enough yet under the ${detectedDriver} driver.`,
    bullishMeaning: "Use this as a clue only after DXY, yields, and Gold structure confirm.",
    bearishMeaning: "Use this as a warning against Gold longs unless price structure clearly overrides it.",
    neutralMeaning: "Get more confirmation from DXY, yields, Fed expectations, and Gold reaction.",
    mixedMeaning: "Wait for extra confirmation from DXY, yields, and Gold market structure before trading."
  });
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
  const neutral = latestByDriver.filter((report) => report.goldBias === "Neutral");
  const mixed = latestByDriver.filter((report) => report.goldBias === "Mixed / Wait");
  const strongestBullish = [...bullish].sort((a, b) => b.confidenceScore - a.confidenceScore)[0];
  const strongestBearish = [...bearish].sort((a, b) => b.confidenceScore - a.confidenceScore)[0];
  const dxy = latestByDriver.find((report) => report.driverName === "DXY / US Dollar");
  const yields = latestByDriver.find((report) => report.driverName === "US Yields");
  const fed = latestByDriver.find((report) => report.driverName === "Fed Tone / FOMC");
  const inflation = latestByDriver.find((report) => report.driverName === "CPI / PCE");
  const geopolitics = latestByDriver.find((report) => report.driverName === "Geopolitics");
  const highRisk = latestByDriver.find((report) => report.impactLevel === "High" && report.timeSensitivity === "Immediate");
  const mostDriversMixed = latestByDriver.length > 0 && mixed.length >= Math.ceil(latestByDriver.length / 2);

  let overallGoldBias: GoldBiasSummary["overallGoldBias"] = "Neutral";
  let preTradeVerdict: GoldPreTradeVerdict = "Trade only if setup confirms";
  let mainConflict = "No major driver conflict logged yet";

  if (mostDriversMixed) {
    overallGoldBias = "Wait";
    mainConflict = "Most saved drivers are mixed, so the cleanest decision is to wait.";
  } else if (dxy?.goldBias === "Bullish Gold" && yields && yields.goldBias !== "Bullish Gold") {
    overallGoldBias = "Wait";
    mainConflict = "DXY supports Gold, but US Yields do not confirm it.";
  } else if (geopolitics?.impactLevel === "High" && dxy?.goldBias === "Bearish Gold") {
    overallGoldBias = "Wait";
    mainConflict = "Geopolitical risk supports safe-haven Gold, but strong DXY creates a conflict.";
  } else if (fed?.goldBias === "Bearish Gold" && inflation?.goldBias === "Bearish Gold") {
    overallGoldBias = "Bearish";
    mainConflict = "Fed and inflation both point toward higher-rate pressure, which weakens Gold.";
  } else if (dxy?.goldBias === "Bullish Gold" && yields?.goldBias === "Bullish Gold") {
    overallGoldBias = "Bullish";
    mainConflict = "DXY and US Yields both support Gold, so the bias strengthens if structure confirms.";
  } else if (bullish.length > bearish.length && bullish.length > mixed.length) {
    overallGoldBias = "Bullish";
  } else if (bearish.length > bullish.length && bearish.length > mixed.length) {
    overallGoldBias = "Bearish";
  } else if (latestByDriver.length && (mixed.length || bullish.length === bearish.length)) {
    overallGoldBias = "Wait";
    mainConflict = "Bullish and bearish drivers are too balanced to force a trade.";
  }

  if (highRisk) {
    preTradeVerdict = "Avoid trading before news";
  } else if (overallGoldBias === "Wait") {
    preTradeVerdict = "Wait";
  } else if (overallGoldBias === "Neutral") {
    preTradeVerdict = "Manage existing trade only";
  }

  const mainRisk = highRisk
    ? `${highRisk.driverName}: ${highRisk.tradingCaution}`
    : mainConflict !== "No major driver conflict logged yet"
      ? mainConflict
      : mixed[0]?.driverName
        ? `${mixed[0].driverName} is mixed`
        : "No major research risk logged yet";

  return {
    overallGoldBias,
    bullishDrivers: formatDriverNames(bullish),
    bullishDriversCount: bullish.length,
    bearishDrivers: formatDriverNames(bearish),
    bearishDriversCount: bearish.length,
    neutralDrivers: formatDriverNames(neutral),
    neutralDriversCount: neutral.length,
    mixedDrivers: formatDriverNames(mixed),
    mixedDriversCount: mixed.length,
    strongestBullishDriver: strongestBullish ? `${strongestBullish.driverName} (${strongestBullish.confidenceScore}%)` : "None yet",
    strongestBearishDriver: strongestBearish ? `${strongestBearish.driverName} (${strongestBearish.confidenceScore}%)` : "None yet",
    mainConflict,
    mainRisk,
    bestSessionToWaitFor: highRisk ? "Wait until after the news reaction settles" : "London-New York Overlap",
    preTradeVerdict,
    personalRule: GOLD_PERSONAL_RULE,
    driverSummaries: latestByDriver.map((report) => ({
      driverName: report.driverName,
      newsHeadline: report.inputHeadline || "No headline saved",
      newsSummary: report.inputSummary || "No news summary saved",
      chartObservation: report.chartObservation || "No chart observation saved",
      goldBias: report.goldBias,
      impactLevel: report.impactLevel,
      confidenceScore: report.confidenceScore,
      finalGuidance: report.finalGuidance
    }))
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

export function hasMeaningfulGoldResearchInput(input: Partial<GoldAnalysisInput>) {
  const driverFields = input.driverFields ?? {};
  const driverValues = Object.entries(driverFields)
    .filter(([key]) => key !== "sourceLink")
    .map(([, value]) => value);
  const values = [input.headline, input.summary, input.currentValue, input.chartObservation, input.notes, ...driverValues];
  return values.some((value) => String(value ?? "").trim().length > 0);
}

function createScoreState(input: GoldAnalysisInput): ScoreState {
  return {
    score: 0,
    bullishSignals: [],
    bearishSignals: [],
    neutralSignals: [],
    forceMixed: false,
    highImpact: hasAny(driverText(input), ["breaking news", "high impact", "fomc", "powell", "cpi", "pce", "nfp", "war", "crisis", "spike", "emergency"])
  };
}

function finalizeDriver(input: GoldAnalysisInput, state: ScoreState, messages: DriverMessages): GoldDriverAnalysis {
  const hasBullish = state.bullishSignals.length > 0;
  const hasBearish = state.bearishSignals.length > 0;
  const hasConflict = state.forceMixed || (hasBullish && hasBearish && Math.abs(state.score) <= 2);

  let goldBias: GoldBias = "Neutral";
  if (hasConflict) goldBias = "Mixed / Wait";
  else if (state.score >= 2) goldBias = "Bullish Gold";
  else if (state.score <= -2) goldBias = "Bearish Gold";
  else if (hasBullish && hasBearish) goldBias = "Mixed / Wait";

  const confidenceScore = getConfidenceScore(goldBias, state);
  const impactLevel = getImpactLevel(goldBias, state);
  const explanation = `${getExplanation(goldBias, messages)}${signalSentence(state)}`;
  const goldMeaning = getGoldMeaning(goldBias, messages);
  const headlineSummary = summarizeHeadline(input);
  const newsDriverSummary = summarizeNewsDriver(input, state);
  const chartObservationInterpretation = interpretChartObservation(input, goldBias);
  const keyConflictOrRisk = getKeyConflictOrRisk(state, goldBias, messages);

  return {
    driverName: input.driverName,
    goldBias,
    impactLevel,
    timeSensitivity: messages.timeSensitivity,
    confidenceScore,
    headlineSummary,
    newsDriverSummary,
    chartObservationInterpretation,
    explanation,
    goldMeaning,
    whatThisMeansForGold: goldMeaning,
    bullishGoldClues: state.bullishSignals,
    bearishGoldClues: state.bearishSignals,
    keyConflictOrRisk,
    checklistEffect: getChecklistEffect(goldBias, confidenceScore),
    tradingCaution: messages.caution ?? getTradingCaution(goldBias, impactLevel, messages.timeSensitivity),
    finalGuidance: messages.finalGuidance ?? getFinalGuidance(goldBias, confidenceScore, messages.timeSensitivity, impactLevel)
  };
}

function summarizeHeadline(input: GoldAnalysisInput) {
  const headline = cleanText(input.headline);
  if (!headline) return "No headline entered.";
  return `${input.driverName} headline: ${headline}`;
}

function summarizeNewsDriver(input: GoldAnalysisInput, state: ScoreState) {
  const summary = cleanText(input.summary);
  const sourceNote = input.sourceLink ? " Source link is logged for review." : " No source link was added.";
  const driverFieldText = formatDriverSpecificData(input);
  const signalText = [...state.bullishSignals, ...state.bearishSignals].slice(0, 6).join("; ");

  if (summary && signalText) {
    return `${summary} Driver-specific data: ${driverFieldText || "none entered"}. Detected clues: ${signalText}.${sourceNote}`;
  }

  if (summary) {
    return `${summary} Driver-specific data: ${driverFieldText || "none entered"}.${sourceNote}`;
  }

  return `No news summary entered. Driver-specific data: ${driverFieldText || "none entered"}.${sourceNote}`;
}

function interpretChartObservation(input: GoldAnalysisInput, goldBias: GoldBias) {
  const observation = cleanText(input.chartObservation);
  if (!observation) return "No chart observation entered, so the analysis needs price-structure confirmation.";

  const text = normalize(observation);
  if (hasAny(text, ["overhead supply", "supply wall", "supply ceiling", "resistance", "trapped longs", "underwater", "4000-4500", "4,000-4,500", "4,000–4,500"])) {
    return `${observation} This warns that Gold may have limited upside until price breaks and holds above the supply/resistance zone with strong demand.`;
  }
  if (hasAny(text, ["floor", "support", "demand zone", "central banks providing floor", "asia", "inflows"])) {
    return `${observation} This suggests underlying support, but support is not automatic buy confirmation without structure and liquidity alignment.`;
  }
  if (hasAny(text, ["rejecting resistance", "break of structure", "breaking support", "liquidity sweep", "displacement", "order block"])) {
    return `${observation} This chart note can become useful only when it aligns with the macro driver and Gold execution structure.`;
  }

  if (goldBias === "Bullish Gold") return `${observation} This chart note should confirm higher-timeframe structure before treating the driver as a buy filter.`;
  if (goldBias === "Bearish Gold") return `${observation} This chart note should confirm resistance, failed continuation, or bearish structure before short-side action.`;
  return `${observation} This chart note keeps the setup conditional until Gold price structure confirms direction.`;
}

function getKeyConflictOrRisk(state: ScoreState, goldBias: GoldBias, messages: DriverMessages) {
  if (state.bullishSignals.length && state.bearishSignals.length) {
    return `Conflict: ${state.bullishSignals[0]} but ${state.bearishSignals[0]}. ${messages.mixedMeaning}`;
  }

  if (goldBias === "Mixed / Wait") return messages.mixedMeaning;
  if (goldBias === "Neutral") return "Risk: the core research inputs do not give a clean directional edge yet.";
  if (messages.timeSensitivity === "Immediate") return "Risk: immediate news sensitivity can create fast false moves.";
  return messages.caution ?? getTradingCaution(goldBias, getImpactLevel(goldBias, state), messages.timeSensitivity);
}

function scoreYieldDirection(state: ScoreState, direction: string, label: string) {
  if (direction === "falling" || direction === "breaking lower") addSignal(state, 2, `${label} is ${direction}`);
  if (direction === "rejecting high") addSignal(state, 1, `${label} is rejecting a high`);
  if (direction === "rising" || direction === "breaking higher") addSignal(state, -2, `${label} is ${direction}`);
  if (direction === "sideways") addSignal(state, 0, `${label} is sideways`);
}

function isYieldBullish(direction: string) {
  return direction === "falling" || direction === "breaking lower" || direction === "rejecting high";
}

function isYieldBearish(direction: string) {
  return direction === "rising" || direction === "breaking higher";
}

function addSignal(state: ScoreState, points: number, signal: string) {
  state.score += points;
  if (points > 0) state.bullishSignals.push(signal);
  else if (points < 0) state.bearishSignals.push(signal);
  else state.neutralSignals.push(signal);
}

function getExplanation(goldBias: GoldBias, messages: DriverMessages) {
  if (goldBias === "Bullish Gold") return messages.bullishExplanation;
  if (goldBias === "Bearish Gold") return messages.bearishExplanation;
  if (goldBias === "Mixed / Wait") return messages.mixedExplanation;
  return messages.neutralExplanation;
}

function getGoldMeaning(goldBias: GoldBias, messages: DriverMessages) {
  if (goldBias === "Bullish Gold") return messages.bullishMeaning;
  if (goldBias === "Bearish Gold") return messages.bearishMeaning;
  if (goldBias === "Mixed / Wait") return messages.mixedMeaning;
  return messages.neutralMeaning;
}

function getConfidenceScore(goldBias: GoldBias, state: ScoreState) {
  const sameSideSignals = goldBias === "Bullish Gold" ? state.bullishSignals.length : goldBias === "Bearish Gold" ? state.bearishSignals.length : 0;
  const directionalSignals = state.bullishSignals.length + state.bearishSignals.length;
  let confidence = 45;

  if (!directionalSignals && !state.neutralSignals.length) confidence = 38;
  else if (goldBias === "Mixed / Wait") confidence = 56 + Math.min(8, directionalSignals * 2);
  else if (goldBias === "Neutral") confidence = 52;
  else if (sameSideSignals >= 2 && Math.abs(state.score) >= 4) confidence = 88;
  else if (sameSideSignals >= 2) confidence = 81;
  else confidence = 72;

  if (state.bullishSignals.length && state.bearishSignals.length) confidence -= 8;
  if (state.highImpact && confidence >= 60 && goldBias !== "Mixed / Wait") confidence += 3;

  return clamp(confidence, 35, 95);
}

function getImpactLevel(goldBias: GoldBias, state: ScoreState): GoldImpactLevel {
  const sameSideSignals = goldBias === "Bullish Gold" ? state.bullishSignals.length : goldBias === "Bearish Gold" ? state.bearishSignals.length : 0;
  if (state.highImpact || (sameSideSignals >= 2 && Math.abs(state.score) >= 4)) return "High";
  if (goldBias === "Bullish Gold" || goldBias === "Bearish Gold" || goldBias === "Mixed / Wait") return "Medium";
  return "Low";
}

function getChecklistEffect(goldBias: GoldBias, confidenceScore: number): GoldChecklistEffect {
  if ((goldBias === "Bullish Gold" || goldBias === "Bearish Gold") && confidenceScore > 65) return "Supports trade";
  if (goldBias === "Bearish Gold") return "Warns against trade";
  return "Wait";
}

function getTradingCaution(goldBias: GoldBias, impactLevel: GoldImpactLevel, timeSensitivity: GoldTimeSensitivity) {
  if (timeSensitivity === "Immediate" && impactLevel === "High") return "Avoid entries just before or during the news spike.";
  if (goldBias === "Mixed / Wait") return "Do not force a trade while drivers conflict.";
  if (goldBias === "Neutral") return "Treat this as background context, not a trade trigger.";
  return "Trade only after clean liquidity sweep, structure confirmation, and controlled risk.";
}

function getFinalGuidance(goldBias: GoldBias, confidenceScore: number, timeSensitivity: GoldTimeSensitivity, impactLevel: GoldImpactLevel) {
  if (timeSensitivity === "Immediate" && impactLevel === "High") return "Wait for the news reaction to settle, then trade only if structure confirms";
  if (goldBias === "Mixed / Wait") return "Wait";
  if (goldBias === "Neutral") return "Wait or manage existing trades only";
  if (confidenceScore <= 65) return "Wait for stronger confirmation";
  return "Trade allowed only if technical setup confirms";
}

function signalSentence(state: ScoreState) {
  const signals = [...state.bullishSignals, ...state.bearishSignals, ...state.neutralSignals].slice(0, 5);
  return signals.length ? ` Key clues: ${signals.join("; ")}.` : "";
}

function detectCustomNewsDriver(category: string, text: string) {
  if (category && category !== "other") return category;
  if (hasAny(text, ["dxy", "dollar", "usd"])) return "Dollar";
  if (hasAny(text, ["yield", "treasury", "bond"])) return "Yields";
  if (hasAny(text, ["fed", "fomc", "powell", "rates"])) return "Fed";
  if (hasAny(text, ["cpi", "pce", "inflation"])) return "Inflation";
  if (hasAny(text, ["nfp", "jobs", "payroll", "unemployment", "wages"])) return "Jobs";
  if (hasAny(text, ["war", "conflict", "sanctions", "risk", "safe haven"])) return "Geopolitics";
  if (hasAny(text, ["etf", "central bank", "demand", "buying"])) return "Gold Demand";
  return "Other";
}

function formatDriverNames(reports: GoldResearchReport[]) {
  return reports.length ? reports.map((report) => report.driverName).join(", ") : "None yet";
}

function formatDriverSpecificData(input: GoldAnalysisInput) {
  const coreKeys = new Set(["newsHeadline", "newsSummary", "chartObservation", "sourceLink", "notes"]);
  return Object.entries(input.driverFields ?? {})
    .filter(([key, value]) => !coreKeys.has(key) && String(value ?? "").trim())
    .map(([key, value]) => `${formatFieldLabel(key)}: ${value}`)
    .join("; ");
}

function formatFieldLabel(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function driverText(input: GoldAnalysisInput) {
  const fieldValues = Object.values(input.driverFields ?? {}).join(" ");
  return normalize(`${input.headline} ${input.summary} ${input.currentValue} ${input.chartObservation} ${input.notes} ${fieldValues}`);
}

function field(input: GoldAnalysisInput, key: string) {
  return String(input.driverFields?.[key] ?? "").trim();
}

function lowerField(input: GoldAnalysisInput, key: string) {
  return normalize(field(input, key));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalize(term)));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
