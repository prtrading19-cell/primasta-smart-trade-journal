import { NextResponse } from "next/server";
import { getMt5AccountManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const accountId = typeof body.accountId === "string" ? body.accountId : null;
    if (!accountId) {
      return NextResponse.json({ ok: false, error: "accountId is required" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const manager = getMt5AccountManager();
    const result = await manager.switchAccount(accountId);
    return NextResponse.json(
      { ok: result.ok, message: result.message, status: result.status },
      { status: result.ok ? 200 : 400, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Switch account failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
