"use client";

import { ResearchAssetProvider, useResearchAsset } from "@/context/ResearchAssetContext";
import { ResearchAssetSelector } from "@/components/research/ResearchAssetSelector";
import { ResearchPlaceholder } from "@/components/research/ResearchPlaceholder";
import { GoldResearchDesk } from "@/components/GoldResearchDesk";

function ResearchContent() {
  const { selectedAsset } = useResearchAsset();

  if (selectedAsset === "gold") {
    return <GoldResearchDesk />;
  }

  return <ResearchPlaceholder />;
}

export function ResearchPageWrapper() {
  return (
    <ResearchAssetProvider>
      <div className="space-y-6">
        <section className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-soft">
          <ResearchAssetSelector />
        </section>
        <ResearchContent />
      </div>
    </ResearchAssetProvider>
  );
}
