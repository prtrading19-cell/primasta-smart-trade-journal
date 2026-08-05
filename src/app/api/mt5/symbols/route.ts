import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    const symbols = await manager.getSymbols();
    return NextResponse.json({ ok: true, symbols, count: symbols.length }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load symbols" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
