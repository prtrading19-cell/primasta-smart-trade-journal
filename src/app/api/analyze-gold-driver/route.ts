import { NextResponse } from "next/server";
import { analyzeGoldDriver } from "@/lib/goldResearch";
import { GOLD_DRIVER_NAMES, type GoldAnalysisInput } from "@/types/goldResearch";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<GoldAnalysisInput>;
    const driverName = body.driverName;

    if (!driverName || !GOLD_DRIVER_NAMES.includes(driverName)) {
      return NextResponse.json({ error: "Choose a valid Gold driver." }, { status: 400 });
    }

    const input: GoldAnalysisInput = {
      driverName,
      headline: String(body.headline ?? ""),
      summary: String(body.summary ?? ""),
      currentValue: String(body.currentValue ?? ""),
      chartObservation: String(body.chartObservation ?? ""),
      sourceLink: String(body.sourceLink ?? ""),
      notes: String(body.notes ?? "")
    };

    return NextResponse.json(analyzeGoldDriver(input));
  } catch {
    return NextResponse.json({ error: "Unable to analyze this Gold driver." }, { status: 500 });
  }
}
