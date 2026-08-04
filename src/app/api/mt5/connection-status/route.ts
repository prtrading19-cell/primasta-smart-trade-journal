import { NextResponse } from "next/server";
import { getMt5AccountManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const manager = getMt5AccountManager();
    const [status, session] = await Promise.all([manager.connectionStatus(), Promise.resolve(manager.getSession())]);
    return NextResponse.json({ ok: true, status, session }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load connection status" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
