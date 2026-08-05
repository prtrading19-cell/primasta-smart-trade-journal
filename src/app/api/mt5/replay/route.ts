import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    const url = new URL(request.url);
    const proposalId = url.searchParams.get("proposalId");
    if (proposalId) {
      return NextResponse.json(
        { ok: true, session: manager.getReplayByProposal(proposalId) },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    const count = Number(url.searchParams.get("count") ?? 100);
    return NextResponse.json(
      { ok: true, sessions: manager.getReplaySessions(Number.isFinite(count) ? count : 100) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to load replay sessions" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
