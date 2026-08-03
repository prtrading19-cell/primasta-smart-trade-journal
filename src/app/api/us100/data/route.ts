import { NextResponse } from "next/server";
import { collectUS100FullDataset } from "@/lib/research/us100/us100DataCollector";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dataset = await collectUS100FullDataset();
    return NextResponse.json(dataset, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "us100/data failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
