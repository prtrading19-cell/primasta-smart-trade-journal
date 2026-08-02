import { Database } from "lucide-react";
import { ResearchSection, SourceBadge, TimestampBadge } from "../shared";

interface DataSource {
  name: string;
  status: "live" | "delayed" | "unavailable" | "error";
  timestamp?: string;
  error?: string;
}

interface DataStatusCardProps {
  sources: DataSource[];
  collectedAt: string;
  errors: string[];
}

function getStatusDot(status: string): string {
  if (status === "live") return "bg-profit";
  if (status === "delayed") return "bg-gold";
  return "bg-loss";
}

const PROVIDER_LIMITATION_PATTERN =
  /rate limit|429|limit reach|too many requests|provider limitation|quota|credit|unavailable|no live|source data unavailable|limit/i;

function isProviderLimitation(error: string): boolean {
  return PROVIDER_LIMITATION_PATTERN.test(error);
}

interface SummaryStatProps {
  label: string;
  value: number;
  tone: "profit" | "gold" | "loss";
}

function SummaryStat({ label, value, tone }: SummaryStatProps) {
  const dotClass = tone === "profit" ? "bg-profit" : tone === "gold" ? "bg-gold" : "bg-loss";
  const valueClass = tone === "profit" ? "text-profit" : tone === "gold" ? "text-gold" : "text-loss";
  return (
    <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-panel px-3 py-2">
      <span className="flex items-center gap-2 text-[11px] font-medium text-text-secondary">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        {label}
      </span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

export function DataStatusCard({ sources, collectedAt, errors }: DataStatusCardProps) {
  const live = sources.filter((s) => s.status === "live" || s.status === "delayed").length;
  const limited = sources.filter((s) => s.status !== "live" && s.status !== "delayed").length;
  const appErrors = errors.filter((e) => !isProviderLimitation(e)).length;

  return (
    <ResearchSection title="Data Status" icon={<Database size={16} />}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        {sources.map((s) => (
          <div key={s.name} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-panel px-3 py-2">
            <span className={`h-2 w-2 rounded-full ${getStatusDot(s.status)}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-text-primary">{s.name}</div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-text-muted">{s.status}</span>
                {s.timestamp && <TimestampBadge timestamp={s.timestamp} />}
              </div>
              {s.status !== "live" && s.error && (
                <div className="mt-0.5 truncate text-[10px] text-loss" title={s.error}>{s.error}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-border-subtle bg-surface-panel p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Provider Summary</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <SummaryStat label="Live" value={live} tone="profit" />
          <SummaryStat label="Provider Limitations" value={limited} tone="gold" />
          <SummaryStat label="Application Errors" value={appErrors} tone="loss" />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] text-text-muted">Collected:</span>
        <TimestampBadge timestamp={collectedAt} />
      </div>
    </ResearchSection>
  );
}
