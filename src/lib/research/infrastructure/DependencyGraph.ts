import type { DependencyEdge } from "./types";

type StaleSet = Set<string>;

export class DependencyGraph {
  private edges: DependencyEdge[] = [];
  private staleProviders: StaleSet = new Set();
  private staleAssets: StaleSet = new Set();

  registerDependency(from: string, to: string, kind: "provider" | "asset"): void {
    this.edges.push({ from, to, kind });
  }

  registerProviderDependencies(dependencies: Record<string, string[]>): void {
    for (const [providerId, deps] of Object.entries(dependencies)) {
      for (const dep of deps) {
        this.edges.push({ from: dep, to: providerId, kind: "provider" });
      }
    }
  }

  markStale(targetId: string): string[] {
    const marked: string[] = [];

    for (const edge of this.edges) {
      if (edge.from === targetId) {
        if (edge.kind === "provider") {
          if (!this.staleProviders.has(edge.to)) {
            this.staleProviders.add(edge.to);
            marked.push(`provider:${edge.to}`);
          }
        } else {
          if (!this.staleAssets.has(edge.to)) {
            this.staleAssets.add(edge.to);
            marked.push(`asset:${edge.to}`);
          }
        }
      }
    }

    return marked;
  }

  isProviderStale(providerId: string): boolean {
    return this.staleProviders.has(providerId);
  }

  isAssetStale(assetId: string): boolean {
    return this.staleAssets.has(assetId);
  }

  clearProviderStale(providerId: string): void {
    this.staleProviders.delete(providerId);
  }

  clearAssetStale(assetId: string): void {
    this.staleAssets.delete(assetId);
  }

  clearAllStale(): void {
    this.staleProviders.clear();
    this.staleAssets.clear();
  }

  getStaleProviders(): string[] {
    return Array.from(this.staleProviders);
  }

  getStaleAssets(): string[] {
    return Array.from(this.staleAssets);
  }

  getDownstream(targetId: string): { providerIds: string[]; assetIds: string[] } {
    const providerIds: string[] = [];
    const assetIds: string[] = [];

    for (const edge of this.edges) {
      if (edge.from === targetId) {
        if (edge.kind === "provider") providerIds.push(edge.to);
        else assetIds.push(edge.to);
      }
    }

    return { providerIds, assetIds };
  }
}
