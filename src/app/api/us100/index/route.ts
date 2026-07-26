import { NextResponse } from "next/server";
import { fetchUS100Index } from "@/lib/research/providers/fmp/marketIndexProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const index = await fetchUS100Index();
    return NextResponse.json(index);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch US100 index", detail: message },
      { status: 500 }
    );
  }
}
