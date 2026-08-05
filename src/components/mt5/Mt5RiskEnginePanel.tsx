"use client";

import { ShieldAlert } from "lucide-react";
import type { Mt5Position, Mt5RedactedConfig } from "@/lib/mt5/types";
import { PanelShell, Bar } from "@/components/trading/primitives";
import { cn } from "@/lib/format";

export function Mt5RiskEnginePanel({
  config,
  positions,
  dailyTrades,
}: {
  config: Mt5RedactedConfig | null;
  positions: Mt5Position[];
  dailyTrades: number;
}) {
  const safety = config?.safety;
  if (!safety) {
    return (
      <PanelShell eyebrow="Risk Engine" title="Safety Limits" icon={ShieldAlert}>
        <p className="text-xs text-text-muted">No safety configuration available.</p>
      </PanelShell>
    );
  }

  const grossLots = positions.reduce((s, p) => s + p.volume, 0);
  const grossPnl = positions.reduce((s, p) => s + p.profit + p.swap, 0);
  const maxDailyLoss = config?.safety?.maxDailyLossPercent ?? 0;

  return (
    <PanelShell
      eyebrow="Risk Engine"
      title="Safety & Exposure Limits"
      icon={ShieldAlert}
      badge={<span className="text-[10px] text-text-muted">{safety.emergencyKillSwitch ? "KILL SWITCH ON" : "armed"}</span>}
    >
      <div className="space-y-4">
        <div className={cn("rounded-lg border px-3 py-2 text-xs font-bold", safety.emergencyKillSwitch ? "border-loss/20 bg-loss/5 text-loss" : "border-profit/20 bg-profit/5 text-profit")}>
          {safety.emergencyKillSwitch ? "Emergency kill switch is ON — all orders blocked" : "Kill switch OFF — trading allowed"}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Limit label="Risk / trade" value={`${safety.maxRiskPerTradePercent}%`} />
          <Limit label="Max lots / order" value={String(safety.maxLotsPerOrder)} />
          <Limit label="Max daily trades" value={`${dailyTrades}/${safety.maxDailyTrades}`} />
          <Limit label="Max daily loss" value={`${safety.maxDailyLossPercent}%`} />
          <Limit label="Max drawdown" value={`${safety.maxDrawdownPercent}%`} />
          <Limit label="Min free margin" value={String(safety.minFreeMarginRequired)} />
        </div>

        {(safety.maxOpenTrades != null || safety.maxExposureLots != null) && (
          <div className="space-y-2">
            {safety.maxOpenTrades != null && (
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] text-text-muted">
                  <span>Open trades</span>
                  <span>{positions.length} / {safety.maxOpenTrades}</span>
                </div>
                <Bar value={(positions.length / Math.max(safety.maxOpenTrades, 1)) * 100} tone={positions.length >= safety.maxOpenTrades ? "loss" : "gold"} />
              </div>
            )}
            {safety.maxExposureLots != null && (
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] text-text-muted">
                  <span>Gross exposure</span>
                  <span>{grossLots.toFixed(2)} / {safety.maxExposureLots} lots</span>
                </div>
                <Bar value={(grossLots / Math.max(safety.maxExposureLots, 0.01)) * 100} tone={grossLots >= safety.maxExposureLots ? "loss" : "gold"} />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border-subtle bg-surface-panel/40 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Gross P/L (open)</p>
            <p className={cn("mt-0.5 text-sm font-black", grossPnl > 0 ? "text-profit" : grossPnl < 0 ? "text-loss" : "text-text-primary")}>
              {grossPnl > 0 ? "+" : ""}{grossPnl.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-panel/40 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Correlation limits</p>
            <p className="mt-0.5 text-xs font-bold text-text-primary">
              {safety.correlationLimits && Object.keys(safety.correlationLimits).length > 0
                ? Object.entries(safety.correlationLimits).map(([k, v]) => `${k}≤${v}`).join(" · ")
                : "none configured"}
            </p>
          </div>
        </div>

        <p className="text-[10px] leading-5 text-text-muted">
          Trading window {safety.tradingOpenHour}:00–{safety.tradingCloseHour}:00, days {safety.tradingDays.join(",")}. Values are enforced live at proposal creation and again immediately before transmission.
        </p>
      </div>
    </PanelShell>
  );
}

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-panel/40 px-2.5 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-text-primary">{value}</p>
    </div>
  );
}
