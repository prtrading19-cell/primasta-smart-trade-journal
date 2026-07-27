import { NextResponse } from "next/server";
import { getProfile } from "@/lib/research";
import { fetchStockQuotes } from "@/lib/research/providers/twelvedata/stockQuotesProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = getProfile("us100");
    const symbols = profile?.trackedSymbols ?? [];
    const stocks = await fetchStockQuotes(symbols);
    return NextResponse.json(stocks);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch US100 stock quotes", detail: message },
      { status: 500 }
    );
  }
}
