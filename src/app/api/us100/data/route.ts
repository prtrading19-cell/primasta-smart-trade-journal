import { NextResponse } from "next/server";
import { collectUS100FullDataset } from "@/lib/research/us100/us100DataCollector";

export const dynamic = "force-dynamic";

export async function GET() {
  const dataset = await collectUS100FullDataset();
  return NextResponse.json(dataset, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
