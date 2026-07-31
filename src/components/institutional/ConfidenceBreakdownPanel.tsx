import { GaugeCircle } from "lucide-react";
import type { InstitutionalIntelligence } from "./types";
import { Panel, ProgressBar } from "./primitives";
import { cn } from "@/lib/format";

interface CategoryScore {
  category: string;
  score: number;
  count: number;
}

function computeCategoryScores(intelligence: InstitutionalIntelligence): CategoryScore[] {
  const order = ["Macro", "Technical", "Institutional", "Sentiment", "Fundamental"];
  const buckets = new Map<string, { total: number; count: number }>();
  for (const ev of intelligence.evidence) {
    const key = ev.category;
    const cur = buckets.get(key) ?? { total: 0, count: 0 };
    cur.total += ev.confidence;
    cur.count += 1;
    buckets.set(key, cur);
  }
  const scores: CategoryScore[] = [];
  for (const cat of order) {
    const b = buckets.get(cat);
    if (b) scores.push({ category: cat, score: Math.round(b.total / b.count), count: b.count });
  }
  for (const [cat, b] of buckets) {
    if (!order.includes(cat)) scores.push({ category: cat, score: Math.round(b.total / b.count), count: b.count });
  }
  return scores;
}

function Row({ label, value, tone }: { label: string; value: number; tone?: "profit" | "loss" | "warning" | "gold" }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-[11px] font-medium text-text-secondary">{label}</span>
      <ProgressBar value={value} tone={tone ?? "gold"} className="flex-1" />
      <span className="w-10 shrink-0 text-right text-xs font-bold text-text-primary">{value}%</span>
    </div>
  );
}

export function ConfidenceBreakdownPanel({ intelligence }: { intelligence: InstitutionalIntelligence }) {
  const conf = intelligence.confidence;
  const categoryScores = computeCategoryScores(intelligence);
  return (
    <Panel eyebrow="Confidence" title="Confidence Breakdown" icon={GaugeCircle}>
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-panel/40 p-4">
        <p className={cn(
          "text-3xl font-black",
          conf.score >= 70 && "text-profit",
          conf.score < 70 && conf.score >= 45 && "text-warning",
          conf.score < 45 && "text-loss"
        )}>{conf.score}%</p>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">Overall Confidence</p>
          <p className="text-sm font-bold text-text-primary">{conf.level}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Category Contribution</p>
        {categoryScores.map((c) => (
          <Row key={c.category} label={c.category} value={c.score} />
        ))}
      </div>

      <div className="mt-5 border-t border-border-subtle pt-4">
        <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Component Scores</p>
        <div className="space-y-2.5">
          <Row label="Freshness" value={conf.components.freshness} />
          <Row label="Provider Health" value={conf.components.providerHealth} />
          <Row label="Evidence Count" value={conf.components.evidenceCount} />
          <Row label="Agreement" value={conf.components.agreement} />
          <Row label="Completeness" value={conf.components.completeness} />
        </div>
      </div>
    </Panel>
  );
}
