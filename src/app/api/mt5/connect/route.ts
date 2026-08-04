import { NextResponse } from "next/server";
import { getMt5AccountManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const manager = getMt5AccountManager();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const accountId = typeof body.accountId === "string" ? body.accountId : null;

    let result: { ok: boolean; message: string; status: unknown };
    if (accountId) {
      result = await manager.switchAccount(accountId);
    } else if (typeof body.login === "number" || typeof body.login === "string") {
      result = await manager.connect({
        login: typeof body.login === "number" ? body.login : Number(body.login) || null,
        password: typeof body.password === "string" ? body.password : undefined,
        investorPassword: typeof body.investorPassword === "string" ? body.investorPassword : undefined,
        server: typeof body.server === "string" ? body.server : undefined,
        terminalPath: typeof body.terminalPath === "string" ? body.terminalPath : undefined,
        remember: typeof body.remember === "boolean" ? body.remember : undefined,
        name: typeof body.name === "string" ? body.name : undefined,
        readOnly: typeof body.readOnly === "boolean" ? body.readOnly : undefined,
        autoConnect: typeof body.autoConnect === "boolean" ? body.autoConnect : undefined,
        demo: typeof body.demo === "boolean" ? body.demo : undefined,
        tradeMode: typeof body.tradeMode === "string" ? body.tradeMode : undefined,
      });
    } else {
      result = await manager.connect({});
    }

    return NextResponse.json(
      { ok: result.ok, message: result.message, status: result.status },
      { status: result.ok ? 200 : 400, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Connect failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
