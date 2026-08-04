import { NextResponse } from "next/server";
import { getMt5AccountManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const manager = getMt5AccountManager();
    const result = await manager.testConnection({
      accountId: typeof body.accountId === "string" ? body.accountId : undefined,
      login: typeof body.login === "number" ? body.login : typeof body.login === "string" ? Number(body.login) || null : null,
      password: typeof body.password === "string" ? body.password : undefined,
      investorPassword: typeof body.investorPassword === "string" ? body.investorPassword : undefined,
      server: typeof body.server === "string" ? body.server : undefined,
      terminalPath: typeof body.terminalPath === "string" ? body.terminalPath : undefined,
    });
    return NextResponse.json({ ok: result.ok, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Test connection failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
