import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";
import type { Mt5OrderType, Mt5PlaceRequest, Mt5ProposalSource } from "@/lib/mt5";

export const dynamic = "force-dynamic";

interface OrderBody {
  symbol: string;
  type: Mt5OrderType;
  volume: number;
  price?: number | null;
  sl?: number | null;
  tp?: number | null;
  stopLimit?: number | null;
  fillPolicy?: Mt5PlaceRequest["fillPolicy"];
  timePolicy?: Mt5PlaceRequest["timePolicy"];
  expiration?: string | null;
  magic?: number;
  deviation?: number;
  comment?: string;
  riskPercent?: number | null;
  source?: Mt5ProposalSource;
  signalId?: string | null;
}

export async function POST(request: Request) {
  let body: OrderBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.symbol || !body.type || !body.volume) {
    return NextResponse.json(
      { ok: false, error: "symbol, type and volume are required" },
      { status: 400 }
    );
  }

  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    const result = await manager.submitOrder({
      request: {
        symbol: body.symbol.toUpperCase(),
        type: body.type,
        volume: body.volume,
        price: body.price ?? null,
        sl: body.sl ?? null,
        tp: body.tp ?? null,
        stopLimit: body.stopLimit ?? null,
        fillPolicy: body.fillPolicy,
        timePolicy: body.timePolicy,
        expiration: body.expiration ?? null,
        magic: body.magic ?? 190624,
        deviation: body.deviation ?? 20,
        comment: body.comment ?? "PRIMASTA",
        riskPercent: body.riskPercent ?? null,
      },
      signalId: body.signalId ?? null,
      source: body.source ?? "manual",
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
      { ok: false, error: e instanceof Error ? e.message : "Failed to create trade proposal" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
