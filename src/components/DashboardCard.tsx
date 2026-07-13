import { cn } from "@/lib/format";
import type { LucideIcon } from "lucide-react";

export function DashboardCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "neutral",
  className
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "profit" | "loss" | "warning" | "gold";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group rounded-xl border border-border-subtle bg-surface-card p-5 transition-all duration-300 hover:border-border hover:shadow-card-hover",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all",
              tone === "profit" && "border-profit/20 bg-profit/10 text-profit",
              tone === "loss" && "border-loss/20 bg-loss/10 text-loss",
              tone === "warning" && "border-warning/20 bg-warning/10 text-warning",
              tone === "gold" && "border-gold/20 bg-gold/10 text-gold",
              tone === "neutral" && "border-border-subtle bg-surface-panel text-text-muted group-hover:text-text-primary"
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-4 break-words text-2xl font-black tracking-tight",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss",
          tone === "warning" && "text-warning",
          tone === "gold" && "text-gold",
          tone === "neutral" && "text-text-primary"
        )}
      >
        {value}
      </p>
      {helper && <p className="mt-1.5 text-xs text-text-muted">{helper}</p>}
    </div>
  );
}

export function ChartContainer({
  title,
  eyebrow,
  children,
  action
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-card">
      <div className="flex items-center justify-between border-b border-border-subtle bg-surface-panel/50 px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
          <h2 className="mt-1 text-base font-bold text-text-primary">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function EmptyChartPlaceholder({ message = "No data available yet.", compact = false }: { message?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center justify-center rounded-lg border border-dashed border-border bg-surface-panel/30 text-center", compact ? "h-[220px]" : "h-[280px]")}>
      <div className="space-y-2">
        <p className="text-sm font-medium text-text-muted">{message}</p>
        <p className="text-xs text-text-muted/70">Chart will populate with trade data</p>
      </div>
    </div>
  );
}

export function SectionHeader({
  title,
  eyebrow,
  action
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>}
        <h2 className={cn("text-lg font-bold text-text-primary", eyebrow && "mt-1")}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function StatusDot({ active = true }: { active?: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-profit opacity-50" />}
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", active ? "bg-profit" : "bg-text-muted")} />
    </span>
  );
}
