import type {
  ServiceMetadata,
  RequestMethod,
  ServiceHealthResult,
  ServiceStatus
} from "@/types/goldResearchService";
import { ENGINE_VERSIONS, GOLD_RESEARCH_SERVICE_SCHEMA_VERSION } from "@/types/goldResearchService";
import type { PipelineDiagnostics } from "@/types/goldResearchAnalysis";

let requestCounter = 0;

export function generateRequestId(): string {
  requestCounter++;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `gr-${ts}-${rand}-${requestCounter}`;
}

export function createServiceMetadata(
  method: RequestMethod,
  executionTimeMs: number
): ServiceMetadata {
  return {
    requestId: generateRequestId(),
    method,
    executionTimeMs,
    timestamp: new Date().toISOString(),
    schemaVersion: GOLD_RESEARCH_SERVICE_SCHEMA_VERSION,
    engineVersions: { ...ENGINE_VERSIONS }
  };
}

export function createHealthResult(
  pipelineDiagnostics?: PipelineDiagnostics
): ServiceHealthResult {
  const enginesAvailable: string[] = [];
  const enginesMissing: string[] = [];

  const expectedEngines = [
    "CategoryScoreEngine",
    "TechnicalBiasEngine",
    "InstitutionalFlowEngine",
    "DecisionEngine"
  ];

  if (pipelineDiagnostics) {
    for (const engine of pipelineDiagnostics.engines) {
      if (engine.status === "success") {
        enginesAvailable.push(engine.engine);
      } else {
        enginesMissing.push(engine.engine);
      }
    }
  }

  for (const engine of expectedEngines) {
    if (!enginesAvailable.includes(engine) && !enginesMissing.includes(engine)) {
      enginesMissing.push(engine);
    }
  }

  const status: ServiceStatus = enginesMissing.length === 0
    ? "ok"
    : enginesAvailable.length > 0
      ? "degraded"
      : "error";

  return {
    status,
    enginesAvailable,
    enginesMissing,
    schemaVersion: GOLD_RESEARCH_SERVICE_SCHEMA_VERSION,
    uptime: true
  };
}

export function determineServiceStatus(
  pipelineStatus?: string,
  hasErrors: boolean = false
): ServiceStatus {
  if (hasErrors) return "error";
  if (pipelineStatus === "failed") return "error";
  if (pipelineStatus === "partial") return "degraded";
  return "ok";
}

export function createServiceError(
  code: string,
  message: string,
  stage?: string,
  recoverable: boolean = true
): { code: string; message: string; stage?: string; recoverable: boolean } {
  return { code, message, stage, recoverable };
}

export function collectPipelineWarnings(diagnostics: PipelineDiagnostics): string[] {
  return [...diagnostics.warnings];
}

export function formatExecutionTime(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
