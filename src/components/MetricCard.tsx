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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss",
          tone === "warning" && "text-warning",
          tone === "neutral" && "text-slate-950 dark:text-slate-50"
        )}
      >
        {value}
      </p>
      {helper ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p> : null}
    </div>
  );
}
