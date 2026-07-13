"use client";

import { useState } from "react";
import { AuthForm } from "@/components/AuthForm";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useAppData } from "@/context/AppDataContext";
import { cn } from "@/lib/format";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, authLoading, signOut, isCloudSync, dataError, metrics } = useAppData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          <p className="text-sm font-medium text-text-muted">Loading journal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="flex min-h-screen bg-surface-base text-text-primary">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onCloseMobile={() => setMobileOpen(false)}
        onSignOut={() => void signOut()}
        userName={user.name}
        userEmail={user.email}
        isCloudSync={isCloudSync}
      />

      <div className={cn("flex min-h-screen flex-1 flex-col transition-all duration-300", collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]")}>
        <TopBar
          onMenuClick={() => setMobileOpen(true)}
          metrics={{
            totalProfitLoss: metrics.totalProfitLoss,
            winRate: metrics.winRate,
            openTradesCount: metrics.openTradesCount,
            closedTradesCount: metrics.closedTradesCount,
            currentDrawdown: metrics.currentDrawdown
          }}
        />

        <main className="flex-1 px-4 py-6 lg:px-8">
          {dataError && (
            <div className="mb-4 rounded-lg border border-loss/20 bg-loss/5 px-4 py-3 text-sm text-loss animate-fade-in">
              {dataError}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
