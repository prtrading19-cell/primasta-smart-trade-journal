import { NextResponse } from "next/server";
import { fetchUS100Earnings } from "@/lib/research/providers/fmp/earningsProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const earnings = await fetchUS100Earnings();
    return NextResponse.json(earnings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch US100 earnings", detail: message },
      { status: 500 }
    );
  }
}
