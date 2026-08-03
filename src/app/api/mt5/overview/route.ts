import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    return NextResponse.json(manager.getOverview(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        error: e instanceof Error ? e.message : "mt5/overview failed",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
