"use client";

import { ChevronDown, Lock } from "lucide-react";
import { useResearchAsset } from "@/context/ResearchAssetContext";
import { isAssetEnabled } from "@/config/assetConfig";
import type { ResearchAsset } from "@/lib/research/ResearchTypes";

const inputClass =
  "w-full appearance-none rounded-md border border-border-subtle bg-surface-panel px-3 py-2 pr-10 text-sm text-text-primary shadow-sm outline-none transition cursor-pointer focus:border-gold focus:ring-2 focus:ring-gold/10 disabled:cursor-not-allowed disabled:opacity-60";

export function ResearchAssetSelector() {
  const { selectedAsset, setSelectedAsset, availableAssets } = useResearchAsset();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value as ResearchAsset;
    if (isAssetEnabled(value)) {
      setSelectedAsset(value);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="research-asset-selector"
        className="text-sm font-medium text-text-secondary whitespace-nowrap"
      >
        Research Asset
      </label>
      <div className="relative w-full max-w-xs">
        <select
          id="research-asset-selector"
          value={selectedAsset}
          onChange={handleChange}
          className={inputClass}
        >
          {availableAssets.map((asset) => (
            <option
              key={asset.id}
              value={asset.id}
              disabled={!asset.enabled}
            >
              {asset.displayName}
              {!asset.enabled ? " — Coming Soon" : ""}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
      {!isAssetEnabled(selectedAsset) && (
        <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
          <Lock className="h-3 w-3" />
          Coming Soon
        </span>
      )}
    </div>
  );
}
