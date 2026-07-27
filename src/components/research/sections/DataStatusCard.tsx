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

export function DataStatusCard({ sources, collectedAt, errors }: DataStatusCardProps) {
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
      {errors.length > 0 && (
        <div className="mt-3 rounded-lg border border-loss/30 bg-loss/5 p-2">
          <span className="text-[10px] font-medium text-loss">{errors.length} data source error(s)</span>
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] text-text-muted">Collected:</span>
        <TimestampBadge timestamp={collectedAt} />
      </div>
    </ResearchSection>
  );
}
