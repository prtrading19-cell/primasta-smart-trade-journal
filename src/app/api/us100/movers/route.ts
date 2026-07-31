import { NextResponse } from "next/server";
import { initializeProviderRegistry } from "@/lib/research/infrastructure/registerProviders";
import { executeUS100Movers } from "@/lib/research/infrastructure/ProviderExecution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  initializeProviderRegistry();
  try {
    const movers = await executeUS100Movers();
    return NextResponse.json(movers);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch US100 market movers", detail: message },
      { status: 500 }
    );
  }
}
