export interface BreadthParseRecord {
  exchange: string;
  advances: number;
  declines: number;
  newHighs: number;
  newLows: number;
  upVolume: number;
  downVolume: number;
  timestamp: string;
}

export function parseBreadthResponse(
  raw: unknown,
  targetExchange: string
): BreadthParseRecord | null {
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;

  const exchange = String(obj.exchange ?? targetExchange);
  const advances = toNumber(obj.advances);
  const declines = toNumber(obj.declines);
  const newHighs = toNumber(obj.newHighs);
  const newLows = toNumber(obj.newLows);
  const upVolume = toNumber(obj.upVolume);
  const downVolume = toNumber(obj.downVolume);

  if (advances === 0 && declines === 0) return null;

  return {
    exchange,
    advances,
    declines,
    newHighs,
    newLows,
    upVolume,
    downVolume,
    timestamp: String(obj.timestamp ?? new Date().toISOString().split("T")[0]),
  };
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
