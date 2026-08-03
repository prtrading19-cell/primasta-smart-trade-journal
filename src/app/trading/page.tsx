import Link from "next/link";
import { ArrowUpRight, Radar } from "lucide-react";
import { TradeExecutionDashboard } from "@/components/trading";

export const dynamic = "force-dynamic";

export default function TradingPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">Research Command Center</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
                  Trade Execution
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
                  Signal-to-order execution layer — trade signals from portfolio intelligence, validation, risk control, position sizing, order drafting, and a paper execution pipeline with full trail.
                </p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10">
                <Radar className="h-7 w-7 text-gold" />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-card px-4 py-2.5 text-sm font-bold text-text-secondary transition-all hover:border-gold hover:text-gold"
              >
                Portfolio Intelligence
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/institutional"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-card px-4 py-2.5 text-sm font-bold text-text-secondary transition-all hover:border-gold hover:text-gold"
              >
                Institutional Intelligence
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <TradeExecutionDashboard />
    </div>
  );
}
