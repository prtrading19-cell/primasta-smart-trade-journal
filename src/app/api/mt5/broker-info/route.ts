import { NextResponse } from "next/server";
import { getMt5AccountManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const broker = await getMt5AccountManager().brokerInfo();
    return NextResponse.json({ ok: true, broker }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load broker info" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
