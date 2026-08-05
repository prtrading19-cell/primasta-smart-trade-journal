import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";
import type { Mt5PartialCloseFraction } from "@/lib/mt5";

export const dynamic = "force-dynamic";

interface ManageBody {
  action:
    | "close"
    | "partial"
    | "modify"
    | "breakeven"
    | "trail"
    | "reverse"
    | "duplicate"
    | "closeall";
  ticket?: number;
  volume?: number;
  fraction?: Mt5PartialCloseFraction;
  sl?: number | null;
  tp?: number | null;
  bufferPoints?: number;
  distancePoints?: number;
  filter?: "all" | "buy" | "sell" | "winners" | "losers";
}

export async function POST(request: Request) {
  let body: ManageBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    switch (body.action) {
      case "close":
        if (body.ticket == null) return NextResponse.json({ ok: false, error: "ticket is required" }, { status: 400 });
        return NextResponse.json(await manager.closePosition(body.ticket, body.volume), {
          headers: { "Cache-Control": "no-store" },
        });
      case "partial":
        if (body.ticket == null || body.fraction == null) {
          return NextResponse.json({ ok: false, error: "ticket and fraction are required" }, { status: 400 });
        }
        return NextResponse.json(await manager.partialClosePosition(body.ticket, body.fraction), {
          headers: { "Cache-Control": "no-store" },
        });
      case "modify":
        if (body.ticket == null) return NextResponse.json({ ok: false, error: "ticket is required" }, { status: 400 });
        return NextResponse.json(await manager.modifyPosition(body.ticket, body.sl ?? null, body.tp ?? null), {
          headers: { "Cache-Control": "no-store" },
        });
      case "breakeven":
        if (body.ticket == null) return NextResponse.json({ ok: false, error: "ticket is required" }, { status: 400 });
        return NextResponse.json(await manager.breakEvenPosition(body.ticket, body.bufferPoints ?? 0), {
          headers: { "Cache-Control": "no-store" },
        });
      case "trail":
        if (body.ticket == null || body.distancePoints == null) {
          return NextResponse.json({ ok: false, error: "ticket and distancePoints are required" }, { status: 400 });
        }
        return NextResponse.json(await manager.trailPosition(body.ticket, body.distancePoints), {
          headers: { "Cache-Control": "no-store" },
        });
      case "reverse":
        if (body.ticket == null) return NextResponse.json({ ok: false, error: "ticket is required" }, { status: 400 });
        return NextResponse.json(await manager.reversePosition(body.ticket), {
          headers: { "Cache-Control": "no-store" },
        });
      case "duplicate":
        if (body.ticket == null) return NextResponse.json({ ok: false, error: "ticket is required" }, { status: 400 });
        return NextResponse.json(await manager.duplicatePosition(body.ticket), {
          headers: { "Cache-Control": "no-store" },
        });
      case "closeall":
        return NextResponse.json(await manager.closeAllPositions(body.filter ?? "all"), {
          headers: { "Cache-Control": "no-store" },
        });
      default:
        return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Position management failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
