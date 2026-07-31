import { NextRequest, NextResponse } from "next/server";
import { ResearchRepository } from "@/lib/research/repository/ResearchRepository";
import { computeHistoricalAnalytics } from "@/lib/research/repository/HistoricalAnalytics";
import { computeDecisionAnalytics } from "@/lib/research/repository/DecisionAnalytics";
import { computeProviderAnalytics } from "@/lib/research/repository/ProviderAnalytics";
import { computeEvidenceAnalytics } from "@/lib/research/repository/EvidenceAnalytics";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") ?? "statistics";
  const asset = searchParams.get("asset") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);
  const snapshotId = searchParams.get("snapshotId") ?? undefined;
  const origin = searchParams.get("origin") ?? undefined;
  const since = searchParams.get("since") ?? undefined;
  const until = searchParams.get("until") ?? undefined;
  const decisionAction = searchParams.get("decisionAction") ?? undefined;
  const riskLevel = searchParams.get("riskLevel") ?? undefined;

  const repo = ResearchRepository.getInstance();

  switch (action) {
    case "statistics": {
      return NextResponse.json(repo.getStatistics());
    }

    case "history": {
      const snapshots = repo.getHistory(asset, limit);
      return NextResponse.json({ snapshots, count: snapshots.length });
    }

    case "snapshot": {
      if (!snapshotId) {
        return NextResponse.json({ error: "snapshotId required" }, { status: 400 });
      }
      const snapshot = repo.getSnapshot(snapshotId);
      if (!snapshot) {
        return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
      }
      return NextResponse.json(snapshot);
    }

    case "latest": {
      const snapshot = repo.getLatest(asset);
      if (!snapshot) {
        return NextResponse.json({ error: "No snapshots found" }, { status: 404 });
      }
      return NextResponse.json(snapshot);
    }

    case "search": {
      const snapshots = repo.search({
        asset,
        limit,
        origin: origin as any,
        since,
        until,
        decisionAction,
        riskLevel,
      });
      return NextResponse.json({ snapshots, count: snapshots.length });
    }

    case "historical-analytics": {
      const snapshots = repo.search({ asset });
      return NextResponse.json(computeHistoricalAnalytics(snapshots));
    }

    case "decision-analytics": {
      const snapshots = repo.search({ asset });
      return NextResponse.json(computeDecisionAnalytics(snapshots));
    }

    case "provider-analytics": {
      const snapshots = repo.search({ asset });
      return NextResponse.json(computeProviderAnalytics(snapshots));
    }

    case "evidence-analytics": {
      const snapshots = repo.search({ asset });
      return NextResponse.json(computeEvidenceAnalytics(snapshots));
    }

    case "asset-overviews": {
      return NextResponse.json(repo.getAssetOverviews());
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
