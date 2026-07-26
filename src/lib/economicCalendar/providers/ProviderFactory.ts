import type { EconomicCalendarProvider, ProviderName } from "./EconomicCalendarProvider";
import { ForexFactoryProvider } from "./ForexFactoryProvider";
import { TradingEconomicsProvider } from "./TradingEconomicsProvider";
import { FMPProvider } from "./FMPProvider";

let cachedProvider: EconomicCalendarProvider | null = null;

function resolveProviderName(): ProviderName {
  const raw = (process.env.ECONOMIC_PROVIDER ?? "forexfactory").toLowerCase().trim();
  if (raw === "tradingeconomics" || raw === "trading-economics") return "tradingeconomics";
  if (raw === "fmp") return "fmp";
  return "forexfactory";
}

function createProvider(name: ProviderName): EconomicCalendarProvider {
  switch (name) {
    case "tradingeconomics":
      return new TradingEconomicsProvider();
    case "fmp":
      return new FMPProvider();
    case "forexfactory":
    default:
      return new ForexFactoryProvider();
  }
}

export function getProvider(): EconomicCalendarProvider {
  if (cachedProvider) return cachedProvider;
  const name = resolveProviderName();
  cachedProvider = createProvider(name);
  console.log(`[ProviderFactory] Active provider: ${name}`);
  return cachedProvider;
}

export function resetProvider(): void {
  cachedProvider = null;
}
