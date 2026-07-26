"use client";

import { ResearchAssetProvider } from "@/context/ResearchAssetContext";
import { ResearchAssetSelector } from "@/components/research/ResearchAssetSelector";
import { GoldResearchDesk } from "@/components/GoldResearchDesk";

export function ResearchPageWrapper() {
  return (
    <ResearchAssetProvider>
      <div className="space-y-6">
        <section className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-soft">
          <ResearchAssetSelector />
        </section>
        <GoldResearchDesk />
      </div>
    </ResearchAssetProvider>
  );
}
