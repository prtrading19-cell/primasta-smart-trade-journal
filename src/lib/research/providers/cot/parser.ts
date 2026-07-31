export interface CFTCParseRecord {
  marketCode: string;
  marketName: string;
  exchange: string;
  asOfDate: string;
  openInterest: number;
  noncommercialLong: number;
  noncommercialShort: number;
  commercialLong: number;
  commercialShort: number;
  nonreportableLong: number;
  nonreportableShort: number;
}

export function parseCFTCFile(rawText: string): CFTCParseRecord[] {
  const lines = rawText.split(/\r?\n/);
  const records: CFTCParseRecord[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const record = parseLine(trimmed);
    if (record) {
      records.push(record);
    }
  }

  return records;
}

function parseLine(line: string): CFTCParseRecord | null {
  const cols = line.split("|");
  if (cols.length < 11) return null;

  const marketField = cols[0]?.trim() ?? "";
  const marketParts = parseMarketField(marketField);
  if (!marketParts) return null;

  const asOfDate = cols[1]?.trim() ?? "";
  if (!asOfDate) return null;

  const toNum = (idx: number): number => {
    const val = cols[idx]?.trim();
    if (!val || val === "") return 0;
    const num = Number(val.replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  };

  return {
    marketCode: marketParts.code,
    marketName: marketParts.name,
    exchange: marketParts.exchange,
    asOfDate,
    openInterest: toNum(2),
    noncommercialLong: toNum(3),
    noncommercialShort: toNum(4),
    commercialLong: toNum(6),
    commercialShort: toNum(7),
    nonreportableLong: toNum(11),
    nonreportableShort: toNum(12),
  };
}

interface MarketParts {
  code: string;
  name: string;
  exchange: string;
}

function parseMarketField(field: string): MarketParts | null {
  const parts = field.split("-").map((p) => p.trim());
  if (parts.length < 2) return null;

  const code = parts[0];
  const name = parts.length >= 2 ? parts.slice(1, parts.length - 1).join(" ") : parts[1];
  const exchange = parts.length >= 3 ? parts[parts.length - 1] : "";

  return { code, name, exchange };
}
