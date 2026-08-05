import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

interface ApproveBody {
  groupId: string;
  note?: string | null;
}

export async function POST(request: Request) {
  let body: ApproveBody;
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
    const result = await manager.approveExecutionGroup(body.groupId, body.note ?? null);
    return NextResponse.json(
      {
        ok: result.ok,
        results: result.results,
        group: result.group,
        error: result.error,
        message:
          result.results.length === 0
            ? "Group approved"
            : `${result.results.filter((r) => r.ok).length}/${result.results.length} legs transmitted`,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Group approval failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
