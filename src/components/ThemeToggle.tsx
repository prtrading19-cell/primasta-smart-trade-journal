"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem("primasta-theme");
    const prefersDark = stored ? stored === "dark" : true;
    setDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-panel text-text-secondary transition-all"
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
        disabled
      >
        <Moon className="h-4 w-4" />
      </button>
    );
  }

  function toggle() {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("primasta-theme", nextDark ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle bg-surface-panel text-text-secondary hover:bg-surface-hover hover:text-gold transition-all"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
