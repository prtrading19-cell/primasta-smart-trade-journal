import { cn } from "@/lib/format";
import { toneForAction, toneForHealth } from "@/components/institutional/primitives";

export function ToneBadge({ text, tone, className }: {
  text: string;
  tone: "profit" | "loss" | "warning" | "neutral";
  className?: string;
}) {
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
      {text}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "profit" | "loss" | "warning" | "neutral"> = {
    filled: "profit",
    healthy: "profit",
    built: "warning",
    sent: "warning",
    pending: "warning",
    degraded: "warning",
    rejected: "loss",
    failed: "loss",
    cancelled: "loss",
    down: "loss",
    validated: "neutral",
  };
  return <ToneBadge text={status} tone={map[status] ?? "neutral"} />;
}

export function SignalBadge({ type, direction }: { type: string; direction: string }) {
  let tone: "profit" | "loss" | "warning" | "neutral" = "neutral";
  if (direction === "buy") tone = "profit";
  if (direction === "sell") tone = "loss";
  if (type === "WAIT") tone = "warning";
  if (type === "CLOSE" || type === "REDUCE" || type === "SCALE OUT") tone = "warning";
  return <ToneBadge text={type} tone={tone} />;
}

export function Bar({ value, tone, className }: {
  value: number;
  tone?: "profit" | "loss" | "warning" | "gold";
  className?: string;
}) {
  const clean = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-surface-panel", className)}>
      <div
        className={cn(
          "h-full rounded-full",
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

export function Metric({ label, value, sub, tone }: {
  label: string;
  value: string;
  sub?: string;
  tone?: "profit" | "loss" | "warning" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-panel/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-lg font-black tracking-tight",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss",
          tone === "warning" && "text-warning",
          (!tone || tone === "neutral") && "text-text-primary"
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-text-muted">{sub}</p>}
    </div>
  );
}

export function PanelShell({ eyebrow, title, icon: Icon, badge, children, className }: {
  eyebrow: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 overflow-hidden rounded-xl border border-border-subtle bg-surface-card", className)}>
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
      <div className="min-w-0 p-5">{children}</div>
    </div>
  );
}

export function RiskLevelTone(risk: string): "profit" | "loss" | "warning" | "neutral" {
  if (risk === "Low") return "profit";
  if (risk === "Medium") return "warning";
  return "loss";
}

export { toneForAction, toneForHealth };
