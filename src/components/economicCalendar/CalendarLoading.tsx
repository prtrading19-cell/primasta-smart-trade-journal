export function CalendarLoading() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-border-subtle bg-surface-panel px-4 py-3"
        >
          <div className="h-4 w-16 animate-pulse rounded bg-surface-elevated" />
          <div className="h-4 w-12 animate-pulse rounded bg-surface-elevated" />
          <div className="h-4 w-48 animate-pulse rounded bg-surface-elevated" />
          <div className="h-4 w-16 animate-pulse rounded bg-surface-elevated" />
          <div className="ml-auto h-4 w-20 animate-pulse rounded bg-surface-elevated" />
        </div>
      ))}
    </div>
  );
}
