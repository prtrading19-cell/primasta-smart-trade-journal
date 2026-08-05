import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    return NextResponse.json(
      { ok: true, groups: manager.getExecutionGroups() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load execution groups" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
