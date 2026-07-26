import { NextResponse } from "next/server";
import { fetchUS100Volatility } from "@/lib/research/providers/fmp/volatilityProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const volatility = await fetchUS100Volatility();
    return NextResponse.json(volatility);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch US100 volatility data", detail: message },
      { status: 500 }
    );
  }
}
