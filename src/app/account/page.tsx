"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { SCREENSHOT_BUCKET } from "@/lib/storage";
import { Mt5AccountSettingsPanel } from "@/components/mt5";

export default function AccountPage() {
  const { user, isCloudSync, signOut } = useAppData();

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-card">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          <div className="p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">TradeOS Account</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Account</h1>
          </div>
        </div>
      </header>

      <section className="max-w-2xl rounded-xl border border-border-subtle bg-surface-card p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">{user?.name || "Trader"}</h2>
            <p className="text-sm text-text-muted">{user?.email}</p>
            <p className="mt-3 rounded-lg border border-border-subtle bg-surface-panel/40 px-3 py-2 text-sm text-text-secondary">
              {isCloudSync
                ? "Supabase authentication and cloud database sync are active. Row-level security keeps each trader's data private."
                : "Demo mode is active. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable real login, cloud sync, and private user data."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="focus-ring mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-surface-card px-5 py-3 text-sm font-bold text-text-secondary transition-all hover:border-loss hover:text-loss"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </section>

      <section className="max-w-2xl rounded-xl border border-border-subtle bg-surface-card p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Supabase Cloud Storage</p>
        <p className="mt-3 text-sm text-text-secondary">
          {isCloudSync
            ? `Connected. Screenshot uploads use the private ${SCREENSHOT_BUCKET} bucket.`
            : "Not connected yet. Add your Supabase environment variables and run the SQL setup to enable cloud trade data and screenshot uploads."}
        </p>
        <div className="mt-4 rounded-lg border border-border-subtle bg-surface-panel/40 p-4 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Connection requirements</p>
          <p className="mt-2">1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.</p>
          <p>2. Run `supabase/schema.sql` in the Supabase SQL editor.</p>
          <p>3. Sign in, then use the screenshot upload buttons on New Trade or Close Trade.</p>
        </div>
      </section>

      <section className="max-w-2xl">
        <Mt5AccountSettingsPanel />
      </section>
    </div>
  );
}
