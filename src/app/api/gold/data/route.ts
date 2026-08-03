import { NextResponse } from "next/server";
import { collectGoldFullDataset } from "@/lib/research/gold/goldDataCollector";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dataset = await collectGoldFullDataset();
    return NextResponse.json(dataset, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "gold/data failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
