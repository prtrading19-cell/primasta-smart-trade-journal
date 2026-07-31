import type { DriverBias } from "@/types/goldResearchConfig";
import type {
  DecisionContext,
  DecisionContextRaw,
  MarketStructure,
  Liquidity,
  InstitutionalPositioning,
  MacroBias,
  TechnicalRisk,
  MarketParticipation,
  ConfidenceInputs,
} from "./types";

export function buildDecisionContext(raw: DecisionContextRaw): DecisionContext {
  const marketStructure = computeMarketStructure(raw);
  const liquidity = computeLiquidity(raw);
  const institutionalPositioning = computeInstitutionalPositioning(raw);
  const macroBias = computeMacroBias(raw);
  const technicalRisk = computeTechnicalRisk(raw);
  const marketParticipation = computeMarketParticipation(raw);
  const confidenceInputs = computeConfidenceInputs(raw);

  return {
    marketStructure,
    liquidity,
    institutionalPositioning,
    macroBias,
    technicalRisk,
    marketParticipation,
    confidenceInputs,
    timestamp: new Date().toISOString(),
  };
}

function computeMarketStructure(raw: DecisionContextRaw): MarketStructure {
  const sectors = raw.sectors ?? {};
  const sectorValues = Object.values(sectors).filter((v) => typeof v === "number");
  const positiveCount = sectorValues.filter((v) => v > 0).length;
  const negativeCount = sectorValues.filter((v) => v < 0).length;
  const total = sectorValues.length || 1;

  const trend: MarketStructure["trend"] =
    positiveCount > negativeCount * 2 ? "Bullish"
    : negativeCount > positiveCount * 2 ? "Bearish"
    : positiveCount > negativeCount ? "Bullish"
    : negativeCount > positiveCount ? "Bearish"
    : "Neutral";

  const strength = Math.round((positiveCount / total) * 100);

  const sortedSectors = Object.entries(sectors)
    .map(([name, change]) => ({ name, change: change as number }))
    .sort((a, b) => b.change - a.change);

  const positiveSectors = sortedSectors.filter((s) => s.change > 0.5);
  const negativeSectors = sortedSectors.filter((s) => s.change < -0.5);

  let sectorRotation: MarketStructure["sectorRotation"] = "None";
  if (positiveSectors.length >= 3 && negativeSectors.length <= 1) {
    sectorRotation = "Rotation Into";
  } else if (negativeSectors.length >= 3) {
    sectorRotation = "Rotation Out Of";
  } else if (positiveSectors.length >= 2 && negativeSectors.length >= 2) {
    sectorRotation = "Rotational";
  }

  const dominant = sortedSectors.slice(0, 3).map((s) => s.name);

  return {
    trend,
    strength,
    breadth: raw.breadth ? raw.breadth.ratio ?? 0 : 0,
    sectorRotation,
    dominantSectors: dominant,
  };
}

function computeLiquidity(raw: DecisionContextRaw): Liquidity {
  const oi = raw.openInterest;
  let oiTrend: Liquidity["openInterestTrend"] = "Unknown";
  let oiChange = 0;

  if (oi) {
    oiChange = oi.changeFromPrevious ?? 0;
    const pctChange = oi.currentLevel && oi.currentLevel > 0
      ? (oiChange / oi.currentLevel) * 100
      : 0;
    if (pctChange > 1) oiTrend = "Rising";
    else if (pctChange < -1) oiTrend = "Falling";
    else oiTrend = "Flat";
  }

  const breadth = raw.breadth;
  let volumeParticipation = 50;
  if (breadth && (breadth.advancing + breadth.declining) > 0) {
    volumeParticipation = Math.round(
      (breadth.advancing / (breadth.advancing + breadth.declining)) * 100
    );
  }

  const liqScore = Math.round(
    (oiTrend === "Rising" ? 30 : oiTrend === "Falling" ? 10 : 20) +
    (volumeParticipation > 60 ? 30 : volumeParticipation > 40 ? 20 : 10) +
    (breadth ? 40 : 0)
  );

  const assessment =
    liqScore >= 70 ? "Healthy liquidity with broad participation"
    : liqScore >= 50 ? "Adequate liquidity"
    : liqScore >= 30 ? "Below average liquidity"
    : "Poor liquidity conditions";

  return {
    openInterestTrend: oiTrend,
    openInterestChange: oiChange,
    volumeParticipation,
    liquidityScore: liqScore,
    assessment,
  };
}

function computeInstitutionalPositioning(raw: DecisionContextRaw): InstitutionalPositioning {
  const etf = raw.etfFlows;
  const etfDirection = etf
    ? etf.netFlow && etf.netFlow > 0 ? "Accumulation"
      : etf.netFlow && etf.netFlow < 0 ? "Distribution"
      : "Neutral"
    : "Unknown";

  const cot = raw.cot;
  let commercialPositioning = "Unknown";
  let speculatorPositioning = "Unknown";
  let netPositioning = 0;

  if (cot && cot.length > 0) {
    const us100COT = cot.find(
      (c) =>
        c.contractName?.includes("NASDAQ") ||
        c.contractName?.includes("NQ") ||
        c.contractName?.includes("US100")
    );
    if (us100COT) {
      const specNet = us100COT.nonCommercials.netLong;
      const commercialNet = us100COT.commercials.netLong;
      commercialPositioning = commercialNet > 0 ? "Net Long" : commercialNet < 0 ? "Net Short" : "Flat";
      speculatorPositioning = specNet > 0 ? "Net Long" : specNet < 0 ? "Net Short" : "Flat";
      netPositioning = commercialNet;
    }
  }

  let crowdingLevel = "Low";
  if (cot && cot.length > 0) {
    const c = cot[0];
    const totalPos = Math.abs(c.nonCommercials.long) + Math.abs(c.nonCommercials.short);
    if (totalPos > 100000) crowdingLevel = "Extreme";
    else if (totalPos > 50000) crowdingLevel = "High";
    else if (totalPos > 20000) crowdingLevel = "Moderate";
  }

  const positioningScore = Math.round(
    (etfDirection === "Accumulation" ? 30 : etfDirection === "Distribution" ? -30 : 0) +
    (commercialPositioning === "Net Long" ? 40 : commercialPositioning === "Net Short" ? -40 : 0) +
    (crowdingLevel === "Extreme" ? -15 : crowdingLevel === "High" ? -10 : 0)
  );

  return {
    etfDirection,
    commercialPositioning,
    speculatorPositioning,
    netPositioning,
    crowdingLevel,
    positioningScore: Math.max(-100, Math.min(100, positioningScore)),
  };
}

