import type { ResearchDriver, ResearchCategory, ResearchInstitutional, ResearchTechnical, ResearchBias } from "../models";
import type { EvidenceRecord } from "./types";

export function buildEvidenceRecords(
  drivers: ResearchDriver[],
  categories: ResearchCategory[],
  institutional: ResearchInstitutional,
  technical: ResearchTechnical,
  bias: ResearchBias
): EvidenceRecord[] {
  const records: EvidenceRecord[] = [];
  const now = new Date().toISOString();

  for (const driver of drivers) {
    records.push({
      id: `ev-${driver.driverId}`,
      category: driver.categoryId,
      driverId: driver.driverId,
      driverTitle: driver.driverTitle,
      bias: driver.bias,
      confidence: driver.confidence,
      source: driver.driverId,
      timestamp: now,
      value: driver.currentDataValue,
      interpretation: driver.reason,
      weight: driver.weight,
    });
  }

  for (const cat of categories) {
    records.push({
      id: `ev-cat-${cat.categoryId}`,
      category: "category",
      driverId: cat.categoryId,
      driverTitle: cat.categoryTitle,
      bias: cat.bias,
      confidence: cat.confidence,
      source: "category-engine",
      timestamp: now,
      value: `${cat.score}`,
      interpretation: cat.reason,
      weight: cat.weight,
    });
  }

  records.push({
    id: "ev-institutional",
    category: "institutional",
    driverId: "institutional",
    driverTitle: "Institutional Flow",
    bias: institutional.bias,
    confidence: institutional.confidence,
    source: "institutional-engine",
    timestamp: now,
    value: `${institutional.score}`,
    interpretation: institutional.summary,
    weight: 0.3,
  });

  records.push({
    id: "ev-technical",
    category: "technical",
    driverId: "technical",
    driverTitle: "Technical Analysis",
    bias: technical.bias,
    confidence: technical.confidence,
    source: "technical-engine",
    timestamp: now,
    value: `${technical.score}`,
    interpretation: technical.summary,
    weight: 0.25,
  });

  records.push({
    id: "ev-bias",
    category: "bias",
    driverId: "overall-bias",
    driverTitle: "Overall Bias",
    bias: bias.overallBias,
    confidence: bias.confidence,
    source: "bias-engine",
    timestamp: now,
    value: `${bias.overallScore}`,
    interpretation: `Alignment: ${bias.alignmentScore}%, Conflict: ${bias.conflictScore}%`,
    weight: 1.0,
  });

  return records;
}

export function getEvidenceByCategory(records: EvidenceRecord[]): Record<string, EvidenceRecord[]> {
  const grouped: Record<string, EvidenceRecord[]> = {};
  for (const record of records) {
    const cat = record.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(record);
  }
  return grouped;
}

export function countEvidenceByCategory(records: EvidenceRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of records) {
    counts[record.category] = (counts[record.category] ?? 0) + 1;
  }
  return counts;
}
