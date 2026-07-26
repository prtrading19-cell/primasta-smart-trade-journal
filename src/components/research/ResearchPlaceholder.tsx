"use client";

import { Database, Clock, Lock } from "lucide-react";
import { useResearchAsset } from "@/context/ResearchAssetContext";
import { getProfile } from "@/lib/research";
import { getAssetMetadata } from "@/config/assetConfig";

export function ResearchPlaceholder() {
  const { selectedAsset } = useResearchAsset();
  const profile = getProfile(selectedAsset);
  const metadata = getAssetMetadata(selectedAsset);

  if (!profile) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-card p-8 shadow-soft">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-text-muted" />
          <p className="text-sm text-text-muted">This research profile is not yet available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
            <Database className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{metadata.displayName} Research</h2>
            <p className="text-sm text-text-secondary">{profile.description}</p>
          </div>
        </div>
      </div>

      {profile.categoryDefinitions.map((category) => (
        <section
          key={category.id}
          className="rounded-lg border border-border-subtle bg-surface-card p-5 shadow-soft"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{category.title}</p>
              <h3 className="mt-1 text-sm font-semibold text-text-primary">{category.description}</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-panel px-2.5 py-1 text-xs text-text-muted">
              <Clock className="h-3 w-3" />
              Live Data Unavailable
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {category.driverIds.map((driverId) => {
              const driver = profile.driverRegistry.find((d) => d.id === driverId);
              if (!driver) return null;
              return (
                <div
                  key={driverId}
                  className="rounded-md border border-border-subtle bg-surface-panel p-3"
                >
                  <p className="text-xs font-medium text-text-secondary">{driver.title}</p>
                  <p className="mt-1 text-sm text-text-muted">—</p>
                  <p className="mt-1 text-[11px] text-text-muted">{driver.source}</p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
