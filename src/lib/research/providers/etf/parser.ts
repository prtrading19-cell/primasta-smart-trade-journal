export interface ETFParseRecord {
  symbol: string;
  name: string;
  totalAssets: number;
  netAssetValue: number;
  sharesOutstanding: number;
  flowValue: number;
  flowDirection: string;
}

export interface ETFParseResult {
  records: ETFParseRecord[];
  source: string;
  fetchedAt: string;
}

export function parseETFResponse(
  raw: unknown,
  source: string
): ETFParseResult {
  if (!Array.isArray(raw)) {
    return { records: [], source, fetchedAt: new Date().toISOString() };
  }

  const records: ETFParseRecord[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;

    const obj = item as Record<string, unknown>;
    const symbol = String(obj.symbol ?? "");
    if (!symbol) continue;

    records.push({
      symbol,
      name: String(obj.name ?? obj.companyName ?? symbol),
      totalAssets: Number(obj.totalAssets ?? obj.marketCap ?? 0),
      netAssetValue: Number(obj.nav ?? obj.price ?? 0),
      sharesOutstanding: Number(obj.sharesOutstanding ?? 0),
      flowValue: Number(obj.flowValue ?? 0),
      flowDirection: String(obj.flowDirection ?? "Flat"),
    });
  }

  return { records, source, fetchedAt: new Date().toISOString() };
}
