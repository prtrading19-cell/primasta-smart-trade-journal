import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";
import type {
  Mt5BasketRequest,
  Mt5BracketRequest,
  Mt5ExecutionGroupMode,
  Mt5OcoRequest,
  Mt5ScaleInRequest,
  Mt5ScaleOutRequest,
} from "@/lib/mt5";

export const dynamic = "force-dynamic";

interface StrategyBody {
  mode: Mt5ExecutionGroupMode;
  bracket?: Mt5BracketRequest;
  oco?: Mt5OcoRequest;
  scaleIn?: Mt5ScaleInRequest;
  scaleOut?: Mt5ScaleOutRequest;
  basket?: Mt5BasketRequest;
}

export async function POST(request: Request) {
  let body: StrategyBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.mode) {
    return NextResponse.json({ ok: false, error: "mode is required" }, { status: 400 });
  }

  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    switch (body.mode) {
      case "bracket":
        return NextResponse.json(await manager.submitBracketOrder(body.bracket ?? { symbol: "", legs: [] }), {
          headers: { "Cache-Control": "no-store" },
        });
      case "oco":
        if (!body.oco?.symbol || !body.oco.first || !body.oco.second) {
          return NextResponse.json({ ok: false, error: "oco requires symbol, first and second legs" }, { status: 400 });
        }
        return NextResponse.json(await manager.submitOcoOrder(body.oco), {
          headers: { "Cache-Control": "no-store" },
        });
      case "scale-in":
        if (!body.scaleIn?.symbol || !body.scaleIn.tranches?.length) {
          return NextResponse.json({ ok: false, error: "scaleIn requires symbol and tranches" }, { status: 400 });
        }
        return NextResponse.json(await manager.submitScaleInOrder(body.scaleIn), {
          headers: { "Cache-Control": "no-store" },
        });
      case "scale-out":
        if (body.scaleOut?.ticket == null || !body.scaleOut.levels?.length) {
          return NextResponse.json({ ok: false, error: "scaleOut requires ticket and levels" }, { status: 400 });
        }
        return NextResponse.json(await manager.submitScaleOutOrder(body.scaleOut), {
          headers: { "Cache-Control": "no-store" },
        });
      case "basket":
        if (!body.basket?.legs?.length) {
          return NextResponse.json({ ok: false, error: "basket requires legs" }, { status: 400 });
        }
        return NextResponse.json(await manager.submitBasketOrder(body.basket), {
          headers: { "Cache-Control": "no-store" },
        });
      default:
        return NextResponse.json({ ok: false, error: "Unknown strategy mode" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Strategy submission failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
