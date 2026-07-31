import { NextResponse } from "next/server";
import { initializeProviderRegistry } from "@/lib/research/infrastructure/registerProviders";
import { executeUS100Sectors } from "@/lib/research/infrastructure/ProviderExecution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  initializeProviderRegistry();
  try {
    const sectors = await executeUS100Sectors();
    return NextResponse.json(sectors);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch US100 sector performance", detail: message },
      { status: 500 }
    );
  }
}
