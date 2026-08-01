import { notFound } from "next/navigation";
import { getConfig } from "@/lib/research/config/AssetRegistryLoader";
import { ResearchDeskPage } from "@/components/research/ResearchDeskPage";

export const dynamic = "force-dynamic";

interface ResearchAssetPageProps {
  params: { asset: string };
}

export default function ResearchAssetPage({ params }: ResearchAssetPageProps) {
  const assetId = params.asset;

  let config;
  try {
    config = getConfig(assetId);
  } catch {
    notFound();
  }

  if (!config.enabled) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ResearchDeskPage assetId={assetId} />
    </div>
  );
}
