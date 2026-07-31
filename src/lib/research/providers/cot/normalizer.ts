import type { COTReportData, COTPositioningGroup } from "@/types/institutional";
import { buildProviderMeta } from "@/types/institutional";
import type { CFTCParseRecord } from "./parser";
import type { COTMarketConfig } from "./cftcProvider";

export function normalizeCOTRecord(
  record: CFTCParseRecord,
  market: COTMarketConfig,
  source: string
): COTReportData {
  const commercials: COTPositioningGroup = {
    long: record.commercialLong,
    short: record.commercialShort,
    netLong: record.commercialLong - record.commercialShort,
    netShort: record.commercialShort - record.commercialLong,
    percentLong: computePercent(record.commercialLong, record.openInterest),
    percentShort: computePercent(record.commercialShort, record.openInterest),
  };

  const nonCommercials: COTPositioningGroup = {
    long: record.noncommercialLong,
    short: record.noncommercialShort,
    netLong: record.noncommercialLong - record.noncommercialShort,
    netShort: record.noncommercialShort - record.noncommercialLong,
    percentLong: computePercent(record.noncommercialLong, record.openInterest),
    percentShort: computePercent(record.noncommercialShort, record.openInterest),
  };

  return {
    reportDate: record.asOfDate,
    assetId: market.assetId,
    contractName: record.marketName,
    contractCode: record.marketCode,
    exchange: record.exchange,
    commercials,
    nonCommercials,
    managedMoney: undefined,
    totalOpenInterest: record.openInterest,
    meta: buildProviderMeta(source, "live"),
  };
}

function computePercent(value: number, total: number): number | undefined {
  if (total <= 0) return undefined;
  return Math.round((value / total) * 1000) / 10;
}
