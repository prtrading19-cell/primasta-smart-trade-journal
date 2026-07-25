interface CalendarEmptyStateProps {
  source: string;
  hasFilters: boolean;
}

export function CalendarEmptyState({ source, hasFilters }: CalendarEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 text-3xl text-text-muted">🔍</div>
        <p className="text-sm text-text-secondary">No events match your current filters.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h3 className="mb-2 text-lg font-semibold text-gold">Economic Calendar</h3>
      <p className="max-w-sm text-sm text-text-muted">
        Live calendar unavailable. Please reconnect the market data provider.
      </p>
      {source && (
        <p className="mt-2 text-xs text-text-muted">Source: {source}</p>
      )}
    </div>
  );
}
