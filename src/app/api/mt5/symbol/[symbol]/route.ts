import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: { symbol: string } }) {
  const symbol = context.params.symbol.toUpperCase();
  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    const [spec, tick] = await Promise.all([
      manager.getSymbolSpec(symbol),
      manager.getTick(symbol),
    ]);
    if (!spec) {
      return NextResponse.json(
        { ok: false, error: `Symbol ${symbol} is not available or not tradeable` },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json({ ok: true, symbol: spec, tick }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : `Failed to load ${symbol}` },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
