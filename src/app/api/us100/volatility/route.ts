import { NextResponse } from "next/server";
import { initializeProviderRegistry } from "@/lib/research/infrastructure/registerProviders";
import { executeUS100Volatility } from "@/lib/research/infrastructure/ProviderExecution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  initializeProviderRegistry();
  try {
    const volatility = await executeUS100Volatility();
    return NextResponse.json(volatility);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch US100 volatility data", detail: message },
      { status: 500 }
    );
  }
}
