import { NextResponse } from "next/server";
import { getProfile } from "@/lib/research";
import { fetchEarnings } from "@/lib/research/providers/fmp/earningsProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = getProfile("us100");
    const symbols = profile?.trackedSymbols ?? [];
    const earnings = await fetchEarnings(symbols);
    return NextResponse.json(earnings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch US100 earnings", detail: message },
      { status: 500 }
    );
  }
}
