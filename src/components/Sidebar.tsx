"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Search,
  Settings,
  Shield,
  TrendingUp,
  UserCircle,
  X,
  Zap
} from "lucide-react";
import { cn } from "@/lib/format";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
}

export const sidebarNavItems: SidebarNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
  { href: "/new-trade", label: "New Trade", icon: Zap, section: "Trading" },
  { href: "/trades", label: "Trades", icon: BarChart3, section: "Trading" },
  { href: "/journal", label: "Journal", icon: BookOpen, section: "Trading" },
  { href: "/gold-research", label: "Gold Research", icon: Search, section: "Research" },
  { href: "/economic-calendar", label: "Economic Calendar", icon: Calendar, section: "Research" },
  { href: "/calculator", label: "Calculator", icon: Calculator, section: "Tools" },
  { href: "/summary", label: "Analytics", icon: TrendingUp, section: "Performance" },
  { href: "/plan", label: "Trading Plan", icon: ListChecks, section: "Performance" },
  { href: "/export", label: "Export", icon: Download, section: "Tools" },
  { href: "/account", label: "Account", icon: UserCircle, section: "Settings" },
  { href: "#", label: "Settings", icon: Settings, section: "Settings" }
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onSignOut: () => void;
  userName?: string;
  userEmail: string;
  isCloudSync: boolean;
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  onSignOut,
  userName,
  userEmail,
  isCloudSync
}: SidebarProps) {
  const pathname = usePathname();

  const grouped = sidebarNavItems.reduce<Record<string, SidebarNavItem[]>>((acc, item) => {
    const section = item.section ?? "Other";
    acc[section] = acc[section] ? [...acc[section], item] : [item];
    return acc;
  }, {});

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || (href !== "#" && pathname.startsWith(href));
  }

  const sidebarWidth = collapsed ? "w-[72px]" : "w-[260px]";

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-label="Close menu overlay"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border-subtle bg-surface-card transition-all duration-300",
          sidebarWidth,
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className={cn("flex items-center border-b border-border-subtle px-4", collapsed ? "h-16 justify-center" : "h-16 justify-between")}>
          {!collapsed && (
            <Link href="/dashboard" onClick={onCloseMobile} className="block min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">PRIMASTA</p>
              <h1 className="mt-0.5 truncate text-sm font-bold text-text-primary">SMART TRADE JOURNAL</h1>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" onClick={onCloseMobile} className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10">
              <Shield className="h-5 w-5 text-gold" />
            </Link>
          )}
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!collapsed && (
          <div className="mx-3 mt-3 rounded-lg border border-border-subtle bg-surface-panel p-3">
            <p className="truncate text-sm font-medium text-text-primary">{userName || userEmail}</p>
            <p className={cn("mt-1 text-xs", isCloudSync ? "text-profit" : "text-gold")}>
              {isCloudSync ? "Cloud sync active" : "Demo mode"}
            </p>
          </div>
        )}

        <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section} className="mb-3">
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">{section}</p>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      collapsed && "justify-center px-2",
                      active
                        ? "bg-gold/10 text-gold"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-gold" : "text-text-muted group-hover:text-text-primary")} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-border-subtle p-3">
          <button
            type="button"
            onClick={() => void onSignOut()}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-all duration-200 hover:bg-loss/10 hover:text-loss",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-3 top-20 z-10 h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-card text-text-muted hover:bg-surface-hover hover:text-text-primary transition-all"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>
    </>
  );
}
