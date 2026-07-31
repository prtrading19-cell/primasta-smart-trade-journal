import { NextRequest, NextResponse } from "next/server";
import { SchedulerEngine } from "@/lib/research/infrastructure/SchedulerEngine";
import { initializeProviderRegistry } from "@/lib/research/infrastructure/registerProviders";

export async function GET() {
  initializeProviderRegistry();
  const engine = SchedulerEngine.getInstance();

  return NextResponse.json({
    status: engine.getStatus(),
    metrics: engine.getMetrics(),
    assets: engine.getAllAssetRecords(),
    providers: engine.getAllProviderRecords(),
  });
}

export async function POST(req: NextRequest) {
  initializeProviderRegistry();
  const engine = SchedulerEngine.getInstance();

  const body = await req.json().catch(() => ({}));
  const { action, providerId, assetId, priority } = body;

  try {
    switch (action) {
      case "start":
        engine.start();
        break;
      case "stop":
        engine.stop();
        break;
      case "pause":
        engine.pause();
        break;
      case "resume":
        engine.resume();
        break;
      case "runOnce":
        await engine.runOnce();
        break;
      case "refreshProvider":
        await engine.runProvider(providerId ?? "", priority ?? "normal");
        break;
      case "refreshAsset":
        await engine.runAsset(assetId ?? "", priority ?? "normal");
        break;
      case "refreshAll":
        await engine.runAllAssets(priority ?? "normal");
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({
      status: engine.getStatus(),
      metrics: engine.getMetrics(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error }, { status: 500 });
  }
}
