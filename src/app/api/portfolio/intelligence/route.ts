import { NextResponse } from "next/server";
import { buildPortfolioIntelligence } from "@/lib/research/portfolio";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "1";
  const assetIds = url.searchParams.get("assets")
    ? url.searchParams.get("assets")!.split(",").filter(Boolean)
    : undefined;

  try {
    const result = await buildPortfolioIntelligence({ refresh, assetIds });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "portfolio/intelligence failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
