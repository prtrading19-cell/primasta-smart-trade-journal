"use client";

import { ResearchAssetProvider, useResearchAsset } from "@/context/ResearchAssetContext";
import { ResearchAssetSelector } from "@/components/research/ResearchAssetSelector";
import { ResearchPlaceholder } from "@/components/research/ResearchPlaceholder";
import { GoldResearchDeskV2 } from "@/components/research/GoldResearchDeskV2";
import { US100ResearchDesk } from "@/components/research/ResearchDesk";

function ResearchContent() {
  const { selectedAsset } = useResearchAsset();

  if (selectedAsset === "gold") {
    return <GoldResearchDeskV2 />;
  }

  if (selectedAsset === "us100") {
    return <US100ResearchDesk />;
  }

  return <ResearchPlaceholder />;
}

export function ResearchPageWrapper() {
  return (
    <ResearchAssetProvider>
      <div className="space-y-6">
        <section className="rounded-xl border border-border-subtle bg-surface-card p-5 shadow-soft">
          <ResearchAssetSelector />
        </section>
        <ResearchContent />
      </div>
    </ResearchAssetProvider>
  );
}
