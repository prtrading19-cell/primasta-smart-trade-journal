import { NextResponse } from "next/server";
import { getMt5AccountManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const terminal = await getMt5AccountManager().terminalInfo();
    return NextResponse.json({ ok: true, terminal }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load terminal info" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
