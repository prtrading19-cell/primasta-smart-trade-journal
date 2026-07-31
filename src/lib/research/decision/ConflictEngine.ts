import type { EvidenceRecord, ConflictResult } from "./types";
import type { DriverBias } from "@/types/goldResearchConfig";

const BIAS_VALUES: Record<DriverBias, number> = {
  "Strong Bullish": 1,
  Bullish: 0.5,
  Neutral: 0,
  Bearish: -0.5,
  "Strong Bearish": -1,
};

export function detectConflicts(evidence: EvidenceRecord[]): ConflictResult {
  if (evidence.length < 2) {
    return {
      score: 0,
      severity: "None",
      conflictingPairs: [],
      consensusDrivers: evidence.map((e) => e.driverTitle),
      discordDrivers: [],
      explanation: "Insufficient evidence to detect conflicts.",
    };
  }

  const conflictingPairs: ConflictResult["conflictingPairs"] = [];
  const biasMap = new Map<string, DriverBias>();

  for (const e of evidence) {
    const existing = biasMap.get(e.category);
    if (!existing) {
      biasMap.set(e.category, e.bias);
    }
  }

  const categories = Array.from(biasMap.entries());

  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const [catA, biasA] = categories[i];
      const [catB, biasB] = categories[j];
      const valA = BIAS_VALUES[biasA] ?? 0;
      const valB = BIAS_VALUES[biasB] ?? 0;

      if (valA * valB < 0) {
        const severity = Math.abs(valA - valB) * 50;
        conflictingPairs.push({
          driverA: catA,
          driverB: catB,
          biasA,
          biasB,
          severity: Math.round(severity),
          explanation: `${catA} is ${biasA.toLowerCase()} but ${catB} is ${biasB.toLowerCase()}`,
        });
      }
    }
  }

  const consensusDrivers: string[] = [];
  const discordDrivers: string[] = [];
  const allBiases = evidence.map((e) => BIAS_VALUES[e.bias] ?? 0);
  const meanBias = allBiases.reduce((a, b) => a + b, 0) / allBiases.length;

  const seen = new Set<string>();
  for (const e of evidence) {
    if (seen.has(e.driverTitle)) continue;
    seen.add(e.driverTitle);
    const val = BIAS_VALUES[e.bias] ?? 0;
    if (Math.abs(val - meanBias) < 0.5) {
      consensusDrivers.push(e.driverTitle);
    } else {
      discordDrivers.push(e.driverTitle);
    }
  }

  const totalPairs = (categories.length * (categories.length - 1)) / 2;
  const conflictScore = totalPairs > 0
    ? Math.round((conflictingPairs.reduce((a, p) => a + p.severity, 0) / (totalPairs * 100)) * 100)
    : 0;

  let severity: ConflictResult["severity"];
  if (conflictScore === 0) severity = "None";
  else if (conflictScore < 20) severity = "Low";
  else if (conflictScore < 40) severity = "Moderate";
  else if (conflictScore < 65) severity = "High";
  else severity = "Extreme";

  const explanation = conflictingPairs.length > 0
    ? `Found ${conflictingPairs.length} conflicting pair(s). ${conflictingPairs.map((p) => p.explanation).join(". ")}.`
    : "All evidence categories are directionally aligned.";

  return {
    score: Math.min(100, conflictScore),
    severity,
    conflictingPairs,
    consensusDrivers,
    discordDrivers,
    explanation,
  };
}
