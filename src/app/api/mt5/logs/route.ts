import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager, getMt5Logger } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  ensureMt5Broker();
  getMt5BrokerManager();
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? 40)));
    const logs = category
      ? getMt5Logger().getByCategory(category as Parameters<ReturnType<typeof getMt5Logger>["getByCategory"]>[0], limit)
      : getMt5Logger().getRecent(limit);
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        stats: getMt5Logger().getStats(),
        logs,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: "mt5/logs failed", message: e instanceof Error ? e.message : String(e) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
