import { buildUS100TechnicalInput, buildUS100InstitutionalInput, buildUS100AIContext } from "./src/lib/research/us100";
import { mapUS100DataToEngine, buildUS100MacroContext } from "./src/lib/research/us100/us100DataMapper";
import type { US100FullDataset } from "./src/lib/research/us100/us100DataOrchestrator";

const mockDataset: US100FullDataset = {
  index: {
    symbol: "^NDX",
    name: "NASDAQ-100",
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    high: 0,
    low: 0,
    previousClose: 0,
    volume: 0,
    timestamp: new Date().toISOString(),
    meta: { status: "unavailable", source: "FMP", timestamp: new Date().toISOString(), lastUpdated: new Date().toISOString(), error: "Provider unavailable" },
  },
  stocks: [],
  earnings: [],
  sectors: {
    technology: 0,
    semiconductors: 0,
    healthcare: 0,
    financials: 0,
    industrials: 0,
    energy: 0,
    utilities: 0,
    consumer: 0,
    communication: 0,
    realEstate: 0,
    meta: { status: "unavailable", source: "FMP", timestamp: new Date().toISOString(), lastUpdated: new Date().toISOString(), error: "Provider unavailable" },
  },
  movers: {
    topGainers: [],
    topLosers: [],
    mostActive: [],
    meta: { status: "unavailable", source: "FMP", timestamp: new Date().toISOString(), lastUpdated: new Date().toISOString(), error: "Provider unavailable" },
  },
  volatility: {
    vix: null,
    vixChange: null,
    vixChangePercent: null,
    vxn: null,
    vxnChange: null,
    vxnChangePercent: null,
    trend: "Normal",
    riskRating: "Moderate",
    meta: { status: "unavailable", source: "FMP", timestamp: new Date().toISOString(), lastUpdated: new Date().toISOString(), error: "Provider unavailable" },
  },
  profiles: [],
  marketBreadth: {
    advanceDecline: "0-0",
    newHighs: 0,
    newLows: 0,
    breadthScore: 0,
    overallHealth: "Critical",
    meta: { status: "unavailable", source: "composite", timestamp: new Date().toISOString(), lastUpdated: new Date().toISOString(), error: "Source data unavailable" },
  },
  derivedIndex: {
    symbol: "^NDX",
    name: "NASDAQ-100 (Derived)",
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    high: 0,
    low: 0,
    previousClose: 0,
    volume: 0,
    timestamp: new Date().toISOString(),
    meta: { status: "unavailable", source: "composite", timestamp: new Date().toISOString(), lastUpdated: new Date().toISOString(), error: "Source data unavailable" },
  },
  collectedAt: new Date().toISOString(),
  sourceSummary: [],
  errors: [],
};

console.log("Testing buildUS100TechnicalInput...");
try {
  const tech = buildUS100TechnicalInput(mockDataset);
  console.log("OK:", JSON.stringify(tech, null, 2));
} catch (err) {
  console.error("FAILED:", err);
}

console.log("\nTesting buildUS100InstitutionalInput...");
try {
  const inst = buildUS100InstitutionalInput(mockDataset);
  console.log("OK:", JSON.stringify(inst, null, 2));
} catch (err) {
  console.error("FAILED:", err);
}

console.log("\nTesting buildUS100AIContext...");
try {
  const ai = buildUS100AIContext(mockDataset);
  console.log("OK:", ai.slice(0, 200));
} catch (err) {
  console.error("FAILED:", err);
}

console.log("\nTesting mapUS100DataToEngine...");
try {
  const drivers = mapUS100DataToEngine(mockDataset);
  console.log("OK: drivers count =", drivers.length);
} catch (err) {
  console.error("FAILED:", err);
}

console.log("\nTesting buildUS100MacroContext...");
try {
  const macro = buildUS100MacroContext(mockDataset);
  console.log("OK:", macro);
} catch (err) {
  console.error("FAILED:", err);
}
