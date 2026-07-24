import { NextResponse } from "next/server";
import { buildEnhancedAnalysis, buildEnhancedAnalysisFromManual } from "@/lib/goldResearchIntegrations";
import type { GoldAutoFillResponse, GoldResearchReport } from "@/types/goldResearch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EnhanceRequestBody {
  mode: "auto-fill" | "manual";
  autoFillReport?: GoldAutoFillResponse;
  manualReports?: GoldResearchReport[];
  currentPrice?: number;
}

export async function POST(request: Request) {
  try {
    const body: EnhanceRequestBody = await request.json();

    if (!body.mode) {
      return NextResponse.json({ error: "Missing mode field. Use 'auto-fill' or 'manual'." }, { status: 400 });
    }

    if (body.mode === "auto-fill") {
      if (!body.autoFillReport || !body.autoFillReport.sections) {
        return NextResponse.json({ error: "Missing autoFillReport with sections array." }, { status: 400 });
      }

      const analysis = buildEnhancedAnalysis(body.autoFillReport);

      return NextResponse.json({
        success: true,
        analysis,
        mode: "auto-fill",
        driverCount: analysis.driverAnalyses.length,
        pipelineStatus: analysis.pipelineStatus,
        schemaVersion: analysis.schemaVersion
      });
    }

    if (body.mode === "manual") {
      if (!body.manualReports || !Array.isArray(body.manualReports) || body.manualReports.length === 0) {
        return NextResponse.json({ error: "Missing manualReports array with at least one report." }, { status: 400 });
      }

      const analysis = buildEnhancedAnalysisFromManual(body.manualReports, body.currentPrice);

      return NextResponse.json({
        success: true,
        analysis,
        mode: "manual",
        driverCount: analysis.driverAnalyses.length,
        pipelineStatus: analysis.pipelineStatus,
        schemaVersion: analysis.schemaVersion
      });
    }

    return NextResponse.json({ error: `Unknown mode: ${body.mode}` }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Engine enhancement failed";
    console.error("[gold-research-enhance] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
