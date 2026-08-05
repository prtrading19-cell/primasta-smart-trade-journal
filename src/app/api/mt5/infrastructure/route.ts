import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    const url = new URL(request.url);
    const symbols = (url.searchParams.get("symbols") ?? "").split(",").filter(Boolean);
    const [venues, accounts, orderBook] = await Promise.all([
      Promise.resolve(manager.getVenueDescriptors()),
      Promise.resolve(manager.getAccounts()),
      manager.getOrderBookSnapshot(symbols),
    ]);
    return NextResponse.json(
      { ok: true, venues, accounts, orderBook },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load infrastructure" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
