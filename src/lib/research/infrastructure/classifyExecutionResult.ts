export interface ExecutionClassification {
  isFailure: boolean;
  error?: string;
}

function isProviderResult(value: unknown): value is { success: boolean; error?: string; meta?: { error?: string; status?: string } } {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.success === "boolean" && "data" in v && "meta" in v;
}

function metaOf(value: unknown): { status?: string; error?: string } | null {
  if (value === null || typeof value !== "object") return null;
  const meta = (value as Record<string, unknown>).meta;
  if (meta === null || typeof meta !== "object") return null;
  return meta as { status?: string; error?: string };
}

export function classifyExecutionResult(result: unknown): ExecutionClassification {
  if (result === null || result === undefined) {
    return { isFailure: true, error: "Provider returned no data" };
  }

  if (isProviderResult(result)) {
    if (result.success === false) {
      return { isFailure: true, error: result.error ?? result.meta?.error ?? "Provider returned failure result" };
    }
    const meta = result.meta;
    if (meta && (meta.status === "unavailable" || meta.status === "error")) {
      return { isFailure: true, error: meta.error ?? "Provider returned unavailable result" };
    }
    return { isFailure: false };
  }

  if (Array.isArray(result)) {
    if (result.length === 0) {
      return { isFailure: false };
    }
    const statuses = result.map((item) => metaOf(item)?.status).filter((s): s is string => typeof s === "string");
    if (statuses.length > 0 && statuses.every((s) => s === "unavailable" || s === "error")) {
      const first = metaOf(result[0]);
      return { isFailure: true, error: first?.error ?? "Provider returned unavailable results" };
    }
    return { isFailure: false };
  }

  if (typeof result === "object") {
    const meta = metaOf(result);
    if (meta && (meta.status === "unavailable" || meta.status === "error")) {
      return { isFailure: true, error: meta.error ?? "Provider returned unavailable result" };
    }
  }

  return { isFailure: false };
}
