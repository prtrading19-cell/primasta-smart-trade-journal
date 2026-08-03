import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function POST() {
  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    const result = await manager.refresh();
    return NextResponse.json(
      { ok: true, connected: result.connected, account: result.account, positions: result.positions },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Refresh failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
