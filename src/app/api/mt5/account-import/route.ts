import { NextResponse } from "next/server";
import { getMt5AccountManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (!payload || typeof payload !== "object" || !Array.isArray((payload as { accounts?: unknown }).accounts)) {
      return NextResponse.json({ ok: false, error: "Invalid export payload — expected { version, accounts: [...] }" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const { imported, error } = await getMt5AccountManager().importAccounts(payload);
    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ok: true, imported }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Import failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
