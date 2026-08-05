import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

interface CancelBody {
  groupId: string;
  note?: string | null;
}

export async function POST(request: Request) {
  let body: CancelBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.groupId) {
    return NextResponse.json({ ok: false, error: "groupId is required" }, { status: 400 });
  }

  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    const result = await manager.cancelExecutionGroup(body.groupId, body.note ?? null);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Group cancellation failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
