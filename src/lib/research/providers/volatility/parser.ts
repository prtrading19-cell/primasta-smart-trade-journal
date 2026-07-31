export interface VolParseRecord {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export function parseVolResponse(
  raw: unknown,
  timestamp: string
): VolParseRecord[] {
  if (!raw || (typeof raw !== "object")) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is Record<string, unknown> =>
        item !== null && typeof item === "object"
      )
      .map((item) => extractRecord(item, timestamp))
      .filter((r): r is VolParseRecord => r !== null);
  }

  const single = extractRecord(raw as Record<string, unknown>, timestamp);
  return single ? [single] : [];
}

function extractRecord(
  item: Record<string, unknown>,
  timestamp: string
): VolParseRecord | null {
  const symbol = String(item.symbol ?? "");
  if (!symbol) return null;

  const price = parseFloat(String(item.close ?? item.price ?? ""));
  if (isNaN(price) || price <= 0) return null;

  return {
    symbol,
    name: String(item.name ?? symbol),
    price,
    change: parseFloat(String(item.change ?? "0")) || 0,
    changePercent: parseFloat(String(item.percent_change ?? item.changesPercentage ?? "0")) || 0,
    timestamp,
  };
}
