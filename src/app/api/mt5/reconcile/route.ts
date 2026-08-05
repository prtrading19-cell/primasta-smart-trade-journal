import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function POST() {
  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    const result = await manager.reconcileExecutionGroups();
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Reconciliation failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
