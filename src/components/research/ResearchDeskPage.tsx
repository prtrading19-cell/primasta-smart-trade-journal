"use client";

import { ResearchAssetProvider } from "@/context/ResearchAssetContext";
import { GoldResearchDesk } from "@/components/GoldResearchDesk";
import { US100ResearchDesk } from "@/components/research/ResearchDesk";
import { ResearchPlaceholder } from "@/components/research/ResearchPlaceholder";
import type { ResearchAsset } from "@/lib/research/ResearchTypes";

function DeskForAsset({ assetId }: { assetId: string }) {
  if (assetId === "gold") {
    return <GoldResearchDesk />;
  }
  if (assetId === "us100") {
    return <US100ResearchDesk />;
  }
  return <ResearchPlaceholder />;
}

export function ResearchDeskPage({ assetId }: { assetId: string }) {
  return (
    <ResearchAssetProvider initialAsset={assetId as ResearchAsset}>
      <DeskForAsset assetId={assetId} />
    </ResearchAssetProvider>
  );
}
