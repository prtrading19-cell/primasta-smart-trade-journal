import { NextResponse } from "next/server";
import { getMt5AccountManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const autoOnly = body.autoOnly === true;
    const result = await getMt5AccountManager().autoConnect(autoOnly);
    return NextResponse.json(
      { ok: result.ok, result },
      { status: result.ok ? 200 : 400, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Auto-connect failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
