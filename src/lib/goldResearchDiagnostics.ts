import type {
  PipelineDiagnostics,
  PipelineStage,
  EngineDiagnostic,
  EngineStatus,
  PipelineStatus
} from "@/types/goldResearchAnalysis";

export function createEmptyDiagnostics(): PipelineDiagnostics {
  return {
    totalExecutionTimeMs: 0,
    stageTimings: {
      validation: 0,
      "category-scoring": 0,
      "technical-bias": 0,
      "institutional-flow": 0,
      "decision-engine": 0,
      diagnostics: 0,
      complete: 0
    },
    engines: [],
    overallStatus: "success",
    warnings: [],
    errors: []
  };
}

export function createEngineDiagnostic(
  engine: string,
  status: EngineStatus,
  executionTimeMs: number,
  inputFieldsAvailable: number,
  inputFieldsRequired: number,
  error?: string,
  warnings: string[] = []
): EngineDiagnostic {
  return {
    engine,
    status,
    executionTimeMs,
    error,
    warnings,
    inputFieldsAvailable,
    inputFieldsRequired
  };
}

export function startStageTiming(
  diagnostics: PipelineDiagnostics,
  stage: PipelineStage
): () => number {
  const start = performance.now();
  return () => {
    const elapsed = Math.round(performance.now() - start);
    diagnostics.stageTimings[stage] = elapsed;
    return elapsed;
  };
}

export function addEngineDiagnostic(
  diagnostics: PipelineDiagnostics,
  diagnostic: EngineDiagnostic
): void {
  diagnostics.engines.push(diagnostic);

  if (diagnostic.status === "failed") {
    diagnostics.errors.push(`${diagnostic.engine}: ${diagnostic.error ?? "Unknown error"}`);
  }

  for (const warning of diagnostic.warnings) {
    diagnostics.warnings.push(`${diagnostic.engine}: ${warning}`);
  }
}

export function finalizeDiagnostics(
  diagnostics: PipelineDiagnostics,
  pipelineStartTime: number
): PipelineDiagnostics {
  diagnostics.totalExecutionTimeMs = Math.round(performance.now() - pipelineStartTime);
  diagnostics.stageTimings.complete = 0;

  const hasFailure = diagnostics.engines.some(e => e.status === "failed");
  const hasPartial = diagnostics.engines.some(e => e.status === "skipped" || e.status === "not-provided");

  if (hasFailure) {
    diagnostics.overallStatus = "partial";
  } else if (hasPartial) {
    diagnostics.overallStatus = "partial";
  } else {
    diagnostics.overallStatus = "success";
  }

  return diagnostics;
}

export function getEngineStatusSummary(diagnostics: PipelineDiagnostics): string {
  const statuses = diagnostics.engines.map(e => `${e.engine}: ${e.status}`);
  return statuses.join(", ");
}

export function hasEngineFailure(diagnostics: PipelineDiagnostics): boolean {
  return diagnostics.engines.some(e => e.status === "failed");
}

export function getEngineExecutionTime(diagnostics: PipelineDiagnostics, engineName: string): number {
  const engine = diagnostics.engines.find(e => e.engine === engineName);
  return engine?.executionTimeMs ?? 0;
}

export function getTotalEngineTime(diagnostics: PipelineDiagnostics): number {
  return diagnostics.engines.reduce((sum, e) => sum + e.executionTimeMs, 0);
}

export function summarizeDiagnostics(diagnostics: PipelineDiagnostics): string {
  const parts: string[] = [];

  parts.push(`Pipeline status: ${diagnostics.overallStatus}.`);
  parts.push(`Total time: ${diagnostics.totalExecutionTimeMs}ms.`);
  parts.push(`Engines: ${diagnostics.engines.length}.`);

  const succeeded = diagnostics.engines.filter(e => e.status === "success").length;
  const failed = diagnostics.engines.filter(e => e.status === "failed").length;
  const skipped = diagnostics.engines.filter(e => e.status === "skipped" || e.status === "not-provided").length;

  parts.push(`Succeeded: ${succeeded}, Failed: ${failed}, Skipped: ${skipped}.`);

  if (diagnostics.warnings.length > 0) {
    parts.push(`Warnings: ${diagnostics.warnings.length}.`);
  }

  if (diagnostics.errors.length > 0) {
    parts.push(`Errors: ${diagnostics.errors.length}.`);
  }

  return parts.join(" ");
}
