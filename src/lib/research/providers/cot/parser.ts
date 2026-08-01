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

const HEADER_MARKER = "Market and Exchange Names";

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
  if (line.includes(HEADER_MARKER)) return null;

  const cols = parseCSVLine(line);
  if (cols.length < 17) return null;

  const marketName = cols[0]?.trim() ?? "";
  const asOfDate = cols[2]?.trim() ?? "";
  const marketCode = (cols[3]?.trim() ?? "").replace(/\+$/, "").trim();

  if (!marketName || !asOfDate || !marketCode) return null;

  const toNum = (idx: number): number => {
    const val = cols[idx]?.trim();
    if (!val || val === "") return 0;
    const num = Number(val.replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  };

  const { name, exchange } = splitMarketName(marketName);

  return {
    marketCode,
    marketName: name,
    exchange,
    asOfDate,
    openInterest: toNum(7),
    noncommercialLong: toNum(8),
    noncommercialShort: toNum(9),
    commercialLong: toNum(11),
    commercialShort: toNum(12),
    nonreportableLong: toNum(15),
    nonreportableShort: toNum(16),
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }

  result.push(current);
  return result;
}

function splitMarketName(
  marketName: string
): { name: string; exchange: string } {
  const parts = marketName.split(" - ");
  if (parts.length < 2) {
    return { name: marketName, exchange: "" };
  }
  return {
    name: parts.slice(0, parts.length - 1).join(" - ").trim(),
    exchange: parts[parts.length - 1].trim(),
  };
}
