import type { ProviderRegistration, AssetClass } from "./types";

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers = new Map<string, ProviderRegistration>();

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(registration: ProviderRegistration): void {
    this.providers.set(registration.id, { ...registration });
  }

  unregister(id: string): boolean {
    return this.providers.delete(id);
  }

  get(id: string): ProviderRegistration | undefined {
    return this.providers.get(id);
  }

  getAll(): ProviderRegistration[] {
    return Array.from(this.providers.values()).sort((a, b) => a.priority - b.priority);
  }

  getByAssetClass(assetClass: AssetClass): ProviderRegistration[] {
    return this.getAll().filter(
      (p) =>
        p.assetClass === assetClass ||
        (Array.isArray(p.assetClass) && p.assetClass.includes(assetClass))
    );
  }

  getByType(providerType: string): ProviderRegistration[] {
    return this.getAll().filter((p) => p.providerType === providerType);
  }

  getEnabled(): ProviderRegistration[] {
    return this.getAll().filter((p) => p.enabled);
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  get count(): number {
    return this.providers.size;
  }
}
