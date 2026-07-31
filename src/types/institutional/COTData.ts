import type { ProviderMeta } from "./ProviderMeta";

export interface COTPositioningGroup {
  long: number;
  short: number;
  netLong: number;
  netShort: number;
  changeFromPrevious?: number;
  percentLong?: number;
  percentShort?: number;
}

export interface COTReportData {
  reportDate: string;
  assetId: string;
  contractName: string;
  contractCode: string;
  exchange: string;
  commercials: COTPositioningGroup;
  nonCommercials: COTPositioningGroup;
  managedMoney?: COTPositioningGroup;
  totalOpenInterest: number;
  meta: ProviderMeta;
}
