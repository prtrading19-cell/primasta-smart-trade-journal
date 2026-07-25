"use client";

import { Bell, Clock, Menu, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn, money, percent } from "@/lib/format";

interface TopBarProps {
  onMenuClick: () => void;
  metrics: {
    totalProfitLoss: number;
    winRate: number;
    openTradesCount: number;
    closedTradesCount: number;
    currentDrawdown: number;
  };
}

export function TopBar({ onMenuClick, metrics }: TopBarProps) {
  const [dark, setDark] = useState(true);
  const [time, setTime] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem("primasta-theme");
    const prefersDark = stored ? stored === "dark" : true;
    setDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  useEffect(() => {
    function tick() {
      setTime(
        new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        }).format(new Date())
      );
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("primasta-theme", next ? "dark" : "light");
  }

  const equity = metrics.totalProfitLoss;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border-subtle bg-surface-card/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle bg-surface-panel text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="hidden items-center gap-6 px-6 lg:flex">
        <MetricPill label="Balance" value={money(equity)} positive={equity >= 0} />
        <div className="h-6 w-px bg-border-subtle" />
        <MetricPill label="Today P/L" value={money(metrics.totalProfitLoss)} positive={metrics.totalProfitLoss >= 0} />
        <div className="h-6 w-px bg-border-subtle" />
        <MetricPill label="Win Rate" value={percent(metrics.winRate)} positive={metrics.winRate >= 50} />
        <div className="h-6 w-px bg-border-subtle" />
        <MetricPill label="Open" value={String(metrics.openTradesCount)} />
      </div>

      <div className="ml-auto flex items-center gap-2 px-4">
        <div className="hidden items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-panel px-3 py-1.5 text-xs font-medium text-text-muted sm:flex">
          <Clock className="h-3 w-3 text-gold" />
          <span className="font-mono text-text-secondary">{time}</span>
        </div>

        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-panel text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-gold text-[8px] font-bold text-surface-base" />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-panel text-text-secondary hover:bg-surface-hover hover:text-gold transition-all"
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}

function MetricPill({
  label,
  value,
  positive
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</span>
      <span
        className={cn(
          "text-sm font-bold",
          positive === true && "text-profit",
          positive === false && "text-loss",
          positive === undefined && "text-text-primary"
        )}
      >
        {value}
      </span>
    </div>
  );
}
