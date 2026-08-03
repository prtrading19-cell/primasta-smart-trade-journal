import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { proposalId?: string; action?: "approve" | "reject"; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.proposalId) {
    return NextResponse.json({ ok: false, error: "proposalId is required" }, { status: 400 });
  }

  ensureMt5Broker();
  const manager = getMt5BrokerManager();

  try {
    if (body.action === "reject") {
      const result = manager.rejectProposal(body.proposalId, body.note ?? null);
      if (result.error) {
        return NextResponse.json(
          { ok: false, error: result.error },
          { status: 404, headers: { "Cache-Control": "no-store" } }
        );
      }
      return NextResponse.json(
        { ok: true, action: "rejected", proposal: result.proposal },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const result = await manager.approveProposal(body.proposalId, body.note ?? null);
    if (result.error) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      {
        ok: true,
        action: "approved",
        proposal: result.proposal,
        confirmation: result.confirmation,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Approval failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
