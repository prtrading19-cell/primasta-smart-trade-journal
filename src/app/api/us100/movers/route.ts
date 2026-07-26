import { NextResponse } from "next/server";
import { fetchUS100Movers } from "@/lib/research/providers/fmp/marketMoversProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const movers = await fetchUS100Movers();
    return NextResponse.json(movers);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch US100 market movers", detail: message },
      { status: 500 }
    );
  }
}
