import { NextResponse } from "next/server";
import { initializeProviderRegistry } from "@/lib/research/infrastructure/registerProviders";
import { executeUS100Index } from "@/lib/research/infrastructure/ProviderExecution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  initializeProviderRegistry();
  try {
    const index = await executeUS100Index();
    return NextResponse.json(index);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch US100 index", detail: message },
      { status: 500 }
    );
  }
}
