import type { DecisionAction, RiskRating, DecisionQuality } from "@/types/decisionEngine";

export interface ScoreThresholds {
  strongBullish: number;
  bullish: number;
  bearish: number;
  strongBearish: number;
}

export interface DecisionThresholds {
  scoreToBias: ScoreThresholds;
  biasToDecision: {
    [bias: string]: {
      highConfidence: DecisionAction;
      mediumConfidence: DecisionAction;
      lowConfidence: DecisionAction;
    };
  };
  confidence: {
    highThreshold: number;
    mediumThreshold: number;
    lowThreshold: number;
  };
  riskRating: {
    extremeThreshold: number;
    highThreshold: number;
    mediumThreshold: number;
  };
  conflict: {
    extremeThreshold: number;
    highThreshold: number;
    moderateThreshold: number;
  };
  alignment: {
    strongThreshold: number;
    moderateThreshold: number;
    weakThreshold: number;
  };
  decisionQuality: {
    highConfidenceThreshold: number;
    lowConflictThreshold: number;
    highAlignmentThreshold: number;
  };
  minimumData: {
    minSourcesRequired: number;
    minConfidenceForDecision: number;
    minScoreForBuy: number;
    maxScoreForSell: number;
  };
}

export const DEFAULT_DECISION_THRESHOLDS: DecisionThresholds = {
  scoreToBias: {
    strongBullish: 70,
    bullish: 55,
    bearish: 45,
    strongBearish: 30
  },
  biasToDecision: {
    "Strong Bullish": {
      highConfidence: "Strong Buy",
      mediumConfidence: "Buy",
      lowConfidence: "Wait"
    },
    "Bullish": {
      highConfidence: "Buy",
      mediumConfidence: "Buy",
      lowConfidence: "Wait"
    },
    "Neutral": {
      highConfidence: "Wait",
      mediumConfidence: "Wait",
      lowConfidence: "Wait"
    },
    "Bearish": {
      highConfidence: "Sell",
      mediumConfidence: "Sell",
      lowConfidence: "Wait"
    },
    "Strong Bearish": {
      highConfidence: "Strong Sell",
      mediumConfidence: "Sell",
      lowConfidence: "Wait"
    }
  },
  confidence: {
    highThreshold: 65,
    mediumThreshold: 40,
    lowThreshold: 25
  },
  riskRating: {
    extremeThreshold: 75,
    highThreshold: 55,
    mediumThreshold: 30
  },
  conflict: {
    extremeThreshold: 70,
    highThreshold: 50,
    moderateThreshold: 30
  },
  alignment: {
    strongThreshold: 75,
    moderateThreshold: 55,
    weakThreshold: 35
  },
  decisionQuality: {
    highConfidenceThreshold: 60,
    lowConflictThreshold: 30,
    highAlignmentThreshold: 65
  },
  minimumData: {
    minSourcesRequired: 1,
    minConfidenceForDecision: 25,
    minScoreForBuy: 55,
    maxScoreForSell: 45
  }
};

export function overrideScoreThresholds(
  base: DecisionThresholds,
  overrides: Partial<ScoreThresholds>
): DecisionThresholds {
  return {
    ...base,
    scoreToBias: {
      ...base.scoreToBias,
      ...overrides
    }
  };
}

export function overrideConfidenceThresholds(
  base: DecisionThresholds,
  overrides: Partial<DecisionThresholds["confidence"]>
): DecisionThresholds {
  return {
    ...base,
    confidence: {
      ...base.confidence,
      ...overrides
    }
  };
}

export function overrideRiskThresholds(
  base: DecisionThresholds,
  overrides: Partial<DecisionThresholds["riskRating"]>
): DecisionThresholds {
  return {
    ...base,
    riskRating: {
      ...base.riskRating,
      ...overrides
    }
  };
}

export function createConservativeThresholds(): DecisionThresholds {
  return {
    ...DEFAULT_DECISION_THRESHOLDS,
    scoreToBias: {
      strongBullish: 75,
      bullish: 60,
      bearish: 40,
      strongBearish: 25
    },
    confidence: {
      highThreshold: 70,
      mediumThreshold: 50,
      lowThreshold: 30
    },
    minimumData: {
      minSourcesRequired: 2,
      minConfidenceForDecision: 35,
      minScoreForBuy: 60,
      maxScoreForSell: 40
    }
  };
}

export function createAggressiveThresholds(): DecisionThresholds {
  return {
    ...DEFAULT_DECISION_THRESHOLDS,
    scoreToBias: {
      strongBullish: 65,
      bullish: 52,
      bearish: 48,
      strongBearish: 35
    },
    confidence: {
      highThreshold: 55,
      mediumThreshold: 35,
      lowThreshold: 20
    },
    minimumData: {
      minSourcesRequired: 1,
      minConfidenceForDecision: 20,
      minScoreForBuy: 50,
      maxScoreForSell: 50
    }
  };
}
