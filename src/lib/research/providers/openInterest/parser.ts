export interface OIParseRecord {
  symbol: string;
  name: string;
  openInterest: number;
  previousOI: number;
  exchange: string;
  reportDate: string;
}

export interface OIParseResult {
  records: OIParseRecord[];
  source: string;
  fetchedAt: string;
}

export function parseOIResponse(
  raw: unknown,
  source: string
): OIParseResult {
  if (!Array.isArray(raw)) {
    return { records: [], source, fetchedAt: new Date().toISOString() };
  }

  const records: OIParseRecord[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;

    const obj = item as Record<string, unknown>;
    const symbol = String(obj.symbol ?? "");
    if (!symbol) continue;

    const currentOI = Number(obj.openInterest ?? 0);
    const previousOI = Number(obj.previousOpenInterest ?? obj.change ?? 0);

    records.push({
      symbol,
      name: String(obj.name ?? obj.companyName ?? symbol),
      openInterest: currentOI,
      previousOI,
      exchange: String(obj.exchange ?? "Unknown"),
      reportDate: String(obj.timestamp ?? obj.date ?? new Date().toISOString().split("T")[0]),
    });
  }

  return { records, source, fetchedAt: new Date().toISOString() };
}
