import { cn } from "@/lib/format";

export function toneForAction(action: string): "profit" | "loss" | "warning" | "neutral" {
  if (action === "STRONG BUY" || action === "BUY") return "profit";
  if (action === "STRONG SELL" || action === "SELL") return "loss";
  if (action === "WAIT" || action === "HOLD") return "warning";
  return "neutral";
}

export function toneForBias(bias: string): "profit" | "loss" | "warning" | "neutral" {
  if (bias.includes("Bullish")) return "profit";
  if (bias.includes("Bearish")) return "loss";
  if (bias.includes("Neutral")) return "warning";
  return "neutral";
}

export function toneForHealth(status: string): "profit" | "loss" | "warning" | "neutral" {
  if (status === "healthy") return "profit";
  if (status === "degraded") return "warning";
  if (status === "down") return "loss";
  return "neutral";
}

export function ActionBadge({ action, className }: { action: string; className?: string }) {
  const tone = toneForAction(action);
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        tone === "profit" && "bg-profit/10 text-profit",
        tone === "loss" && "bg-loss/10 text-loss",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "neutral" && "bg-surface-panel text-text-muted",
        className
      )}
    >
      {action}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const tone =
    severity === "None" || severity === "Low" ? "profit"
    : severity === "Moderate" ? "warning"
    : severity === "High" ? "loss"
    : "loss";
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        tone === "profit" && "bg-profit/10 text-profit",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "loss" && "bg-loss/10 text-loss"
      )}
    >
      {severity}
    </span>
  );
}

export function LevelBadge({ level }: { level: string }) {
  const tone =
    level === "Very High" || level === "Low" ? "profit"
    : level === "High" || level === "Moderate" ? "warning"
    : "loss";
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        tone === "profit" && "bg-profit/10 text-profit",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "loss" && "bg-loss/10 text-loss"
      )}
    >
      {level}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: string }) {
  const tone =
    risk === "Low" ? "profit"
    : risk === "Medium" ? "warning"
    : "loss";
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        tone === "profit" && "bg-profit/10 text-profit",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "loss" && "bg-loss/10 text-loss"
      )}
    >
      {risk}
    </span>
  );
}

export function ProgressBar({ value, tone, className }: { value: number; tone?: "profit" | "loss" | "warning" | "gold"; className?: string }) {
  const clean = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-surface-panel", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all",
          tone === "profit" && "bg-profit",
          tone === "loss" && "bg-loss",
          tone === "warning" && "bg-warning",
          tone === "gold" && "bg-gradient-to-r from-gold via-gold-dim to-gold"
        )}
        style={{ width: `${clean}%` }}
      />
    </div>
  );
}

export function PanelHeader({ eyebrow, title, icon: Icon, badge }: { eyebrow: string; title: string; icon?: React.ComponentType<{ className?: string }>; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-subtle bg-surface-panel/50 px-5 py-4">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="h-4 w-4 text-gold" />}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
          <h3 className="mt-0.5 text-sm font-bold text-text-primary">{title}</h3>
        </div>
      </div>
      {badge}
    </div>
  );
}

export function Panel({ eyebrow, title, icon, badge, children, className }: {
  eyebrow: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border-subtle bg-surface-card", className)}>
      <PanelHeader eyebrow={eyebrow} title={title} icon={icon} badge={badge} />
      <div className="p-5">{children}</div>
    </div>
  );
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "N/A";
  if (ms < 1000) return "just now";
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h`;
  return `${Math.floor(ms / 86400000)}d`;
}

export function formatTime(ts: number | string | null | undefined): string {
  if (ts == null) return "Never";
  if (typeof ts === "string") {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatClock(ts: number | null | undefined): string {
  if (ts == null) return "N/A";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatPct(value: number): string {
  return `${value.toFixed(0)}%`;
}
