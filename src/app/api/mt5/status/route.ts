import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    await manager.heartbeat();
    return NextResponse.json(manager.getStatus(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "mt5/status failed", message: e instanceof Error ? e.message : String(e) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
