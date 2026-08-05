import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

interface ManageBody {
  action: "modify" | "delete" | "activate";
  ticket?: number;
  price?: number | null;
  sl?: number | null;
  tp?: number | null;
}

export async function POST(request: Request) {
  let body: ManageBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.action || body.ticket == null) {
    return NextResponse.json({ ok: false, error: "action and ticket are required" }, { status: 400 });
  }

  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    switch (body.action) {
      case "modify":
        return NextResponse.json(await manager.modifyPendingOrder(body.ticket, body.price ?? null, body.sl ?? null, body.tp ?? null), {
          headers: { "Cache-Control": "no-store" },
        });
      case "delete":
        return NextResponse.json(await manager.deletePendingOrder(body.ticket), {
          headers: { "Cache-Control": "no-store" },
        });
      case "activate":
        return NextResponse.json(await manager.activatePendingOrder(body.ticket), {
          headers: { "Cache-Control": "no-store" },
        });
      default:
        return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Pending order management failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
