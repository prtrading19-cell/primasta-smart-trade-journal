import React from "react";
import React from "react";
import { renderToString } from "react-dom/server";
import { MarketOverviewCard } from "./src/components/research/sections/MarketOverviewCard";

const badIndex = {
  symbol: "^NDX",
  name: "NASDAQ-100",
  price: "18500.50",
  change: "120.30",
  changePercent: "0.65",
  open: "18400.00",
  high: "18600.00",
  low: "18350.00",
  previousClose: "18380.20",
  volume: 3200000000,
  timestamp: new Date().toISOString(),
  meta: { status: "live", source: "FMP", timestamp: new Date().toISOString(), lastUpdated: new Date().toISOString() },
};

console.log("Rendering MarketOverviewCard with string numeric fields...");
try {
  const html = renderToString(<MarketOverviewCard index={badIndex} />);
  console.log("OK (first 300 chars):", html.slice(0, 300));
} catch (err) {
  console.error("FAILED:", err);
}
