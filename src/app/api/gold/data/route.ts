import { NextResponse } from "next/server";
import { collectGoldFullDataset } from "@/lib/research/gold/goldDataCollector";

export const dynamic = "force-dynamic";

export async function GET() {
  const dataset = await collectGoldFullDataset();
  return NextResponse.json(dataset, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