function computeMacroBias(raw: DecisionContextRaw): MacroBias {
  const macro = raw.macro;
  if (!macro || !macro.indicators || macro.indicators.length === 0) {
    return {
      bias: "Neutral" as const,
      score: 50,
      keyIndicators: [],
      fedPolicyImpact: "Unknown",
      economicHealth: "Unknown",
    };
  }

  const deteriorating = macro.indicators.filter((i) => i.trend === "Deteriorating").length;
  const improving = macro.indicators.filter((i) => i.trend === "Improving").length;
  const total = macro.indicators.length || 1;

  const netScore = (improving - deteriorating) / total;
  const score = Math.round(50 + netScore * 50);

  const bias: DriverBias =
    score >= 65 ? "Bullish"
    : score <= 35 ? "Bearish"
    : "Neutral";

  const fedImpact = macro.fedFunds
    ? parseFloat(macro.fedFunds) > 5
      ? "Restrictive"
      : parseFloat(macro.fedFunds) > 3
        ? "Moderately Restrictive"
        : parseFloat(macro.fedFunds) > 1
          ? "Accommodative"
          : "Highly Accommodative"
    : "Unknown";

  const econHealth =
    improving > deteriorating
      ? "Improving"
      : deteriorating > improving
        ? "Deteriorating"
        : "Stable";

  return {
    bias,
    score,
    keyIndicators: macro.indicators.map((i) => ({
      name: i.name,
      impact: i.trend === "Improving" ? "Positive" : i.trend === "Deteriorating" ? "Negative" : "Neutral",
    })),
    fedPolicyImpact: fedImpact,
    economicHealth: econHealth,
  };
}

function computeTechnicalRisk(raw: DecisionContextRaw): TechnicalRisk {
  const vol = raw.volatility;
  const vix = vol?.vix ?? 0;
  const gvz = vol?.gvz;
  const vixPct = vol?.vixPercentile ?? 50;

  let regime: TechnicalRisk["volatilityRegime"] = "Normal";
  if (vix > 35) regime = "Extreme";
  else if (vix > 28) regime = "High";
  else if (vix > 22) regime = "Elevated";
  else if (vix > 14) regime = "Normal";
  else regime = "Low";

  const riskScore = Math.round(
    Math.min(100, (vix / 40) * 50 + (vixPct / 100) * 30 + (gvz && gvz > 25 ? 20 : 0))
  );

  return {
    vixLevel: vix,
    gvzLevel: gvz,
    volatilityRegime: regime,
    vixPercentile: vixPct,
    riskScore,
  };
}

function computeMarketParticipation(raw: DecisionContextRaw): MarketParticipation {
  const breadth = raw.breadth;
  if (!breadth) {
    return {
      breadthRatio: 0,
      advancingStocks: 0,
      decliningStocks: 0,
      participationScore: 0,
      assessment: "No breadth data available",
    };
  }

  const total = breadth.advancing + breadth.declining + (breadth.unchanged ?? 0);
  const ratio = total > 0 ? breadth.advancing / breadth.declining : 1;

  let assessment: string;
  const score = Math.round(Math.min(100, ratio * 40));
  if (ratio > 2) assessment = "Broad participation with strong advancing breadth";
  else if (ratio > 1.2) assessment = "Healthy participation with advancing bias";
  else if (ratio > 0.8) assessment = "Balanced participation";
  else if (ratio > 0.5) assessment = "Weak participation with declining bias";
  else assessment = "Poor participation, broad selling pressure";

  return {
    breadthRatio: ratio,
    advancingStocks: breadth.advancing,
    decliningStocks: breadth.declining,
    participationScore: score,
    assessment,
  };
}

function computeConfidenceInputs(raw: DecisionContextRaw): ConfidenceInputs {
  const hasMacro = Boolean(raw.macro?.indicators && raw.macro.indicators.length > 0);
  const hasVol = Boolean(raw.volatility && raw.volatility.vix > 0);
  const hasETF = Boolean(raw.etfFlows?.etfs && raw.etfFlows.etfs.length > 0);
  const hasCOT = Boolean(raw.cot && raw.cot.length > 0);
  const hasOI = Boolean(raw.openInterest && raw.openInterest.currentLevel !== undefined);
  const hasBreadth = Boolean(raw.breadth && (raw.breadth.advancing > 0 || raw.breadth.declining > 0));
  const hasSectors = Boolean(raw.sectors && Object.keys(raw.sectors).length > 0);

  const available = [hasMacro, hasVol, hasETF, hasCOT, hasOI, hasBreadth, hasSectors].filter(Boolean).length;
  const total = 7;
  const availability = Math.round((available / total) * 100);

  return {
    providerAvailability: availability,
    providerFreshness: 80,
    providerAgreement: 50,
    signalQuality: 50,
    historicalConsistency: 60,
  };
}
