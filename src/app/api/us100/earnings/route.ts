import { NextResponse } from "next/server";
import { getProfile } from "@/lib/research";
import { initializeProviderRegistry } from "@/lib/research/infrastructure/registerProviders";
import { executeEarnings } from "@/lib/research/infrastructure/ProviderExecution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  initializeProviderRegistry();
  try {
    const profile = getProfile("us100");
    const symbols = profile?.trackedSymbols ?? [];
    const earnings = await executeEarnings(symbols);
    return NextResponse.json(earnings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch US100 earnings", detail: message },
      { status: 500 }
    );
  }
}
