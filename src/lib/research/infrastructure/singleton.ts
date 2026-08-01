const GLOBAL_KEY = "__primastaResearchSingletonMap";

export function getSharedSingleton<T>(name: string, factory: () => T): T {
  const g = globalThis as unknown as Record<string, Map<string, unknown> | undefined>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map();
  }
  const scope = g[GLOBAL_KEY] as Map<string, unknown>;
  if (!scope.has(name)) {
    scope.set(name, factory());
  }
  return scope.get(name) as T;
}
