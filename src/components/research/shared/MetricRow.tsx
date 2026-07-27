interface MetricRowProps {
  label: string;
  value: string;
  detail?: string;
  tone?: "profit" | "loss" | "gold" | "neutral";
}

const toneClass: Record<string, string> = {
  profit: "text-profit",
  loss: "text-loss",
  gold: "text-gold",
  neutral: "text-text-secondary",
};

export function MetricRow({ label, value, detail, tone = "neutral" }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-medium ${toneClass[tone]}`}>{value}</span>
        {detail && <span className="ml-1.5 text-xs text-text-muted">{detail}</span>}
      </div>
    </div>
  );
}
