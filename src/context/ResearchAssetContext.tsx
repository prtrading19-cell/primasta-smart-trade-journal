"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ResearchAsset } from "@/lib/research/ResearchTypes";
import { ASSET_CONFIG, DEFAULT_ASSET, type AssetMetadata } from "@/config/assetConfig";

const STORAGE_KEY = "tradeos-selected-asset";

interface ResearchAssetContextValue {
  selectedAsset: ResearchAsset;
  setSelectedAsset: (asset: ResearchAsset) => void;
  availableAssets: AssetMetadata[];
  profileLoaded: boolean;
}

const ResearchAssetContext = createContext<ResearchAssetContextValue | undefined>(undefined);

function readStoredAsset(): ResearchAsset {
  if (typeof window === "undefined") return DEFAULT_ASSET;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && ASSET_CONFIG.some((a) => a.id === stored)) {
      return stored as ResearchAsset;
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_ASSET;
}

interface ResearchAssetProviderProps {
  children: React.ReactNode;
  initialAsset?: ResearchAsset;
}

export function ResearchAssetProvider({ children, initialAsset }: ResearchAssetProviderProps) {
  const [selectedAsset, setSelectedAssetState] = useState<ResearchAsset>(initialAsset ?? DEFAULT_ASSET);
  const [hydrated, setHydrated] = useState(Boolean(initialAsset));

  useEffect(() => {
    if (initialAsset) return;
    setSelectedAssetState(readStoredAsset());
    setHydrated(true);
  }, [initialAsset]);

  const setSelectedAsset = useCallback(
    (asset: ResearchAsset) => {
      setSelectedAssetState(asset);
      if (!initialAsset && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_KEY, asset);
        } catch {
          // localStorage unavailable
        }
      }
    },
    [initialAsset]
  );

  const value = useMemo<ResearchAssetContextValue>(
    () => ({
      selectedAsset: hydrated ? selectedAsset : initialAsset ?? DEFAULT_ASSET,
      setSelectedAsset,
      availableAssets: ASSET_CONFIG,
      profileLoaded: hydrated,
    }),
    [selectedAsset, setSelectedAsset, hydrated, initialAsset]
  );

  return (
    <ResearchAssetContext.Provider value={value}>
      {children}
    </ResearchAssetContext.Provider>
  );
}

export function useResearchAsset(): ResearchAssetContextValue {
  const context = useContext(ResearchAssetContext);
  if (!context) {
    throw new Error("useResearchAsset must be used within ResearchAssetProvider");
  }
  return context;
}
