import { cn } from "@/lib/format";

export function MetricCard({
  label,
  value,
  helper,
  tone = "neutral"
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "neutral" | "profit" | "loss" | "warning";
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-card p-4 transition-all duration-300 hover:border-border hover:shadow-card-hover">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-black tracking-tight",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss",
          tone === "warning" && "text-warning",
          tone === "neutral" && "text-text-primary"
        )}
      >
        {value}
      </p>
      {helper ? <p className="mt-1 text-xs text-text-muted">{helper}</p> : null}
    </div>
  );
}
