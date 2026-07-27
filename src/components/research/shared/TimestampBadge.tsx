interface TimestampBadgeProps {
  timestamp: string;
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return ts;
  }
}

export function TimestampBadge({ timestamp }: TimestampBadgeProps) {
  return (
    <span className="text-[10px] text-text-muted">
      {formatTimestamp(timestamp)}
    </span>
  );
}
