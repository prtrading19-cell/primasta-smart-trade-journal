import { NextResponse } from "next/server";
import { ensureMt5Broker, getMt5BrokerManager } from "@/lib/mt5";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  ensureMt5Broker();
  const manager = getMt5BrokerManager();
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const proposals = status ? manager.getProposals(status === "all" ? "all" : "pending") : manager.getProposals("pending");
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        proposals,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: "mt5/proposals failed", message: e instanceof Error ? e.message : String(e) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
