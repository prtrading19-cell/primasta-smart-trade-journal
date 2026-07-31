export interface SectorQuoteResponse {
  symbol: string;
  name: string;
  close: string;
  change: string;
  percent_change: string;
  volume: string;
}

export interface SectorParseRecord {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number | null;
  timestamp: string;
}

export function parseSectorQuotes(
  raw: SectorQuoteResponse[] | SectorQuoteResponse,
  timestamp: string
): SectorParseRecord[] {
  const arr = Array.isArray(raw) ? raw : [raw];

  return arr
    .filter((q) => q && typeof q === "object")
    .map((q) => {
      const price = parseFloat(q.close);
      const change = parseFloat(q.change) || 0;
      const changePercent = parseFloat(q.percent_change) || 0;
      const volume = parseInt(q.volume, 10) || 0;

      return {
        symbol: q.symbol,
        name: q.name || q.symbol,
        price: isNaN(price) ? 0 : price,
        change,
        changePercent,
        volume: volume > 0 ? volume : null,
        timestamp,
      };
    })
    .filter((r) => r.symbol);
}
