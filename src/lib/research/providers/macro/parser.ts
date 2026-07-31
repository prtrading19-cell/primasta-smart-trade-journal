export interface MacroParseRecord {
  id: string;
  name: string;
  value: number;
  previous: number;
  forecast: number | null;
  surprise: number | null;
  unit: string;
  impact: "High" | "Medium" | "Low";
  releaseDate: string;
  nextRelease: string | null;
}

export interface FREDObservation {
  date: string;
  value: string;
}

export interface FREDResponse {
  observations?: FREDObservation[];
}

export function parseTDQuote(
  raw: unknown
): MacroParseRecord[] {
  if (typeof raw !== "object" || raw === null) return [];

  const items = Array.isArray(raw) ? raw : [raw];
  const records: MacroParseRecord[] = [];
  const now = new Date().toISOString().split("T")[0];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;

    const obj = item as Record<string, unknown>;
    const symbol = String(obj.symbol ?? "");
    if (!symbol) continue;

    const price = parseFloat(String(obj.close ?? obj.price ?? ""));
    if (isNaN(price)) continue;

    const prevClose = parseFloat(String(obj.previous_close ?? "0")) || 0;

    records.push({
      id: symbol,
      name: String(obj.name ?? symbol),
      value: price,
      previous: prevClose,
      forecast: null,
      surprise: null,
      unit: symbol.includes("DX") ? "points" : "%",
      impact: "Medium",
      releaseDate: now,
      nextRelease: null,
    });
  }

  return records;
}

export function parseFREDResponse(
  raw: unknown,
  config: { seriesId: string; name: string; unit: string; impact: "High" | "Medium" | "Low" }
): MacroParseRecord | null {
  if (!raw || typeof raw !== "object") return null;

  const resp = raw as FREDResponse;
  if (!Array.isArray(resp.observations) || resp.observations.length === 0) return null;

  const filtered = resp.observations.filter(
    (o) => o.value !== "." && o.value !== ""
  );

  if (filtered.length === 0) return null;

  const latest = filtered[filtered.length - 1];
  const prev = filtered.length >= 2 ? filtered[filtered.length - 2] : null;

  const value = parseFloat(latest.value);
  if (isNaN(value)) return null;

  const previous = prev ? parseFloat(prev.value) : value;
  const forecast = null;
  const surprise = null;

  return {
    id: config.seriesId,
    name: config.name,
    value,
    previous: isNaN(previous) ? value : previous,
    forecast,
    surprise,
    unit: config.unit,
    impact: config.impact,
    releaseDate: latest.date,
    nextRelease: null,
  };
}
