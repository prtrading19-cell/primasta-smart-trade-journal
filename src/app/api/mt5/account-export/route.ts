import { NextResponse } from "next/server";
import { getMt5AccountManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getMt5AccountManager().exportAccounts();
    if (!payload) {
      return NextResponse.json({ ok: false, error: "Export failed" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ok: true, payload }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Export failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
