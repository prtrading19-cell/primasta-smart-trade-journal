import { buildUS100TechnicalInput, buildUS100InstitutionalInput } from "./src/lib/research/us100";

const liveDataset = {
  index: {
    symbol: "^NDX",
    name: "NASDAQ-100",
    price: "18500.50" as any,
    change: "120.30" as any,
    changePercent: "0.65" as any,
    open: "18400.00" as any,
    high: "18600.00" as any,
    low: "18350.00" as any,
    previousClose: "18380.20" as any,
    volume: 3200000000 as any,
    timestamp: new Date().toISOString(),
    meta: { status: "live" as const, source: "FMP", timestamp: new Date().toISOString(), lastUpdated: new Date().toISOString() },
  },
  stocks: [],
  earnings: [],
  sectors: {
    technology: 0, semiconductors: 0, healthcare: 0, financials: 0,
    industrials: 0, energy: 0, utilities: 0, consumer: 0, communication: 0, realEstate: 0,
    meta: { status: "unavailable" as const, source: "FMP", timestamp: new Date().toISOString(), lastUpdated: new Date().toISOString(), error: "Provider unavailable" },
  },
  movers: {
    topGainers: [], topLosers: [], mostActive: [],
    meta: { status: "unavailable" as const, source: "FMP", timestamp: new Date().toISOString(), lastUpdated: new Date().toISOString(), error: "Provider unavailable" },
  },
  volatility: {
    vix: null, vixChange: null, vixChangePercent: null,
    vxn: null, vxnChange: null, vxnChangePercent: null,
    trend: "Normal" as const, riskRating: "Moderate" as const,
    meta: { status: "unavailable" as const, source: "FMP", timestamp: new Date().toISOString(), lastUpdated: new Date().toISOString(), error: "Provider unavailable" },
  },
  profiles: [],
  marketBreadth: {
    advanceDecline: "0-0", newHighs: 0, newLows: 0, breadthScore: 0, overallHealth: "Critical" as const,
    meta: { status: "unavailable" as const, source: "composite", timestamp: new Date().toISOString(), lastUpdated: new Date().toISOString(), error: "Source data unavailable" },
  },
  derivedIndex: {
    symbol: "^NDX", name: "NASDAQ-100", price: 0, change: 0, changePercent: 0,
    open: 0, high: 0, low: 0, previousClose: 0, volume: 0, timestamp: new Date().toISOString(),
    meta: { status: "unavailable" as const, source: "composite", timestamp: new Date().toISOString(), lastUpdated: new Date().toISOString(), error: "Source data unavailable" },
  },
  collectedAt: new Date().toISOString(),
  sourceSummary: [],
  errors: [],
} as any;

console.log("Testing with string-valued numeric fields on live index...");
try {
  const tech = buildUS100TechnicalInput(liveDataset);
  console.log("buildUS100TechnicalInput OK");
} catch (err) {
  console.error("buildUS100TechnicalInput FAILED:", err);
}

try {
  const inst = buildUS100InstitutionalInput(liveDataset);
  console.log("buildUS100InstitutionalInput OK");
} catch (err) {
  console.error("buildUS100InstitutionalInput FAILED:", err);
}
