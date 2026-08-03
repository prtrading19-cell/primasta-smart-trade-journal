import { NextResponse } from "next/server";
import { buildPortfolioIntelligence } from "@/lib/research/portfolio";
import { getTradeExecutionService } from "@/lib/trading";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    signalId?: string;
    mode?: "paper" | "simulation" | "live";
    orderType?: "MARKET" | "LIMIT" | "STOP";
    entryPrice?: number;
    stop?: number;
    takeProfit?: number;
    force?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.signalId) {
    return NextResponse.json({ ok: false, error: "signalId is required" }, { status: 400 });
  }

  const mode = body.mode ?? "paper";
  if (mode === "live") {
    return NextResponse.json(
      { ok: false, error: "Live trading is disabled in this build" },
      { status: 403 }
    );
  }

  try {
    const portfolio = await buildPortfolioIntelligence({});
    const service = getTradeExecutionService();
    service.updatePortfolio(portfolio);

    const signals = service.generateSignals({ portfolio });
    const signal = signals.find((s) => s.id === body.signalId);
    if (!signal) {
      return NextResponse.json(
        { ok: false, error: `Signal ${body.signalId} not found` },
        { status: 404 }
      );
    }

    const result = await service.execute(signal, {
      portfolio,
      mode,
      orderType: body.orderType,
      entryPrice: body.entryPrice,
      stop: body.stop,
      takeProfit: body.takeProfit,
      force: body.force,
    });

    return NextResponse.json(
      {
        ok: true,
        signalId: signal.id,
        record: result.record,
        rejectedReasons: result.rejectedReasons,
        error: result.error,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Execution failed",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
