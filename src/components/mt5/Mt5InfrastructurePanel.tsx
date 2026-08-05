"use client";

import { useEffect, useState } from "react";
import { RadioTower, RefreshCw, Server, BookOpen } from "lucide-react";
import { PanelShell, ToneBadge } from "@/components/trading/primitives";
import type { Mt5AccountDescriptor, Mt5OrderBookSnapshot, Mt5VenueDescriptor } from "@/lib/mt5";

interface InfrastructureData {
  venues: Mt5VenueDescriptor[];
  accounts: Mt5AccountDescriptor[];
  orderBook: Mt5OrderBookSnapshot;
}

export function Mt5InfrastructurePanel() {
  const [data, setData] = useState<InfrastructureData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/mt5/infrastructure", { cache: "no-store" });
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed");
      setData({ venues: json.venues ?? [], accounts: json.accounts ?? [], orderBook: json.orderBook ?? null });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load infrastructure");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <PanelShell eyebrow="Infrastructure" title="Venues, Accounts & Order Book" icon={Server}>
      <div className="space-y-4">
        <p className="text-[11px] leading-5 text-text-muted">
          Execution venues, routed accounts, and depth-of-market wiring. FIX venue adapters are reserved but require
          broker FIX credentials to activate.
        </p>

        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Execution venues</p>
          <button onClick={() => void load()} className="flex items-center gap-1 rounded-lg bg-surface-panel px-2.5 py-1 text-[10px] font-bold text-text-muted hover:text-text-primary">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>

        {error && <p className="text-xs text-loss">{error}</p>}

        <div className="space-y-2">
          {(data?.venues ?? []).map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-panel/30 px-3 py-2">
              <div className="flex items-center gap-2.5">
                <RadioTower className="h-3.5 w-3.5 text-gold" />
                <div>
                  <p className="text-xs font-bold text-text-primary">{v.name}</p>
                  <p className="text-[10px] text-text-muted">{v.protocol} · {v.description}</p>
                </div>
              </div>
              <ToneBadge text={v.status} tone={v.status === "active" ? "profit" : v.status === "available" ? "neutral" : "warning"} />
            </div>
          ))}
          {data && data.venues.length === 0 && (
            <p className="rounded-lg border border-border-subtle bg-surface-panel/30 px-3 py-2 text-[11px] text-text-muted">No venues registered.</p>
          )}
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Routed accounts</p>
          <div className="space-y-2">
            {(data?.accounts ?? []).map((a) => (
              <div key={a.accountId} className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-panel/30 px-3 py-2">
                <div>
                  <p className="text-xs font-bold text-text-primary">{a.label}</p>
                  <p className="text-[10px] text-text-muted">account {a.accountId} · venue {a.venueId}</p>
                </div>
                {a.isActive && <ToneBadge text="active" tone="profit" />}
              </div>
            ))}
            {data && data.accounts.length === 0 && (
              <p className="rounded-lg border border-border-subtle bg-surface-panel/30 px-3 py-2 text-[11px] text-text-muted">No routed accounts.</p>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            <BookOpen className="h-3 w-3" /> Order book feed
          </p>
          <div className="rounded-lg border border-border-subtle bg-surface-panel/30 px-3 py-2">
            {data?.orderBook?.connected ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-text-primary">Live depth of market — {data.orderBook.symbol}</p>
                <p className="text-[10px] text-text-muted">
                  level 2 entries: {data.orderBook.level2.length} · heatmap cells: {data.orderBook.heatmap.length}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-text-muted">
                Not connected — DOM/L2/heatmap adapter is reserved. No simulated depth data is generated.
              </p>
            )}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
