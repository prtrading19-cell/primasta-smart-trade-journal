"use client";

import { Activity, BrainCircuit, Layers, ShieldAlert, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { InstitutionalAnalytics, InstitutionalDashboardData } from "./types";
import { Panel, formatDuration } from "./primitives";
import { cn } from "@/lib/format";

const ACTION_COLORS: Record<string, string> = {
  "STRONG BUY": "#1fd38f",
  BUY: "#1fd38f",
  WAIT: "#f0c14b",
  HOLD: "#f0c14b",
  "STRONG SELL": "#f2696b",
  SELL: "#f2696b",
};

const BIAS_COLORS: Record<string, string> = {
  "Strong Bullish": "#1fd38f",
  Bullish: "#3aa876",
  Neutral: "#f0c14b",
  Bearish: "#c0535f",
  "Strong Bearish": "#f2696b",
};

const PIE_COLORS = ["#e6c268", "#1fd38f", "#f2696b", "#f0c14b", "#7b8ca4", "#5b6b80", "#3aa876", "#c0535f", "#9d8b5c", "#8a5cf6"];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-card px-3 py-2 text-xs shadow-card-hover">
      <p className="font-bold text-text-primary">{label ?? payload[0].name}</p>
      {payload.map((p, i) => (
        <p key={i} className="mt-0.5 text-text-secondary">{p.name}: <span className="font-bold text-text-primary">{p.value}</span></p>
      ))}
    </div>
  );
}

function MetricCard({ label, value, helper, accent }: { label: string; value: string; helper?: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-card p-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-text-muted">{label}</p>
      <p className={cn("mt-1.5 text-xl font-black", accent ?? "text-text-primary")}>{value}</p>
      {helper && <p className="mt-0.5 truncate text-[10px] text-text-muted">{helper}</p>}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-surface-panel/30">
      <p className="text-xs text-text-muted">{message}</p>
    </div>
  );
}

export function InstitutionalAnalyticsSection({ data }: { data: InstitutionalDashboardData }) {
  const a: InstitutionalAnalytics = data.analytics;
  const log = data.logStats;

  const decisionData = Object.entries(a.decisionDistribution).map(([name, value]) => ({ name, value }));
  const confidenceData = a.confidenceDistribution.map((c) => ({ name: c.range, value: c.count }));
  const riskData = Object.entries(a.riskDistribution).map(([name, value]) => ({ name, value }));
  const scenarioData = Object.entries(a.scenarioDistribution).map(([name, value]) => ({ name, value }));
  const biasData = a.overallBiasDistribution.map((b) => ({ name: b.bias, value: b.count, percentage: b.percentage }));
  const evidenceData = a.evidenceBreakdown.map((e) => ({ name: e.category, value: e.total }));
  const providerData = a.providerAnalytics.map((p) => ({ name: p.providerId, value: p.successRate }));
  const snapshotsByAssetData = Object.entries(a.snapshotsByAsset).map(([name, value]) => ({ name, value }));

  const healthyProviders = data.providers.filter((p) => p.status === "healthy").length;

  const summary = [
    { label: "Research Snapshots", value: `${a.totalSnapshots}`, helper: `${a.totalAssets} asset${a.totalAssets === 1 ? "" : "s"} tracked` },
    { label: "Avg Execution", value: formatDuration(a.averageExecutionDuration), helper: "per research run" },
    { label: "Avg Confidence", value: `${Math.round(a.averageConfidence)}%`, helper: "across snapshots" },
    { label: "Avg Risk", value: `${Math.round(a.averageRisk)}/100`, helper: "across snapshots" },
    { label: "Avg Conflict", value: `${Math.round(a.averageConflict)}%`, helper: "evidence discord" },
    { label: "Provider Health", value: `${healthyProviders}/${data.providers.length}`, helper: "healthy providers", accent: "text-profit" },
    { label: "Cache Hit Rate", value: `${log.cacheHitRate}%`, helper: "provider cache" },
    { label: "Log Success", value: `${Math.round(log.successRate)}%`, helper: `${log.totalLogs} total logs` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
        {summary.map((s) => <MetricCard key={s.label} {...s} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel eyebrow="Analytics" title="Research Decision Distribution" icon={BrainCircuit} className="lg:col-span-1">
          <div className="h-[200px]">
            {decisionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={decisionData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#2a303c" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#7b8ca4" }} tickLine={false} axisLine={{ stroke: "#2a303c" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#7b8ca4" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(230,194,104,0.06)" }} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {decisionData.map((d, i) => <Cell key={i} fill={ACTION_COLORS[d.name] ?? PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No decisions recorded yet." />}
          </div>
        </Panel>

        <Panel eyebrow="Analytics" title="Risk Distribution" icon={ShieldAlert}>
          <div className="h-[200px]">
            {riskData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#2a303c" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#7b8ca4" }} tickLine={false} axisLine={{ stroke: "#2a303c" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#7b8ca4" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(230,194,104,0.06)" }} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {riskData.map((d, i) => <Cell key={i} fill={d.name === "High" ? "#f2696b" : d.name === "Medium" ? "#f0c14b" : d.name === "Low" ? "#1fd38f" : "#7b8ca4"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No risk data recorded yet." />}
          </div>
        </Panel>

        <Panel eyebrow="Analytics" title="Evidence by Category" icon={Layers}>
          <div className="h-[200px]">
            {evidenceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evidenceData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#2a303c" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#7b8ca4" }} tickLine={false} axisLine={{ stroke: "#2a303c" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#7b8ca4" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(230,194,104,0.06)" }} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {evidenceData.map((d, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No evidence recorded yet." />}
          </div>
        </Panel>

        <Panel eyebrow="Analytics" title="Snapshot Volume by Asset" icon={Activity}>
          <div className="h-[200px]">
            {snapshotsByAssetData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshotsByAssetData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#2a303c" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#7b8ca4" }} tickLine={false} axisLine={{ stroke: "#2a303c" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#7b8ca4" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(230,194,104,0.06)" }} />
                  <Bar dataKey="value" fill="#e6c268" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No snapshots stored yet." />}
          </div>
        </Panel>

        <Panel eyebrow="Analytics" title="Bias Distribution" icon={Sparkles}>
          <div className="flex h-[200px] items-center">
            {biasData.length > 0 ? (
              <div className="grid w-full grid-cols-1 items-center gap-3 sm:grid-cols-2">
                <div className="h-[190px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={biasData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3} stroke="none">
                        {biasData.map((b, i) => <Cell key={i} fill={BIAS_COLORS[b.name] ?? PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {biasData.map((b) => (
                    <div key={b.name} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex items-center gap-1.5 text-text-secondary">
                        <span className="h-2 w-2 rounded-sm" style={{ background: BIAS_COLORS[b.name] ?? "#e6c268" }} />
                        {b.name}
                      </span>
                      <span className="font-bold text-text-primary">{b.percentage}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyChart message="No bias data recorded yet." />}
          </div>
        </Panel>

        <Panel eyebrow="Analytics" title="Provider Success Rate" icon={Activity}>
          <div className="h-[200px]">
            {providerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={providerData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#2a303c" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#7b8ca4" }} tickLine={false} axisLine={{ stroke: "#2a303c" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#7b8ca4" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(230,194,104,0.06)" }} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {providerData.map((d, i) => <Cell key={i} fill={d.value >= 70 ? "#1fd38f" : d.value >= 40 ? "#f0c14b" : "#f2696b"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart message="No provider analytics yet." />}
          </div>
        </Panel>
      </div>
    </div>
  );
}
