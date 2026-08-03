import { NextResponse } from "next/server";
import { buildPortfolioIntelligence } from "@/lib/research/portfolio";
import { getTradeExecutionService } from "@/lib/trading";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "1";
  const assetIds = url.searchParams.get("assets")
    ? url.searchParams.get("assets")!.split(",").filter(Boolean)
    : undefined;

  try {
    const portfolio = await buildPortfolioIntelligence({ refresh, assetIds });
    const service = getTradeExecutionService();
    service.updatePortfolio(portfolio);

    const signals = service.generateSignals({ portfolio });
    const metrics = service.metrics();
    const history = service.historyEntries(100);
    const timeline = service.timelineEntries(50);
    const executions = service.records();
    const brokers = service.brokerSummary();
    const brokerHealth = await service.brokerHealth();
    const positions = await service.brokerPositions();
    const account = await service.brokerAccount();

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        portfolio,
        signals,
        metrics,
        history,
        timeline,
        brokers,
        brokerHealth,
        positions,
        account,
        executions,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        error: e instanceof Error ? e.message : "Failed to build trading overview",
        portfolio: null,
        signals: [],
        metrics: null,
        history: [],
        timeline: [],
        brokers: [],
        brokerHealth: {},
        positions: [],
        account: null,
        executions: [],
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
