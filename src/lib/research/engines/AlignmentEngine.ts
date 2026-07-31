import type { DecisionContext, AlignmentResult } from "./types";
import { alignmentStrength, alignmentDirection } from "./types";

export function calculateAlignment(context: DecisionContext): AlignmentResult {
  const { institutionalPositioning, marketStructure, liquidity, marketParticipation } = context;

  const etfAlignment = etfAlignmentScore(institutionalPositioning);
  const commercialAlignment = commercialAlignmentScore(institutionalPositioning);
  const openInterestAlignment = oiAlignmentScore(liquidity);
  const breadthAlignment = breadthAlignmentScore(marketParticipation);

  const rawScore = etfAlignment * 0.30 + commercialAlignment * 0.35 + openInterestAlignment * 0.15 + breadthAlignment * 0.20;
  const netDirectional = institutionalPositioning.positioningScore;

  const score = Math.round(rawScore);
  const strength = alignmentStrength(score);
  const direction = alignmentDirection(netDirectional);

  const breakdown = buildAlignmentBreakdown(
    etfAlignment,
    commercialAlignment,
    openInterestAlignment,
    breadthAlignment,
    score,
    strength,
    direction
  );

  return {
    score,
    direction,
    strength,
    components: {
      etfAlignment,
      commercialAlignment,
      openInterestAlignment,
      breadthAlignment,
    },
    breakdown,
  };
}

function etfAlignmentScore(positioning: { etfDirection: string }): number {
  if (positioning.etfDirection === "Accumulation") return 80;
  if (positioning.etfDirection === "Distribution") return 20;
  if (positioning.etfDirection === "Neutral") return 50;
  return 50;
}

function commercialAlignmentScore(positioning: { commercialPositioning: string; netPositioning: number }): number {
  if (positioning.commercialPositioning === "Net Long") return 85;
  if (positioning.commercialPositioning === "Net Short") return 15;
  if (positioning.commercialPositioning === "Flat") return 50;
  return 50;
}

function oiAlignmentScore(liquidity: { openInterestTrend: string; openInterestChange: number }): number {
  if (liquidity.openInterestTrend === "Rising") return 75;
  if (liquidity.openInterestTrend === "Falling") return 25;
  if (liquidity.openInterestTrend === "Flat") return 50;
  return 50;
}

function breadthAlignmentScore(participation: { participationScore: number }): number {
  return Math.round(
    participation.participationScore >= 70 ? 80
    : participation.participationScore >= 50 ? 65
    : participation.participationScore >= 30 ? 40
    : 25
  );
}

function buildAlignmentBreakdown(
  etf: number,
  commercial: number,
  oi: number,
  breadth: number,
  finalScore: number,
  strength: string,
  direction: string
): string[] {
  const lines: string[] = [];

  lines.push(`ETF flow alignment: ${etf}/100`);
  lines.push(`Commercial positioning alignment: ${commercial}/100`);
  lines.push(`Open interest alignment: ${oi}/100`);
  lines.push(`Market breadth alignment: ${breadth}/100`);

  lines.push(`Overall alignment: ${finalScore}/100 — ${strength} ${direction}`);

  return lines;
}
