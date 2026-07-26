import { NextResponse } from "next/server";
import { fetchUS100Sectors } from "@/lib/research/providers/fmp/sectorProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sectors = await fetchUS100Sectors();
    return NextResponse.json(sectors);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch US100 sector performance", detail: message },
      { status: 500 }
    );
  }
}
