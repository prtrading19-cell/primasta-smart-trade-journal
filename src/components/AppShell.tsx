"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Download, LayoutDashboard, ListChecks, LogOut, Menu, PlusCircle, Search, UserRound, X } from "lucide-react";
import { useState } from "react";
import { AuthForm } from "@/components/AuthForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppData } from "@/context/AppDataContext";
import { cn } from "@/lib/format";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new-trade", label: "New Trade", icon: PlusCircle },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/gold-research", label: "Gold Research", icon: Search },
  { href: "/summary", label: "Summary", icon: BarChart3 },
  { href: "/export", label: "Export", icon: Download },
  { href: "/plan", label: "Trading Plan", icon: ListChecks },
  { href: "/account", label: "Account", icon: UserRound }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, authLoading, signOut, isCloudSync, dataError } = useAppData();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500 dark:bg-slate-950 dark:text-slate-300">Loading journal...</div>;
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold tracking-wide">PRIMASTA JOURNAL</span>
          <ThemeToggle />
        </div>
      </header>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white p-4 transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">PRIMASTA</p>
            <h1 className="mt-1 text-lg font-bold leading-tight">SMART TRADE JOURNAL</h1>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="font-medium">{user.name || user.email}</p>
          <p className={cn("mt-1 text-xs", isCloudSync ? "text-green-600 dark:text-green-300" : "text-amber-700 dark:text-amber-300")}>
            {isCloudSync ? "Supabase cloud sync active" : "Demo mode: configure Supabase for cloud sync"}
          </p>
        </div>

        <nav className="mt-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4 space-y-3">
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {mobileOpen ? <button type="button" className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu overlay" /> : null}

      <main className="min-h-screen px-4 py-6 lg:ml-72 lg:px-8">
        {dataError ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{dataError}</div> : null}
        {children}
      </main>
    </div>
  );
}
