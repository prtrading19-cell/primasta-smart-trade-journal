import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

interface ScaleOutTriggerBody {
  groupId: string;
  fraction: number;
}

export async function POST(request: Request) {
  let body: ScaleOutTriggerBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.groupId) {
    return NextResponse.json({ ok: false, error: "groupId is required" }, { status: 400 });
  }
  if (typeof body.fraction !== "number" || body.fraction <= 0 || body.fraction > 1) {
    return NextResponse.json(
      { ok: false, error: "fraction must be a number in (0, 1]" },
      { status: 400 }
    );
  }

  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    const result = await manager.triggerScaleOut(body.groupId, body.fraction);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Scale-out trigger failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
