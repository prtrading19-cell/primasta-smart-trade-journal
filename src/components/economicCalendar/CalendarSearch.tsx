"use client"

import { Search, X } from "lucide-react"

interface CalendarSearchProps {
  value: string
  onChange: (value: string) => void
}

export default function CalendarSearch({ value, onChange }: CalendarSearchProps) {
  return (
    <div className="bg-surface-card border border-border-subtle rounded-xl p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by currency, event, or country..."
          className="w-full bg-surface-panel border border-border-subtle rounded-lg px-4 py-2.5 pl-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50 transition-all"
        />
        {value.length > 0 && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
