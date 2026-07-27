interface SourceBadgeProps {
  source: string;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <span className="inline-flex items-center rounded bg-gold/10 px-1.5 py-0.5 text-[10px] font-medium text-gold">
      {source}
    </span>
  );
}
