import { NextResponse } from "next/server";
import { fetchMarketDataMultiProvider, createMarketDataErrorResponse } from "@/lib/marketDataEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await fetchMarketDataMultiProvider();

    if (result.status === "success" && result.currentPrice) {
      return NextResponse.json(result);
    }

    const status = /rate limit|credits|quota/i.test(result.message) ? 429 : 502;
    return NextResponse.json(createMarketDataErrorResponse(result.message || "Live Market Data Unavailable", result.source), { status });
  } catch (error) {
    return NextResponse.json(createMarketDataErrorResponse(error instanceof Error ? error.message : "Live Market Data Unavailable"), { status: 500 });
  }
}
