import { NextResponse } from "next/server";
import { buildPortfolioIntelligence } from "@/lib/research/portfolio";
import { getTradeExecutionService } from "@/lib/trading";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";
import type { Mt5OrderType } from "@/lib/mt5";

export const dynamic = "force-dynamic";

interface ExecuteBody {
  signalId?: string;
  volume?: number;
  price?: number;
  orderType?: "MARKET" | "LIMIT" | "STOP";
  sl?: number;
  tp?: number;
  comment?: string;
  source?: "research" | "portfolio" | "manual";
  symbol?: string;
  direction?: "buy" | "sell";
}

function mapOrderType(orderType: ExecuteBody["orderType"], direction: "buy" | "sell"): Mt5OrderType {
  if (orderType === "LIMIT") return direction === "sell" ? "sell-limit" : "buy-limit";
  if (orderType === "STOP") return direction === "sell" ? "sell-stop" : "buy-stop";
  return direction === "sell" ? "sell" : "buy";
}

export async function POST(request: Request) {
  let body: ExecuteBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  ensureMt5Broker();
  const manager = getMt5BrokerManager();

  let symbol: string | null = null;
  let direction: "buy" | "sell" | null = null;
  let volume: number | null = null;
  let riskPercent: number | null = null;
  let signalId: string | null = null;
  let source: ExecuteBody["source"] = body.source ?? "research";

  try {
    if (body.signalId) {
      const portfolio = await buildPortfolioIntelligence({});
      const service = getTradeExecutionService();
      service.updatePortfolio(portfolio);
      const signal = service.generateSignals({ portfolio }).find((s) => s.id === body.signalId);
      if (!signal) {
        return NextResponse.json(
          { ok: false, error: `Signal ${body.signalId} not found` },
          { status: 404, headers: { "Cache-Control": "no-store" } }
        );
      }
      const sizing = service.size(signal);
      symbol = signal.symbol;
      direction = signal.direction === "sell" ? "sell" : "buy";
      volume = body.volume ?? sizing.lots;
      riskPercent = sizing.riskPercent;
      signalId = signal.id;
      source = body.source ?? (signal.source === "portfolio" ? "portfolio" : "research");
    } else if (body.symbol && body.direction && body.volume) {
      symbol = body.symbol.toUpperCase();
      direction = body.direction;
      volume = body.volume;
      riskPercent = null;
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: "Provide signalId OR symbol + direction + volume to create a trade proposal",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const result = await manager.submitOrder({
      request: {
        symbol,
        type: mapOrderType(body.orderType, direction),
        volume,
        price: body.price ?? null,
        sl: body.sl ?? null,
        tp: body.tp ?? null,
        comment: body.comment ?? "PRIMASTA",
        riskPercent,
      },
      signalId,
      source,
    });

    if (!result.created || !result.proposal) {
      return NextResponse.json(
        { ok: false, error: result.error ?? "Failed to create trade proposal" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        proposal: result.proposal,
        safety: result.proposal.safety,
        message: `Trade proposal ${result.proposal.id} created — requires manual approval before transmission`,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to create trade proposal",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
