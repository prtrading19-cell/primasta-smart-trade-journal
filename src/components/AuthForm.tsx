"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { cn } from "@/lib/format";

export function AuthForm() {
  const { signIn, signUp, authError, isCloudSync } = useAppData();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(name, email, password);
        setMessage(isCloudSync ? "Account created. Check your inbox if email confirmation is enabled." : "Demo account ready.");
      }
    } catch {
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-base px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-card p-8 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 border border-gold/20">
            <ShieldCheck className="h-6 w-6 text-gold" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">Secure Journal</p>
            <h1 className="text-xl font-bold text-text-primary">PRIMASTA SMART TRADE JOURNAL</h1>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-surface-panel p-1">
          {(["login", "signup"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm font-semibold capitalize transition-all",
                mode === item ? "bg-gold text-surface-base shadow-sm" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {item === "login" ? "Login" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" ? (
            <label className="block text-sm font-medium text-text-secondary">
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface-panel px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
                placeholder="Your name"
              />
            </label>
          ) : null}

          <label className="block text-sm font-medium text-text-secondary">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface-panel px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-sm font-medium text-text-secondary">
            Password
            <input
              type="password"
              required={isCloudSync}
              minLength={isCloudSync ? 6 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface-panel px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
              placeholder="Minimum 6 characters"
            />
          </label>

          {authError && (
            <p className="rounded-xl border border-loss/20 bg-loss/5 px-4 py-3 text-sm text-loss">{authError}</p>
          )}
          {message && (
            <p className="rounded-xl border border-profit/20 bg-profit/5 px-4 py-3 text-sm text-profit">{message}</p>
          )}
          {!isCloudSync && (
            <p className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm text-gold">
              Demo mode active. Configure Supabase env vars for cloud sync and private accounts.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="focus-ring w-full rounded-xl bg-gold px-4 py-3.5 text-sm font-bold text-surface-base transition-all hover:bg-gold-dim disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
