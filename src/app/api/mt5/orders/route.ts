import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    const state = manager.getOverview().positions;
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        pending: state.pendingOrders,
        recent: [...state.closedOrders].slice(0, 20),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: "mt5/orders failed", message: e instanceof Error ? e.message : String(e) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
