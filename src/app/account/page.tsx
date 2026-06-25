"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { SCREENSHOT_BUCKET } from "@/lib/storage";

export default function AccountPage() {
  const { user, isCloudSync, signOut } = useAppData();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Secure user account</p>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
      </header>

      <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{user?.name || "Trader"}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
            <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              {isCloudSync
                ? "Supabase authentication and cloud database sync are active. Row-level security keeps each trader's data private."
                : "Demo mode is active. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable real login, cloud sync, and private user data."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="focus-ring mt-6 inline-flex items-center gap-2 rounded-md border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </section>

      <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Supabase Cloud Storage</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {isCloudSync
            ? `Connected. Screenshot uploads use the private ${SCREENSHOT_BUCKET} bucket.`
            : "Not connected yet. Add your Supabase environment variables and run the SQL setup to enable cloud trade data and screenshot uploads."}
        </p>
        <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          <p className="font-semibold text-slate-800 dark:text-slate-100">Connection requirements</p>
          <p className="mt-2">1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.</p>
          <p>2. Run `supabase/schema.sql` in the Supabase SQL editor.</p>
          <p>3. Sign in, then use the screenshot upload buttons on New Trade or Close Trade.</p>
        </div>
      </section>
    </div>
  );
}
