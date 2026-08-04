import { NextResponse } from "next/server";
import { getMt5AccountManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const accounts = await getMt5AccountManager().listAccounts();
    return NextResponse.json(
      { ok: true, accounts },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load MT5 accounts" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const { account, error } = await getMt5AccountManager().saveAccount({
      name: typeof body.name === "string" ? body.name : undefined,
      broker: typeof body.broker === "string" ? body.broker : undefined,
      login: typeof body.login === "number" ? body.login : typeof body.login === "string" ? Number(body.login) || null : null,
      password: typeof body.password === "string" ? body.password : undefined,
      investorPassword: typeof body.investorPassword === "string" ? body.investorPassword : undefined,
      server: typeof body.server === "string" ? body.server : undefined,
      terminalPath: typeof body.terminalPath === "string" ? body.terminalPath : undefined,
      tradeMode: typeof body.tradeMode === "string" ? body.tradeMode : undefined,
      demo: typeof body.demo === "boolean" ? body.demo : undefined,
      favorite: typeof body.favorite === "boolean" ? body.favorite : undefined,
      isDefault: typeof body.isDefault === "boolean" ? body.isDefault : undefined,
      autoConnect: typeof body.autoConnect === "boolean" ? body.autoConnect : undefined,
      readOnly: typeof body.readOnly === "boolean" ? body.readOnly : undefined,
      remember: typeof body.remember === "boolean" ? body.remember : undefined,
      magic: typeof body.magic === "number" ? body.magic : undefined,
      deviation: typeof body.deviation === "number" ? body.deviation : undefined,
    });
    if (error || !account) {
      return NextResponse.json({ ok: false, error }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ok: true, account }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to save MT5 account" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
